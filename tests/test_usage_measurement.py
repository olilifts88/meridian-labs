"""Deterministic fixture checks; no model calls or access to live source state."""
import json
import subprocess
from workflow_portfolio.usage.jsonl_reader import node_binary
import sqlite3
import tempfile
import unittest
from pathlib import Path
from workflow_portfolio.usage.measure_run import measure


class MeasurementTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.source = Path(self.temp.name)
        self.log = self.source / 'fixture.jsonl'
        self.base = {'run_id': 'run-1', 'environment': 'local-codex', 'thread_id': 'thread-1', 'response_ids': ['response-1', 'response-2']}
        db = sqlite3.connect(self.source / 'state_5.sqlite')
        db.execute('CREATE TABLE threads (id TEXT, rollout_path TEXT)')
        db.execute('INSERT INTO threads VALUES (?,?)', ('thread-1', str(self.log)))
        db.commit()
        db.close()
        self.first = {'type': 'token_usage_record', 'payload': {'thread_id': 'thread-1', 'session_id': 'session-1', 'turn_id': 'turn-1', 'response_id': 'response-1',
                      'usage': {'input_tokens': 100, 'cached_input_tokens': 60, 'cache_write_input_tokens': 0, 'output_tokens': 20, 'reasoning_output_tokens': 5, 'total_tokens': 120}}}
        self.second = json.loads(json.dumps(self.first))
        self.second['payload']['response_id'] = 'response-2'
        self.write([self.first, self.first, self.second])

    def tearDown(self):
        self.temp.cleanup()

    def write(self, records):
        self.log.write_text('\n'.join(json.dumps(x) for x in records) + '\n')

    def test_dedup_and_subsets(self):
        before = (self.source / 'state_5.sqlite').read_bytes()
        result = measure(self.base, self.source)
        self.assertEqual(result['measurement_status'], 'measured')
        self.assertEqual(result['usage']['total_tokens'], 240)
        self.assertEqual(result['usage']['cached_input_tokens'], 120)
        self.assertEqual(result['usage']['reasoning_output_tokens'], 10)
        self.assertEqual(result['duplicate_usage_records_skipped'], 1)
        self.assertEqual(before, (self.source / 'state_5.sqlite').read_bytes())

    def test_cloud_null(self):
        result = measure({**self.base, 'environment': 'chatgpt-cloud'}, self.source)
        self.assertEqual(result['measurement_status'], 'unavailable')
        self.assertTrue(all(v is None for v in result['usage'].values()))

    def test_ambiguous_turn(self):
        manifest = {k: v for k, v in self.base.items() if k != 'response_ids'}
        manifest['turn_ids'] = ['turn-1']
        self.assertEqual(measure(manifest, self.source)['measurement_status'], 'unavailable')
        manifest['turn_ids_unique_to_run'] = True
        self.assertEqual(measure(manifest, self.source)['usage']['total_tokens'], 240)

    def test_missing_record(self):
        self.assertEqual(measure({**self.base, 'response_ids': ['missing']}, self.source)['measurement_status'], 'unavailable')

    def test_conflicting_duplicate(self):
        changed = json.loads(json.dumps(self.first))
        changed['payload']['usage']['total_tokens'] = 999
        self.write([self.first, changed])
        self.assertEqual(measure(self.base, self.source)['measurement_status'], 'unavailable')

    def test_invalid_category(self):
        self.first['payload']['usage']['cached_input_tokens'] = 101
        self.write([self.first, self.second])
        self.assertEqual(measure(self.base, self.source)['measurement_status'], 'unavailable')

    def test_action_tokens_not_invented(self):
        action = {'type': 'event_msg', 'payload': {'type': 'item_completed', 'turn_id': 'turn-1', 'item': {'id': 'call-1', 'type': 'McpToolCall', 'server': 'example', 'tool': 'read'}}}
        self.write([self.first, self.second, action, action])
        result = measure(self.base, self.source)
        self.assertEqual(result['actions'], [{'name': 'example.read', 'count': 1, 'tokens': None}])

    def test_missing_source(self):
        self.assertEqual(measure(self.base, self.source / 'missing')['measurement_status'], 'unavailable')

    def test_configured_model_is_not_execution_proof(self):
        context = {'type': 'turn_context', 'payload': {'turn_id': 'turn-1', 'model': 'example-model', 'effort': 'medium'}}
        self.write([context, self.first, self.second])
        result = measure(self.base, self.source)
        self.assertEqual(result['recorded_turn_models'], ['example-model'])
        self.assertEqual(result['actual_models'], [])


class WholeTaskTests(MeasurementTests):
    def task(self):
        return {'schema_version': 2, 'run_id': 'fixture-task-v2', 'environment': 'local-codex', 'scope': 'task',
                'task_inventory': {'all_executions_listed': True, 'required_roles': ['coordinator','worker','retry'],
                                   'evidence_ref': 'fixture://task-dispatch-and-completion'},
                'executions': [
                   {'binding_id':'coord','role':'coordinator','attempt':1,'thread_id':'thread-1',
                    'response_ids':['response-1','response-2'],'turn_ids':['turn-1'],
                    'turn_ids_unique_to_run':True,'evidence_ref':'fixture://coord-closed-turn'},
                   {'binding_id':'worker','role':'worker','attempt':1,'thread_id':'thread-worker',
                    'response_ids':['worker-response'],'turn_ids':['worker-turn'],
                    'turn_ids_unique_to_run':True,'evidence_ref':'fixture://worker-closed-turn'},
                   {'binding_id':'retry','role':'retry','attempt':2,'thread_id':'thread-retry',
                    'response_ids':['retry-response'],'turn_ids':['retry-turn'],
                    'turn_ids_unique_to_run':True,'evidence_ref':'fixture://retry-closed-turn'}]}

    def setUp(self):
        super().setUp()
        db=sqlite3.connect(self.source/'state_5.sqlite')
        for role in ['worker','retry']:
            path=self.source/(role+'.jsonl')
            record=json.loads(json.dumps(self.first))
            record['payload'].update(thread_id='thread-'+role,session_id='session-'+role,
                                     turn_id=role+'-turn',response_id=role+'-response')
            path.write_text(json.dumps(record)+'\n')
            db.execute('INSERT INTO threads VALUES (?,?)',('thread-'+role,str(path)))
        db.commit();db.close()

    def test_task_has_all_roles_and_no_double_subsets(self):
        r=measure(self.task(),self.source)
        self.assertEqual(r['usage_coverage'],'Complete')
        self.assertEqual(r['task_usage']['total_tokens'],480)
        self.assertEqual(r['task_usage']['cached_input_tokens'],240)
        self.assertEqual(len(r['response_records']),4)
        self.assertIsNone(r['cost'])

    def test_compressed_sibling_matches_plain(self):
        expected=measure(self.task(),self.source)
        subprocess.run([node_binary(),'-e',"const f=require('node:fs'),z=require('node:zlib');f.writeFileSync(process.argv[2],z.zstdCompressSync(f.readFileSync(process.argv[1])))",str(self.log),str(self.log)+'.zst'],check=True)
        self.log.unlink()
        actual=measure(self.task(),self.source)
        for key in ['usage_coverage','task_usage','measured_subtotal','response_records']:
            self.assertEqual(expected[key],actual[key])

    def test_missing_worker_retains_partial_subtotal(self):
        (self.source/'worker.jsonl').unlink()
        r=measure(self.task(),self.source)
        self.assertEqual(r['usage_coverage'],'Partial')
        self.assertEqual(r['measured_subtotal']['total_tokens'],360)
        self.assertIsNone(r['task_usage']['total_tokens'])
        self.assertIn('worker:',r['availability_reason'])

    def test_missing_requested_response_is_partial(self):
        task=self.task();task['executions'][0]['response_ids'].append('missing-response')
        r=measure(task,self.source)
        self.assertEqual(r['usage_coverage'],'Partial')
        self.assertEqual(r['measured_subtotal']['total_tokens'],480)

    def test_hidden_response_blocks_complete(self):
        task=self.task();task['executions'][0]['response_ids']=['response-1']
        r=measure(task,self.source)
        self.assertEqual(r['usage_coverage'],'Partial')
        self.assertEqual(r['measured_subtotal']['total_tokens'],360)

    def test_duplicate_binding_does_not_inflate(self):
        task=self.task();extra=dict(task['executions'][0]);extra['binding_id']='overlap';task['executions'].append(extra)
        r=measure(task,self.source)
        self.assertEqual(r['measured_subtotal']['total_tokens'],480)
        self.assertEqual(r['usage_coverage'],'Partial')

    def test_corrupt_zstd_is_explicit(self):
        self.log.unlink();Path(str(self.log)+'.zst').write_bytes(b'not zstd')
        r=measure(self.task(),self.source)
        self.assertEqual(r['usage_coverage'],'Partial')
        self.assertIn('Compressed log could not be read',r['availability_reason'])
        self.assertIsNone(r['task_usage']['total_tokens'])

    def test_malformed_json_blocks_complete(self):
        with self.log.open('a') as f:f.write('bad JSON\n')
        self.assertEqual(measure(self.task(),self.source)['usage_coverage'],'Partial')

    def test_cumulative_events_ignored(self):
        with self.log.open('a') as f:f.write(json.dumps({'type':'event_msg','payload':{'type':'token_count','info':{'total_token_usage':{'total_tokens':999999}}}})+'\n')
        self.assertEqual(measure(self.task(),self.source)['task_usage']['total_tokens'],480)

    def test_inventory_attestation_required(self):
        task=self.task();del task['task_inventory']['evidence_ref']
        self.assertEqual(measure(task,self.source)['usage_coverage'],'Partial')


if __name__ == '__main__':
    unittest.main()
