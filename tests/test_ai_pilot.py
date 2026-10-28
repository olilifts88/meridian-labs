import copy
import json
import os
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from workflow_portfolio import ai_pilot as p
from workflow_portfolio.routing.router import select_route
from workflow_portfolio.showcase_server import make_server


def reference(case):
    flow=case['workflow']; base=case['baseline']
    if flow=='release-notes':return {'body':base['draft']['body']}
    if flow=='call-crm':return {'facts':case['fixture']['calls'][0]['facts']}
    return {key:base[key] for key in p.SCHEMAS[flow]}


class PilotTests(unittest.TestCase):
    def setUp(self):
        self.temp=tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.directory=Path(self.temp.name)/'pilot'
        self.bundle=p.initialize(self.directory)
        self.calls=[]

    def dispatch(self,request,policy,capabilities,receipt):
        selected=select_route(request,policy,capabilities)
        case=self.bundle['cases'][len(self.calls)//4]
        self.calls.append(request)
        report={'status':'completed','auth':'chatgpt_subscription','answer':json.dumps(reference(case)),
                'binding':p.digest({'request':request,'policy':selected.policy_digest}),
                'usage':{'input_tokens':100,'cached_input_tokens':20,'output_tokens':40},'actual_model':None}
        p.atomic(receipt,report)
        return report

    def test_plan_and_report_never_generate(self):
        r=p.run_experiment(self.directory,dispatch=lambda *a: self.fail('Unexpected call'))
        self.assertEqual((r['planned_answers'],r['attempted'],r['new_model_calls']),(40,0,0))
        self.assertEqual(len(r['cases']),10)

    def test_four_matched_setups_and_no_answer_leak(self):
        for case in self.bundle['cases']:
            for config in self.bundle['configurations']:
                text=p.prompt(case,config,self.bundle)
                self.assertNotIn('reference_output',text)
                self.assertNotIn('"baseline"',text)
                self.assertNotIn('"facts":',text.split('Evidence:\n',1)[1])
                self.assertIn('Workflow method:',text) if config['style']=='guided' else self.assertNotIn('Workflow method:',text)
        self.assertEqual({c['effort'] for c in self.bundle['configurations']},{'medium'})

    def test_reuses_all_five_domain_checks(self):
        for case in self.bundle['cases']:
            with self.subTest(case=case['id']):
                value=p.assessment(case,json.dumps(reference(case)))
                self.assertEqual(value['outcome'],'Pass',value)
                self.assertIsNone(value['human_verdict'])

    def test_full_run_counts_failures_and_replay_has_no_calls(self):
        r=p.run_experiment(self.directory,True,40,self.dispatch)
        self.assertEqual(len(self.calls),40)
        self.assertEqual(r['status'],'complete')
        for config in r['configurations']:
            self.assertEqual((config['checks_passed'],config['attempted']),(10,10))
            self.assertEqual(config['measured_tokens'],1400)
            self.assertEqual(config['tokens_per_check_success'],140)
            self.assertIsNone(config['cost_per_success'])
            self.assertEqual(config['human_reviewed'],0)
        p.run_experiment(self.directory,True,40,lambda *a:self.fail('Duplicate generation'))
        self.assertEqual(len(self.calls),40)

    def test_persistent_small_limit_does_not_replenish_on_restart(self):
        r=p.run_experiment(self.directory,True,2,self.dispatch)
        self.assertEqual(r['attempted'],2)
        p.run_experiment(self.directory,True,2,lambda *a:self.fail('Limit replenished'))
        with self.assertRaises(ValueError):p.run_experiment(self.directory,True,41,self.dispatch)

    def test_execution_failure_is_durable_and_stops_batch(self):
        def fail(*args):raise TimeoutError('uncertain')
        r=p.run_experiment(self.directory,True,40,fail)
        self.assertEqual(r['attempted'],1)
        self.assertEqual(r['answers'][0]['status'],'failed_or_uncertain_no_retry')
        self.assertEqual(r['configurations'][0]['token_coverage'],'0/1')
        self.assertIsNone(r['configurations'][0]['tokens_per_check_success'])

    def test_bad_answer_is_a_failed_case_not_missing_attempt(self):
        case=self.bundle['cases'][0]
        result=p.assessment(case,'not JSON')
        self.assertEqual(result['outcome'],'Needs improvement')
        self.assertTrue(result['error'])

    def test_missed_crm_signal_and_forged_quote_fail(self):
        case=self.bundle['cases'][-2]
        value=reference(case)
        value['facts']=value['facts'][:1]
        self.assertEqual(p.assessment(case,json.dumps(value))['outcome'],'Needs improvement')
        value=copy.deepcopy(reference(case));value['facts'][0]['quote']='I approve imaginary terms'
        self.assertEqual(p.assessment(case,json.dumps(value))['outcome'],'Needs improvement')

    def test_incomplete_scan_cannot_excuse_missing_findings(self):
        case=self.bundle['cases'][2];value=reference(case)
        value.update(complete=False,checked_packages=0,findings=[])
        result=p.assessment(case,json.dumps(value))
        self.assertEqual(result['outcome'],'Needs improvement')
        self.assertIn({'criterion':'expected_scan_coverage','verdict':'Needs improvement'},result['criteria'])

    def test_modified_dataset_or_answer_receipt_rejected(self):
        p.run_experiment(self.directory,True,1,self.dispatch)
        row_path=next(self.directory.glob('*--*.json'));row=p.load_json(row_path)
        row['answer']='{}';p.atomic(row_path,row)
        with self.assertRaises(ValueError):p.report(self.directory)
        changed=copy.deepcopy(self.bundle);changed['cases'][0]['title']='changed'
        with self.assertRaises(ValueError):p.verify(changed)

    def test_missing_tokens_and_cached_subset(self):
        self.assertEqual(p.token_count({'input_tokens':100,'cached_input_tokens':80,'output_tokens':10}),110)
        for value in (None,{}, {'input_tokens':True,'cached_input_tokens':0,'output_tokens':1},
                      {'input_tokens':1,'cached_input_tokens':2,'output_tokens':1}):
            self.assertIsNone(p.token_count(value))

    def test_human_review_reuses_revision_feedback_module(self):
        p.run_experiment(self.directory,True,1,self.dispatch)
        r=p.report(self.directory);row=r['answers'][0]
        feedback={'id':'human-1','revision':r['review_revision'],'decisions':[
            {'case_id':row['id'],'kind':'label','label':'Pass','statement':'Correct and useful'}]}
        self.assertEqual(p.review(self.directory,feedback)['status'],'Recorded')
        self.assertEqual(p.review(self.directory,feedback)['status'],'Already recorded')
        r=p.report(self.directory)
        self.assertEqual(r['configurations'][0]['human_reviewed'],1)
        self.assertEqual(r['agreement']['agreed'],1)
        feedback['revision']='stale'
        with self.assertRaises(ValueError):p.review(self.directory,feedback)

    def test_server_get_cannot_start_calls_and_review_is_local(self):
        import threading
        import urllib.request
        server=make_server(0,pilot_directory=self.directory)
        t=threading.Thread(target=server.serve_forever,daemon=True);t.start()
        try:
            url='http://127.0.0.1:'+str(server.server_port)
            with urllib.request.urlopen(url+'/api/pilot') as response:
                self.assertEqual(json.load(response)['attempted'],0)
            with urllib.request.urlopen(url+'/evaluation') as response:
                html=response.read().decode()
                self.assertIn('Real AI testing',html)
                self.assertNotIn('Run live pilot',html)
            with urllib.request.urlopen(url+'/evaluation/review') as response:
                self.assertIn('Originally flagged first',response.read().decode())
            req=urllib.request.Request(url+'/api/pilot/review',data=b'{}',headers={'Content-Type':'application/json','Origin':'https://other.example'})
            with self.assertRaises(urllib.error.HTTPError) as error:urllib.request.urlopen(req)
            self.assertEqual(error.exception.code,403)
        finally:
            server.shutdown();server.server_close();t.join()

    def test_recheck_accepts_unused_crm_fields_but_not_lost_or_changed_facts(self):
        case=self.bundle['cases'][-2]
        value=copy.deepcopy(reference(case))
        value['facts'][0]['topic']=''
        value['facts'][1].update(deal='d1',value='')
        self.assertEqual(p.assessment(case,json.dumps(value))['outcome'],'Needs improvement')
        self.assertEqual(p.assessment(case,json.dumps(value),p.RECHECK_RUBRIC)['outcome'],'Pass')
        for change in ('missing','wrong_value','wrong_topic','forged_quote'):
            bad=copy.deepcopy(value)
            if change=='missing':bad['facts'].pop()
            elif change=='wrong_value':bad['facts'][0]['value']='Closed Won'
            elif change=='wrong_topic':bad['facts'][1]['topic']='imaginary-issue'
            else:bad['facts'][0]['quote']='We signed imaginary terms'
            self.assertEqual(p.assessment(case,json.dumps(bad),p.RECHECK_RUBRIC)['outcome'],'Needs improvement',change)
        tentative=self.bundle['cases'][-1]
        self.assertEqual(p.assessment(tentative,'{"facts":[]}',p.RECHECK_RUBRIC)['outcome'],'Needs improvement')

    def test_recheck_allows_evidence_annotations_but_keeps_source_and_stale_gates(self):
        case=next(c for c in self.bundle['cases'] if c['id']=='soc2:2')
        value=copy.deepcopy(reference(case));value['controls'][0]['evidence'][0].update(stale=True,review_age_days=112)
        self.assertEqual(p.assessment(case,json.dumps(value))['outcome'],'Needs improvement')
        self.assertEqual(p.assessment(case,json.dumps(value),p.RECHECK_RUBRIC)['outcome'],'Pass')
        for change in ('missing_source','changed_date','wrong_owner','ready_despite_stale'):
            bad=copy.deepcopy(value);control=bad['controls'][0]
            if change=='missing_source':del control['evidence'][0]['source_id']
            elif change=='changed_date':control['evidence'][0]['reviewed_on']='2026-10-26'
            elif change=='wrong_owner':control['owner']='Someone else'
            else:
                control.update(status='ready_for_reviewer',follow_ups=[])
                bad.update(ready_for_reviewer=1,controls_needing_follow_up=0)
            self.assertEqual(p.assessment(case,json.dumps(bad),p.RECHECK_RUBRIC)['outcome'],'Needs improvement',change)

    def test_recheck_is_append_only_keeps_reviews_and_never_dispatches(self):
        p.run_experiment(self.directory,True,1,self.dispatch)
        before=p.report(self.directory);row=before['answers'][0]
        feedback={'id':'human-before-recheck','revision':before['review_revision'],'decisions':[
            {'case_id':row['id'],'kind':'label','label':'Unverified','statement':'Need another look'}]}
        p.review(self.directory,feedback)
        originals={f.relative_to(self.directory):f.read_bytes() for f in self.directory.rglob('*.json')}
        with patch.object(p,'execute',side_effect=AssertionError('No new model calls')):
            after=p.recheck_saved(self.directory)
            snapshot=self.directory/'rechecks'/(p.RECHECK_RUBRIC+'.json');saved=snapshot.read_bytes()
            p.recheck_saved(self.directory)
            self.assertEqual(snapshot.read_bytes(),saved)
        self.assertEqual(after['review_revision'],before['review_revision'])
        self.assertEqual(after['answers'][0]['human_review']['human_label'],'Unverified')
        self.assertEqual(after['answers'][0]['original_evaluation'],row['evaluation'])
        for path,content in originals.items():self.assertEqual((self.directory/path).read_bytes(),content)
        changed=json.loads(saved);changed['assessments'][row['id']]['answer_digest']='wrong'
        changed['digest']=p.digest({k:v for k,v in changed.items() if k!='digest'})
        p.atomic(snapshot,changed)
        with self.assertRaises(ValueError):p.report(self.directory)

    def test_recheck_cannot_silently_change_same_rubric(self):
        p.run_experiment(self.directory,True,1,self.dispatch);p.recheck_saved(self.directory)
        original=p.assessment
        def changed(case,answer,rubric='pilot-generation-checks-v1'):
            result=original(case,answer,rubric)
            if rubric==p.RECHECK_RUBRIC:result['outcome']='Needs improvement'
            return result
        with patch.object(p,'assessment',side_effect=changed):
            with self.assertRaises(ValueError):p.recheck_saved(self.directory)


if __name__=='__main__':unittest.main()
