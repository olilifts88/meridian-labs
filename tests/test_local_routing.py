import json
import tempfile
import unittest
from pathlib import Path
from subprocess import CompletedProcess
from unittest.mock import patch
from workflow_portfolio.routing.notion_config import compile_page
from workflow_portfolio.routing.local_codex import execute, parse_events, subscription_environment, command
from workflow_portfolio.routing.router import RoutingError, select_route

ROOT = Path(__file__).resolve().parents[1]

def page():
    props = {'Active status':'Active', 'Skill name':'fixture', 'Low Model Choice':'GPT-6 Luna',
             'Medium Model Choice':'GPT-6.1 Sol', 'High Model Choice':'GPT-6.1 Sol'}
    return {'id':'synthetic-page', 'text':'<properties>' + json.dumps(props) + '</properties>\n'
            '<b>Current version:</b> v1.2\n## Model routing and default effort\n'
            '| Low | Low |\n| Medium | Medium |\n| High | High |\n## Shared guidance\n'}

class LocalRoutingTests(unittest.TestCase):
    def setUp(self):
        self.p = compile_page(page())
        self.c = json.loads((ROOT/'examples/routing/capabilities.json').read_text())
        self.c['gpt-6-luna'] = ['low','high']
        self.c['gpt-6.1-sol'] = ['medium','high']
        self.r = json.loads((ROOT/'examples/routing/request.json').read_text())
        self.calls = []

    def fake_run(self, cmd, **kw):
        self.calls.append((cmd,kw))
        if cmd[1:3] == ['login','status']:
            return CompletedProcess(cmd,0,'Logged in using ChatGPT','')
        return CompletedProcess(cmd,0,'\n'.join(json.dumps(e) for e in [
            {'type':'item.completed','item':{'type':'agent_message','text':'Saved; schedule untested.'}},
            {'type':'turn.completed','usage':{'input_tokens':100,'cached_input_tokens':80,'output_tokens':10}}]),'')

    def test_connector_properties_and_efforts(self):
        self.assertEqual(self.p['skills']['summarisation']['routes']['Low'], {'enabled':True,'model':'gpt-6-luna','effort':'low'})
    def test_inactive_rejected(self):
        p=page();p['text']=p['text'].replace('"Active"','"Inactive"')
        with self.assertRaises(RoutingError):compile_page(p)
    def test_missing_effort_rejected(self):
        p=page();p['text']=p['text'].replace('| Low | Low |','')
        with self.assertRaises(RoutingError):compile_page(p)
    def test_inherit_rejected_without_context(self):
        p=page();p['text']=p['text'].replace('GPT-6 Luna','Inherit current')
        with self.assertRaises(RoutingError):compile_page(p)
    def test_not_applicable_disabled(self):
        p=page();p['text']=p['text'].replace('GPT-6 Luna','Not applicable')
        self.assertFalse(compile_page(p)['skills']['summarisation']['routes']['Low']['enabled'])
    def test_source_change_changes_revision(self):
        p=page();a=compile_page(p);p['text']+='changed'
        self.assertNotEqual(a['revision'],compile_page(p)['revision'])
    def test_truncated_rejected(self):
        p=page();p['truncated']=True
        with self.assertRaises(RoutingError):compile_page(p)
    def test_environment_drops_api_auth(self):
        self.assertEqual(subscription_environment({'OPENAI_API_KEY':'secret','CODEX_API_KEY':'secret','PATH':'safe','AZURE_OPENAI_ENDPOINT':'other'}), {'PATH':'safe'})
    def test_readonly_explicit_model_command(self):
        cmd=command('codex',select_route(self.r,self.p,self.c),'/tmp')
        for flag in ['--ephemeral','--ignore-user-config','read-only','gpt-6-luna','forced_login_method="chatgpt"']:self.assertIn(flag,cmd)
    def test_complete_and_prevent_replay(self):
        with tempfile.TemporaryDirectory() as d, patch('shutil.which',return_value='codex'):
            receipt=Path(d)/'receipt.json'
            report=execute(self.r,self.p,self.c,receipt,run=self.fake_run,environ={'PATH':'safe'})
            self.assertEqual(report['status'],'completed');self.assertIsNone(report['actual_model'])
            self.assertEqual(report['usage']['input_tokens'],100)
            with self.assertRaises(FileExistsError):execute(self.r,self.p,self.c,receipt,run=self.fake_run,environ={'PATH':'safe'})
            self.assertEqual(sum(c[0][1]=='exec' for c in self.calls),1)
    def test_api_login_never_dispatches(self):
        def api(cmd,**kw):return CompletedProcess(cmd,0,'Logged in using an API key','')
        with tempfile.TemporaryDirectory() as d, patch('shutil.which',return_value='codex'):
            with self.assertRaises(RoutingError):execute(self.r,self.p,self.c,Path(d)/'r.json',run=api,environ={})
            self.assertFalse((Path(d)/'r.json').exists())
    def test_failed_execution_claim_blocks_retry(self):
        def fail(cmd,**kw):
            if cmd[1]=='login':return self.fake_run(cmd,**kw)
            self.calls.append((cmd,kw));return CompletedProcess(cmd,1,'','Fixture failure')
        with tempfile.TemporaryDirectory() as d, patch('shutil.which',return_value='codex'):
            receipt=Path(d)/'r.json'
            with self.assertRaises(RoutingError):execute(self.r,self.p,self.c,receipt,run=fail,environ={})
            self.assertEqual(json.loads(receipt.read_text())['status'],'failed_or_uncertain_no_retry')
            with self.assertRaises(FileExistsError):execute(self.r,self.p,self.c,receipt,run=fail,environ={})
    def test_incomplete_events_rejected(self):
        with self.assertRaises(RoutingError):parse_events('{}')
    def test_two_turns_not_summed(self):
        with self.assertRaises(RoutingError):parse_events('\n'.join([json.dumps({'type':'turn.completed'})]*2))
    def test_error_not_success(self):
        with self.assertRaises(RoutingError):parse_events(json.dumps({'type':'error'}))
