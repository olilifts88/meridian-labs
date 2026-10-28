import copy
import http.client
import json
import threading
import unittest

from workflow_portfolio.call_crm import evaluate, load_fixture, simulate
from workflow_portfolio.showcase_server import make_server


class CallCRMTests(unittest.TestCase):
    def test_journey_stage_priority_and_commercial_hold(self):
        first, repeated, full = simulate(through=1), simulate(through=3), simulate()
        self.assertEqual(first['deals'][0]['stage'], 'Pilot')
        self.assertEqual(first['issues'][0]['priority'], 'Medium')
        self.assertEqual(repeated['issues'][0]['distinct_accounts'], 2)
        self.assertEqual(repeated['issues'][0]['unique_calls'], 3)
        self.assertEqual(repeated['issues'][0]['priority'], 'Medium')
        self.assertEqual(full['issues'][0]['priority'], 'High')
        self.assertEqual(full['deals'][2]['annual_value_gbp'], 24000)
        self.assertEqual(len([a for a in full['actions'] if a['state'] == 'pending']), 2)
        self.assertEqual(full['evaluation']['status'], 'passed')

    def test_duplicate_call_is_a_noop_and_conflicting_copy_is_rejected(self):
        f = load_fixture()
        f['calls'].append(copy.deepcopy(f['calls'][0]))
        result = simulate(f, through=5)
        self.assertEqual(result['issues'][0]['unique_calls'], 4)
        self.assertEqual(len(result['actions']), 3)
        f['calls'][-1]['transcript'] += ' Altered copy.'
        with self.assertRaisesRegex(ValueError, 'Conflicting'):
            simulate(f, through=5)

    def test_correlated_mentions_do_not_replace_distinct_accounts(self):
        f = load_fixture()
        f['calls'][3]['account'] = 'a1'
        f['calls'][3]['facts'] = f['calls'][3]['facts'][:1]
        self.assertEqual(simulate(f)['issues'][0]['priority'], 'Medium')

    def test_old_evidence_does_not_satisfy_rolling_window(self):
        f = load_fixture()
        f['calls'][0]['date'] = '2026-10-01T09:00:00+00:00'
        f['calls'][2]['date'] = '2026-10-02T09:00:00+00:00'
        self.assertEqual(simulate(f)['issues'][0]['priority'], 'Medium')

    def test_forged_extraction_and_future_call_are_held(self):
        f = load_fixture()
        f['calls'][0]['facts'][0]['quote'] = 'The buyer agreed.'
        self.assertEqual(simulate(f)['deals'][0]['stage'], 'Qualified')
        f['calls'][3]['date'] = '2026-11-01T13:00:00+00:00'
        result = simulate(f)
        self.assertEqual(result['issues'][0]['priority'], 'Medium')
        self.assertEqual(len(result['calls']), 3)

    def test_bulk_approval_and_replay_are_stable(self):
        pending = [a for a in simulate()['actions'] if a['state'] == 'pending']
        decisions = [dict(id=a['id'], revision=a['revision'], verdict='approve') for a in pending]
        approved = simulate(decisions=decisions)
        self.assertEqual(approved['deals'][2]['annual_value_gbp'], 32000)
        self.assertIn('uncommitted', approved['deals'][2]['delivery_note'])
        self.assertEqual(approved, simulate(decisions=decisions))
        self.assertEqual(approved['evaluation']['status'], 'passed')

    def test_selective_review_preserves_rejection_reason(self):
        pending = [a for a in simulate()['actions'] if a['state'] == 'pending']
        decision = dict(id=pending[0]['id'], revision=pending[0]['revision'],
                        verdict='reject', reason='Insufficient evidence: confirm procurement approval')
        result = simulate(decisions=[decision])
        self.assertEqual(result['actions'][1]['state'], 'rejected')
        self.assertIn('procurement', result['actions'][1]['feedback'])
        self.assertEqual(result['actions'][2]['state'], 'pending')
        self.assertEqual(result['deals'][2]['annual_value_gbp'], 24000)

    def test_stale_duplicate_automatic_and_reasonless_reviews_are_rejected(self):
        action = simulate()['actions'][1]
        valid = dict(id=action['id'], revision=action['revision'], verdict='approve')
        for decisions in ([dict(valid, revision='old')], [valid, valid],
                          [dict(valid, id='c1:stage')], [dict(valid, verdict='reject')]):
            with self.subTest(decisions=decisions), self.assertRaises(ValueError):
                simulate(decisions=decisions)
        f = load_fixture()
        f['deals'][2]['revision'] = 2
        with self.assertRaisesRegex(ValueError, 'Stale'):
            simulate(f, decisions=[valid])

    def test_evaluator_detects_corrupted_outputs(self):
        f = load_fixture()
        def corrupt_quote(r):
            r['actions'][0]['quote'] = 'Invented customer decision'
        def corrupt_value(r):
            r['deals'][2]['annual_value_gbp'] = 32000
        def missing_signal(r):
            r['issues'] = []
        def forged_priority(r):
            r['issues'][0]['priority'] = 'Urgent'
        def forged_account(r):
            r['issues'][0]['evidence'][0]['account'] = 'a3'
        def fake_delivery(r):
            r['execution']['external_writes'] = True
        def unsupported_amount(r):
            r['actions'][1]['after'] = 99999
        for corrupt in (corrupt_quote, corrupt_value, missing_signal, forged_priority,
                        forged_account, fake_delivery, unsupported_amount):
            result = simulate()
            corrupt(result)
            with self.subTest(probe=corrupt.__name__):
                self.assertEqual(evaluate(result, f)['status'], 'failed')

    def test_loopback_api_and_existing_workflow_surface(self):
        with make_server(0) as server:
            thread = threading.Thread(target=server.serve_forever, daemon=True)
            thread.start()
            try:
                connection = http.client.HTTPConnection('127.0.0.1', server.server_port)
                connection.request('GET', '/calls')
                response = connection.getresponse()
                self.assertEqual(response.status, 200)
                self.assertIn(b'Linear mock', response.read())
                connection.request('POST', '/api/calls', json.dumps({'through': 4}), {'Content-Type': 'application/json'})
                response = connection.getresponse()
                self.assertEqual(response.status, 200)
                self.assertEqual(json.loads(response.read())['evaluation']['status'], 'passed')
                connection.request('POST', '/api/calls', json.dumps({'through': 99}), {'Content-Type': 'application/json'})
                response = connection.getresponse()
                self.assertEqual(response.status, 400)
                response.read()
                connection.request('POST', '/api/calls', '{}', {'Content-Type': 'application/json', 'Origin': 'https://untrusted.example'})
                response = connection.getresponse()
                self.assertEqual(response.status, 403)
                response.read()
            finally:
                server.shutdown()
                thread.join()


if __name__ == '__main__':
    unittest.main()
