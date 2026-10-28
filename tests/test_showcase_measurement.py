import copy
import hashlib
import unittest
from unittest.mock import patch

from workflow_portfolio import recorded_showcase as recorded
from workflow_portfolio.showcase_measurement import estimate_cost, route_case, RATE_CARD


class ShowcaseMeasurementTests(unittest.TestCase):
    def setUp(self):
        self.snapshot = recorded.load_snapshot()
        self.cases = {c['id']: c for c in self.snapshot['experiment']['cases']}

    def test_valuation_reuses_reconciled_token_categories_without_double_counting(self):
        r = {'requested_model': 'gpt-6.1-sol', 'usage': {'input_tokens': 1000000,
             'cached_input_tokens': 800000, 'output_tokens': 1000,
             'reasoning_output_tokens': 500, 'cache_write_input_tokens': 0}}
        # Long inputs require another rate-card scope, not guessed multipliers.
        self.assertIsNone(estimate_cost(r)['amount'])
        r['usage']['input_tokens'] = 100000
        r['usage']['cached_input_tokens'] = 80000
        value = estimate_cost(r)
        self.assertAlmostEqual(value['amount'], .04 + .008 + .01)
        self.assertAlmostEqual(sum(value['components'].values()), value['amount'])
        self.assertIsNone(value['actual_charge'])
        self.assertEqual(value['rate_card']['checked_on'], '2026-10-28')

    def test_unknown_or_inconsistent_usage_never_becomes_free(self):
        r = copy.deepcopy(self.snapshot['records'][0])
        for edit in ({'cached_input_tokens': 999999}, {'output_tokens': -1},
                     {'output_tokens': None}, {'reasoning_output_tokens': 999999},
                     {'cache_write_input_tokens': 1}, {'input_tokens': True}):
            bad = copy.deepcopy(r); bad['usage'].update(edit)
            self.assertIsNone(estimate_cost(bad)['amount'], edit)
        r['requested_model'] = 'unknown'
        self.assertIsNone(estimate_cost(r)['amount'])
        r['usage'] = None
        self.assertIsNone(estimate_cost(r)['amount'])

    def test_all_five_workflows_route_from_evidence_with_code_and_hold_paths(self):
        expected = {'release-notes:1': ('model', 'gpt-6-luna'),
                    'release-notes:2': ('model', 'gpt-6.1-sol'),
                    'vulnerabilities:1': ('model', 'gpt-6-luna'),
                    'vulnerabilities:2': ('code', None),
                    'questionnaire:1': ('model', 'gpt-6-luna'),
                    'questionnaire:2': ('hold', None),
                    'soc2:1': ('model', 'gpt-6-luna'), 'soc2:2': ('code', None),
                    'call-crm:1': ('model', 'gpt-6.1-sol'), 'call-crm:2': ('model', 'gpt-6.1-sol')}
        for key, pair in expected.items():
            c = copy.deepcopy(self.cases[key]); c.pop('baseline', None)
            c['id'] = 'different'; c['title'] = 'irrelevant'; c['success'] = 'irrelevant'
            route = route_case(c)
            self.assertEqual((route['action'], route['model']), pair, key)
            self.assertEqual(route['execution_status'], 'not_dispatched')
            self.assertEqual(route['model_calls'], 0)
            if route['model']: self.assertIn('dispatch_policy_digest', route)

    def test_router_changes_with_input_not_a_hardcoded_case_number(self):
        c = copy.deepcopy(self.cases['release-notes:1'])
        c['sources'] = copy.deepcopy(self.cases['release-notes:2']['sources'])
        self.assertEqual(route_case(c)['model'], 'gpt-6.1-sol')
        c = copy.deepcopy(self.cases['call-crm:2'])
        c['fixture']['calls'][0]['transcript'] = 'Please summarise our conversation about onboarding.'
        self.assertEqual(route_case(c)['model'], 'gpt-6-luna')
        c['fixture']['calls'][0]['transcript'] = ''
        self.assertEqual(route_case(c)['action'], 'hold')
        c = copy.deepcopy(self.cases['questionnaire:1'])
        c['sources'] = {}
        self.assertEqual(route_case(c)['action'], 'hold')
        self.assertEqual(route_case({'workflow': 'unknown'})['action'], 'hold')

    def test_catalog_and_scenarios_preserve_source_and_use_no_inference(self):
        before = hashlib.sha256(recorded.SNAPSHOT.read_bytes()).hexdigest()
        with patch('workflow_portfolio.ai_pilot.execute', side_effect=AssertionError('No AI calls')):
            data = recorded.catalog()
            self.assertEqual(len(data['routing']['cases']), 10)
            self.assertEqual(len({c['workflow'] for c in data['routing']['cases']}), 5)
            self.assertTrue(all(r['estimated_cost']['amount'] is not None for r in data['records']))
            self.assertAlmostEqual(sum(r['estimated_cost']['amount'] for r in data['records']), .19512988)
            result = recorded.run_scenario({'record_id': 'sol-guided--call-crm-2'})
            self.assertEqual(result['record']['routing_preview']['tier'], 'High')
            self.assertEqual(result['execution']['new_model_tokens'], 0)
            self.assertEqual(result['record']['answer'], next(r for r in self.snapshot['records'] if r['id'] == result['source_run_id'])['answer'])
        self.assertEqual(before, hashlib.sha256(recorded.SNAPSHOT.read_bytes()).hexdigest())

if __name__ == '__main__': unittest.main()
