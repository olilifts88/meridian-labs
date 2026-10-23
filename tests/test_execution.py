import unittest
from workflow_portfolio.routing.execution import plan_execution
from workflow_portfolio.routing.prompt_hook import render_hook
from workflow_portfolio.routing.router import RoutingError

class ExecutionTests(unittest.TestCase):
    def test_simple_unknown_model_stays_direct(self):
        p=plan_execution(bounded=True,worker_available=True)
        self.assertEqual(p.method,'direct');self.assertIsNone(p.actual_model)
    def test_real_benefit_delegates(self):
        self.assertEqual(plan_execution(bounded=False,worker_available=True,worker_reason='diagnosed_quality_gap').method,'delegate')
    def test_no_worker_scope_wins(self):
        self.assertEqual(plan_execution(bounded=False,worker_available=True,worker_reason='capability_needed',prohibit_workers=True).method,'direct')
    def test_inherited_route_stays_direct(self):
        self.assertEqual(plan_execution(bounded=True,worker_available=True,inherit_current=True).method,'direct')
    def test_missing_required_capability_blocks(self):
        self.assertEqual(plan_execution(bounded=False,worker_available=False,worker_reason='capability_needed').method,'blocked')
    def test_no_workers_for_missing_identity(self):
        with self.assertRaises(RoutingError):plan_execution(bounded=True,worker_available=True,worker_reason='unknown_model')
    def test_no_tool_escalation_from_truthy_string(self):
        with self.assertRaises(RoutingError):plan_execution(bounded='yes',worker_available=True)
    def test_observed_model_does_not_invent_effort(self):
        p=plan_execution(bounded=True,worker_available=True,observed_model='fixture-model')
        self.assertEqual(p.actual_model,'fixture-model');self.assertIsNone(p.actual_effort)
    def test_hook_is_pointer_and_no_model_list(self):
        out=render_hook({'hook_event_name':'UserPromptSubmit'},'https://example.com/guidance')
        text=out['hookSpecificOutput']['additionalContext']
        self.assertIn('https://example.com/guidance',text);self.assertNotIn('dispatch',text)
    def test_hook_keeps_prompt_and_identifiers_private(self):
        out=render_hook({'hook_event_name':'UserPromptSubmit','prompt':'secret','session_id':'private'},'https://example.com/guidance')
        self.assertNotIn('secret',str(out));self.assertNotIn('private',str(out))
    def test_hook_exposes_only_valid_client_model_field(self):
        text=render_hook({'hook_event_name':'UserPromptSubmit','model':'fixture-model'},'https://example.com/guidance')['hookSpecificOutput']['additionalContext']
        self.assertIn('client-reported',text);self.assertIn('not exposed',text)
    def test_hook_other_events_are_noop(self):
        self.assertEqual(render_hook({'hook_event_name':'SubagentStart'},'https://example.com/guidance'),{})
    def test_hook_rejects_nonhttps_or_credentials(self):
        for url in ['file:///tmp/private','https://user:secret@example.com/path','https://example.com/\ntext']:
            with self.assertRaises(ValueError):render_hook({},url)
