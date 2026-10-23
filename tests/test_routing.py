import copy
import json
import unittest
from pathlib import Path
from workflow_portfolio.routing.router import RoutingError, select_route, retry_plan, trace
ROOT = Path(__file__).resolve().parents[1] / 'examples' / 'routing'
class RoutingTests(unittest.TestCase):
 def setUp(self):
  self.p=json.loads((ROOT/'policy.json').read_text());self.c=json.loads((ROOT/'capabilities.json').read_text());self.r=json.loads((ROOT/'request.json').read_text())
 def pick(self,**kw):return select_route(self.r,self.p,self.c,**kw)
 def test_fixed_rule_does_not_call_classifier(self):
  def fail(_):raise AssertionError('Unnecessary classifier call')
  self.assertEqual(self.pick(classifier=fail).model,'gpt-6-luna')
 def test_repeat_decision_is_deterministic(self):self.assertEqual(self.pick(),self.pick())
 def test_ambiguous_requires_classifier(self):
  self.r['task_kind']='other'
  with self.assertRaises(RoutingError):self.pick()
 def test_classifier_choice_is_validated(self):
  self.r['task_kind']='other';self.assertEqual(self.pick(classifier=lambda _: {'skill':'analysis','tier':'Medium'}).model,'gpt-6.1-sol')
 def test_unknown_classifier_skill_rejected(self):
  self.r['task_kind']='other'
  with self.assertRaises(RoutingError):self.pick(classifier=lambda _: {'skill':'invented','tier':'Low'})
 def test_classifier_cannot_inject_model(self):
  self.r['task_kind']='other'
  with self.assertRaises(RoutingError):self.pick(classifier=lambda _: {'skill':'analysis','tier':'Low','model':'override'})
 def test_inactive_skill_rejected(self):
  self.p['skills']['summarisation']['active']=False
  with self.assertRaises(RoutingError):self.pick()
 def test_disabled_tier_rejected(self):
  self.p['skills']['summarisation']['routes']['Low']={'enabled':False}
  with self.assertRaises(RoutingError):self.pick()
 def test_incompatible_effort_rejected(self):
  self.p['skills']['summarisation']['routes']['Low']['effort']='unsupported'
  with self.assertRaises(RoutingError):self.pick()
 def test_missing_tier_rejected(self):
  del self.p['skills']['analysis']['routes']['High']
  with self.assertRaises(RoutingError):self.pick()
 def test_writes_rejected(self):
  self.r['requires_write']=True
  with self.assertRaises(RoutingError):self.pick()
 def test_missing_write_scope_rejected(self):
  del self.r['requires_write']
  with self.assertRaises(RoutingError):self.pick()
 def test_trace_excludes_prompt_and_actual_identity(self):
  t=trace(self.pick());self.assertNotIn(self.r['text'],json.dumps(t));self.assertIsNone(t['actual_model']);self.assertEqual(t['decision']['execution_status'],'not_dispatched')
 def test_policy_change_changes_digest(self):
  first=self.pick();self.p['revision']='example-v2';self.assertNotEqual(first.policy_digest,self.pick().policy_digest)
 def test_one_transient_retry_only(self):
  d=self.pick();self.assertEqual(retry_plan(d,1,'temporary_unavailable')['action'],'retry_same_route');self.assertEqual(retry_plan(d,2,'temporary_unavailable')['action'],'stop')
 def test_safety_denial_never_retried(self):self.assertEqual(retry_plan(self.pick(),1,'permission_denied')['action'],'stop')
 def test_uncertain_dispatch_never_retried(self):self.assertEqual(retry_plan(self.pick(),1,'unknown_dispatch')['action'],'stop')
