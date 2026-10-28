import copy
import json
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch
from workflow_portfolio.showcase import run, FIXTURES, load_json, knowledge_sources
from workflow_portfolio.showcase_assurance import evaluate_output, routing_plan
from workflow_portfolio.showcase_evaluation import evaluate_suite
from workflow_portfolio.showcase_review import review


class AssuranceTests(unittest.TestCase):
    def test_regression_and_corruption_probes(self):
        report = evaluate_suite()
        self.assertEqual(report['passed'],36)
        self.assertEqual(report['passed'],report['attempted'])
        self.assertEqual(sum(c['kind']=='corrupted_output_probe' for c in report['cases']),17)
        self.assertEqual(set(report['workflows']), {'release-notes','vulnerabilities','questionnaire','soc2','call-crm'})
        self.assertEqual(sum(c['workflow']=='call-crm' for c in report['cases']),15)

    def test_all_workflows_run_checks_and_router_automatically(self):
        for flow in ('release-notes','vulnerabilities','questionnaire','soc2'):
            r = run(flow,{'as_of':'2026-10-26'})
            self.assertEqual(r['evaluation']['status'],'passed')
            self.assertEqual(r['output_gate'],'awaiting_model_review' if flow=='release-notes' else 'human_review_required')
            self.assertFalse(r['routing']['model_called'])
            self.assertEqual(r['routing']['workflow_execution']['method'],'direct')
            self.assertEqual(r['routing']['model_review']['decision']['execution_status'],'not_dispatched')
            self.assertIsNone(r['routing']['model_review']['actual_model'])

    def test_different_task_kinds_select_different_example_model_routes(self):
        low = run('release-notes',{'as_of':'2026-10-26'})['routing']['model_review']['decision']
        medium = run('questionnaire',{'as_of':'2026-10-26'})['routing']['model_review']['decision']
        self.assertEqual(low['tier'],'Low')
        self.assertEqual(medium['tier'],'Medium')
        self.assertNotEqual(low['model'],medium['model'])
        self.assertIn('review_release_output',low['reason'])

    def test_identical_run_fingerprint_is_stable_but_source_change_invalidates_it(self):
        r = run('questionnaire',{'as_of':'2026-10-26'})
        self.assertEqual(r['run_fingerprint'],run('questionnaire',{'as_of':'2026-10-26'})['run_fingerprint'])
        k = load_json(FIXTURES/'knowledge.json')
        k['sources'][1]['content']['access-control'] = 'Changed policy text.'
        self.assertNotEqual(r['run_fingerprint'],run('questionnaire',{'as_of':'2026-10-26'},k)['run_fingerprint'])

    def test_evaluator_failure_holds_output_even_when_producer_claims_ready(self):
        from workflow_portfolio.showcase_assurance import attach_assurance
        r = run('release-notes',{'as_of':'2026-10-26'})
        r['draft']['audiences'] = ['all_customers']
        sources,_ = knowledge_sources(load_json(FIXTURES/'knowledge.json'),'2026-10-26')
        r = attach_assurance('release-notes',r,sources,None)
        self.assertEqual(r['evaluation']['status'],'failed')
        self.assertEqual(r['output_gate'],'held_by_evaluation')

    def test_wrong_release_audience_is_held_by_source_before_model_review(self):
        r = run('release-notes', {'as_of':'2026-10-26','audience':'all-customers'})
        self.assertEqual(r['status'], 'blocked')
        self.assertEqual(r['output_gate'], 'held_by_source')
        self.assertEqual(r['evaluation']['status'], 'passed')
        self.assertFalse(r['routing']['model_called'])

    def test_conflicting_sources_are_held_and_pass_the_safety_check(self):
        k = load_json(FIXTURES/'knowledge.json')
        k['sources'][2]['content']['encryption'] = 'Conflicting policy claim.'
        r = run('questionnaire',{'as_of':'2026-10-26'},k)
        self.assertEqual(r['answers'][0]['status'],'conflicting_evidence')
        self.assertEqual(r['evaluation']['status'],'passed')

    def test_preview_never_dispatches_and_live_adapter_preserves_original_gate(self):
        root = FIXTURES.parents[1]
        policy = json.loads((root/'examples/routing/policy.json').read_text())
        caps = json.loads((root/'examples/routing/capabilities.json').read_text())
        result = run('questionnaire',{'as_of':'2026-10-26'})
        with patch('workflow_portfolio.showcase_review.execute') as dispatch:
            preview = review(result,policy,caps)
            dispatch.assert_not_called()
            self.assertEqual(preview['review']['status'],'preview_only')
            with self.assertRaises(ValueError):review(result,policy,caps,live=True)
            dispatch.return_value = {'status':'completed','answer':json.dumps({'verdict':'pass','reason':'Evidence gap correctly withheld.','issues':[]}),'usage':{'input_tokens':100}}
            live = review(result,policy,caps,Path('/tmp/fictional-review-receipt'),live=True)
            dispatch.assert_called_once()
            self.assertEqual(live['original_gate'],'human_review_required')
            self.assertFalse(live['approval_granted'])

    def test_live_session_budget_deduplication_and_human_gate(self):
        from workflow_portfolio.showcase_server import ModelReviewSession
        root = FIXTURES.parents[1]
        policy = json.loads((root/'examples/routing/policy.json').read_text())
        caps = json.loads((root/'examples/routing/capabilities.json').read_text())
        with tempfile.TemporaryDirectory() as folder, patch('workflow_portfolio.showcase_review.review') as dispatch:
            dispatch.return_value = {'assessment':{'verdict':'pass','reason':'Supported.','issues':[]},'review':{'status':'completed','answer':'Review the remaining gap.',
                'decision':{'model':'test-model','effort':'medium'},'actual_model':None}}
            session = ModelReviewSession(policy,caps,folder,1)
            first = session.apply(run('questionnaire',{'as_of':'2026-10-26'}))
            self.assertTrue(first['routing']['model_called'])
            self.assertEqual(first['output_gate'],'human_review_required')
            session.apply(run('questionnaire',{'as_of':'2026-10-26'}))
            dispatch.assert_called_once()
            exhausted = session.apply(run('soc2',{'as_of':'2026-10-26'}))
            self.assertEqual(exhausted['live_model_review']['status'],'session_budget_exhausted')

    def test_failed_live_review_is_not_retried_and_blocked_output_is_not_sent(self):
        from workflow_portfolio.showcase_server import ModelReviewSession
        root = FIXTURES.parents[1]
        policy = json.loads((root/'examples/routing/policy.json').read_text())
        caps = json.loads((root/'examples/routing/capabilities.json').read_text())
        with tempfile.TemporaryDirectory() as folder, patch('workflow_portfolio.showcase_review.review',side_effect=TimeoutError):
            session = ModelReviewSession(policy,caps,folder,2)
            first = session.apply(run('questionnaire',{'as_of':'2026-10-26'}))
            again = session.apply(run('questionnaire',{'as_of':'2026-10-26'}))
            self.assertEqual(first['live_model_review']['status'],again['live_model_review']['status'])
            self.assertTrue(again['live_model_review']['cached'])
            self.assertIsNone(first['routing']['model_called'])
            held = session.apply(run('release-notes',{'as_of':'2026-10-26','audience':'all-customers'}))
            self.assertFalse(held['routing']['model_called'])
            self.assertEqual(held['live_model_review']['status'],'skipped_output_held')

    def test_routine_release_automates_but_new_material_needs_human_review(self):
        from workflow_portfolio.showcase_server import ModelReviewSession
        root=FIXTURES.parents[1]
        policy=json.loads((root/'examples/routing/policy.json').read_text())
        caps=json.loads((root/'examples/routing/capabilities.json').read_text())
        with tempfile.TemporaryDirectory() as folder, patch('workflow_portfolio.showcase_review.review') as dispatch:
            dispatch.return_value={'assessment':{'verdict':'pass','reason':'Supported.','issues':[]},
                                   'review':{'status':'completed','answer':'{}','decision':{'model':'test','effort':'low'}}}
            session=ModelReviewSession(policy,caps,folder,3)
            routine=session.apply(run('release-notes',{'as_of':'2026-10-26'}))
            self.assertEqual(routine['status'],'automated_release')
            self.assertFalse(routine['review_required'])
            self.assertFalse(routine['published'])
            duplicate=session.apply(run('release-notes',{'as_of':'2026-10-26'}))
            self.assertTrue(duplicate['delivery_record']['duplicate'])
            self.assertEqual(routine['delivery_record']['id'],duplicate['delivery_record']['id'])
            for category in ('new_feature','new_document'):
                r=session.apply(run('release-notes',{'as_of':'2026-10-26','change_category':category}))
                self.assertEqual(r['status'],'review_required')
                self.assertTrue(r['review_required'])
                self.assertNotIn('delivery_record',r)

    def test_model_hold_prevents_automatic_release(self):
        from workflow_portfolio.showcase_server import ModelReviewSession
        root=FIXTURES.parents[1]
        with tempfile.TemporaryDirectory() as folder, patch('workflow_portfolio.showcase_review.review') as dispatch:
            dispatch.return_value={'assessment':{'verdict':'hold','reason':'Unsupported claim.','issues':['Unsupported claim.']},
                                   'review':{'status':'completed','answer':'{}','decision':{'model':'test','effort':'low'}}}
            session=ModelReviewSession(json.loads((root/'examples/routing/policy.json').read_text()),
                                       json.loads((root/'examples/routing/capabilities.json').read_text()),folder,1)
            r=session.apply(run('release-notes',{'as_of':'2026-10-26'}))
            self.assertEqual(r['output_gate'],'held_by_model_review')
            self.assertNotIn('delivery_record',r)

    def test_model_review_response_schema_fails_closed(self):
        from workflow_portfolio.showcase_review import parse_assessment
        for answer in ('approved','{}','{"verdict":"pass","reason":"Okay","issues":["But wrong"]}'):
            with self.assertRaises(ValueError):parse_assessment(answer)

    def test_model_receives_original_inputs_and_only_relevant_sources(self):
        from workflow_portfolio.showcase_assurance import review_request
        for flow in ('vulnerabilities','soc2','questionnaire'):
            r=run(flow,{'as_of':'2026-10-26'})
            bundle=json.loads(review_request(flow,r)['text'].split('\n',1)[1])
            self.assertEqual(bundle['workflow_input'],load_json(FIXTURES/(flow+'.json')))
            self.assertNotIn('product-change',[s['id'] for s in bundle['evidence_snapshot']])
            self.assertNotIn('evaluation',bundle)

    def test_release_scenarios_use_matching_distinct_evidence(self):
        default=run('release-notes',{'as_of':'2026-10-26'})
        for category in ('new_feature','new_document'):
            r=run('release-notes',{'as_of':'2026-10-26','change_category':category})
            self.assertEqual(r['evidence_snapshot'][0]['content']['change_category'],category)
            self.assertNotEqual(r['evidence_snapshot'][0]['content']['change_id'],default['evidence_snapshot'][0]['content']['change_id'])
            self.assertEqual(r['evaluation']['status'],'passed')


if __name__ == '__main__':unittest.main()
