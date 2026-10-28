import copy
import hashlib
import http.client
import json
import runpy
import tempfile
import threading
import unittest
import zipfile
from pathlib import Path
from unittest.mock import patch

from workflow_portfolio import recorded_showcase as r
from workflow_portfolio import ai_pilot
from workflow_portfolio.showcase import ROOT
from workflow_portfolio.showcase_server import make_server


class RecordedShowcaseTests(unittest.TestCase):
    def test_all_five_workflows_have_all_four_real_setups_and_no_private_feedback(self):
        data=r.catalog()
        self.assertEqual(len(data['records']),40)
        self.assertEqual(len(data['cases']),10)
        self.assertEqual(len({c['workflow'] for c in data['cases']}),5)
        self.assertEqual(sum(x['original_checks']['outcome']=='Pass' for x in data['records']),31)
        self.assertEqual(sum(x['revised_checks']['outcome']=='Pass' for x in data['records']),33)
        self.assertEqual(sum(bool(x['owner_review']) for x in data['records']),9)
        self.assertNotIn('human_feedback',json.dumps(data))
        self.assertNotIn('calibration_receipts',json.dumps(data))
        self.assertNotIn('diagnostic',json.dumps(data))
        for c in data['cases']:
            self.assertEqual(len([x for x in data['records'] if x['case_id']==c['id']]),4)

    def test_every_saved_answer_can_run_every_approval_without_calls_or_source_writes(self):
        before=r.SNAPSHOT.read_bytes()
        with patch.object(ai_pilot,'execute',side_effect=AssertionError('No model calls')):
            for record in r.catalog()['records']:
                for choice in r.CHOICES:
                    with self.subTest(record=record['id'],choice=choice):
                        out=r.run_scenario({'record_id':record['id'],'review_choice':choice})
                        self.assertEqual(out['record']['answer'],record['answer'])
                        self.assertEqual(out['source_run_id'],record['id'])
                        self.assertEqual(out['execution']['model_calls'],0)
                        self.assertEqual(out['execution']['new_model_tokens'],0)
                        self.assertFalse(out['execution']['external_writes'])
                        self.assertFalse(out['benchmark_contribution'])
                        self.assertTrue(all(c['verdict']=='Pass' for c in out['scenario_checks']))
                        if out['fresh_checks']['outcome']!='Pass':
                            self.assertEqual(out['outcome']['state'],'held_by_checks')
                            self.assertEqual(out['outcome']['actions'],[])
        self.assertEqual(r.SNAPSHOT.read_bytes(),before)

    def test_uncertain_budget_stays_pending_then_can_be_approved_or_rejected(self):
        key='sol-guided--call-crm-2'
        for choice,state,price in [('pending','pending',18000),('approve','applied',32000),('reject','rejected',18000)]:
            out=r.run_scenario({'record_id':key,'review_choice':choice})
            self.assertEqual(out['outcome']['actions'][0]['state'],state)
            self.assertEqual(next(d for d in out['outcome']['deals'] if d['id']=='d1')['annual_value_gbp'],price)
            self.assertTrue(all(c['passed'] for c in out['outcome']['domain_checks']))

    def test_approval_cannot_erase_missing_or_stale_evidence(self):
        for key in ('sol-guided--questionnaire-2','sol-guided--soc2-2'):
            out=r.run_scenario({'record_id':key,'review_choice':'approve'})
            self.assertEqual(out['fresh_checks']['outcome'],'Pass')
            self.assertEqual(out['outcome']['state'],'needs_evidence')
            self.assertEqual(out['outcome']['actions'],[])

    def test_arbitrary_inputs_models_unknown_records_and_tampering_are_rejected(self):
        for request in ({'record_id':'missing'},{'record_id':'sol-guided--call-crm-2','model':'other'},
                        {'record_id':'sol-guided--call-crm-2','live':True},
                        {'record_id':'sol-guided--call-crm-2','review_choice':'bypass'}):
            with self.assertRaises(ValueError):r.run_scenario(request)
        with tempfile.TemporaryDirectory() as tmp:
            value=json.loads(r.SNAPSHOT.read_text());value['records'][0]['answer']='forged'
            value['digest']=ai_pilot.digest({k:v for k,v in value.items() if k!='digest'})
            path=Path(tmp)/'snapshot.json';path.write_text(json.dumps(value))
            with self.assertRaises(ValueError):r.load_snapshot(path)

    def test_http_paths_are_stateless_and_cannot_invoke_optional_model_session(self):
        class ForbiddenSession:
            def apply(self,*args):raise AssertionError('Visitor invoked a model session')
        server=make_server(0,model_review_session=ForbiddenSession(),owner_review_enabled=False)
        thread=threading.Thread(target=server.serve_forever,daemon=True);thread.start()
        def request(method,path,body=None,origin=None):
            conn=http.client.HTTPConnection('127.0.0.1',server.server_port)
            headers={'Content-Type':'application/json'}
            if origin:headers['Origin']=origin
            conn.request(method,path,json.dumps(body) if body is not None else None,headers)
            response=conn.getresponse();status=response.status;content=response.read();conn.close();return status,content
        try:
            for path in ('/runs','/scenarios','/results','/saved-results','/assets/run-explorer.mjs','/assets/visitor-results.mjs'):
                self.assertEqual(request('GET',path)[0],200,path)
            self.assertEqual(request('GET','/api/recorded-runs')[0],200)
            status,body=request('GET','/api/pilot');self.assertEqual(json.loads(body)['attempted'],40)
            self.assertEqual(request('GET','/evaluation/review')[0],403)
            self.assertEqual(request('POST','/api/pilot/review',{})[0],403)
            self.assertEqual(request('POST','/api/scenario',{'record_id':'sol-guided--release-notes-1'})[0],200)
            self.assertEqual(request('POST','/api/scenario',{'record_id':'sol-guided--release-notes-1','live':True})[0],400)
            self.assertEqual(request('POST','/api/scenario',{'record_id':'sol-guided--release-notes-1'},'https://other.example')[0],403)
        finally:server.shutdown();server.server_close();thread.join()

    def test_zip_has_one_readme_and_no_private_or_unrelated_project_files(self):
        builder=runpy.run_path(str(ROOT/'scripts/build-workflow-showcase.py'))
        with tempfile.TemporaryDirectory() as tmp:
            path=Path(tmp)/'showcase.zip';result=builder['build'](path)
            checksum=hashlib.sha256(path.read_bytes()).hexdigest()
            self.assertEqual(result['sha256'],checksum)
            self.assertEqual(Path(result['checksum_path']).read_text(),checksum+'  showcase.zip\n')
            second=Path(tmp)/'repeat.zip';builder['build'](second)
            self.assertEqual(path.read_bytes(),second.read_bytes())
            with zipfile.ZipFile(path) as archive:
                names=archive.namelist()
                self.assertIn('meridian-workflow-showcase/README.md',names)
                self.assertIn('meridian-workflow-showcase/showcase_demo.py',names)
                self.assertEqual(sum(x.endswith('/README.md') for x in names),1)
                for forbidden in ('private-data/','.git/','.env','auth.json','node_modules/','n8n/'):
                    self.assertTrue(all(forbidden not in name for name in names),forbidden)
                manifest=json.loads(archive.read('meridian-workflow-showcase/MANIFEST.json'))
                for name,digest in manifest.items():
                    self.assertEqual(hashlib.sha256(archive.read('meridian-workflow-showcase/'+name)).hexdigest(),digest)

if __name__=='__main__':unittest.main()
