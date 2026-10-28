import copy
import unittest

from workflow_portfolio.domain import InputError
from workflow_portfolio.evals import (candidate_from_reference, compare_workflow_candidates,
                                     evaluation_record, frozen_workflow_cases)


class WorkflowBenchmarkTests(unittest.TestCase):
    def setUp(self):
        self.bundle = frozen_workflow_cases()
        self.reference = candidate_from_reference(self.bundle)

    def test_five_workflows_reuse_checks_and_detect_bad_outputs(self):
        corrupt = candidate_from_reference(self.bundle, 'corrupt', corrupt=True)
        report = compare_workflow_candidates(self.bundle, [self.reference, corrupt])
        good, bad = report['candidates']
        self.assertEqual((good['successful'], good['attempted']), (5, 5))
        self.assertEqual((bad['successful'], bad['attempted']), (0, 5))
        self.assertEqual(bad['success_delta'], -5)
        self.assertIsNone(good['tokens_per_success'])
        self.assertIsNone(good['cost_per_success'])
        self.assertIsNone(good['candidate_latency_ms'])

    def test_frozen_inputs_and_output_digests_are_repeatable(self):
        self.assertEqual(self.bundle['dataset_digest'], frozen_workflow_cases()['dataset_digest'])
        for case in self.bundle['cases']:
            self.assertIn('evaluation_record', case['reference_output'])
            self.assertEqual(case['reference_output']['evaluation_record']['contract'], 'workflow-evaluation-v1')

    def test_altered_source_and_wrong_rubric_do_not_compare(self):
        changed = copy.deepcopy(self.bundle)
        changed['cases'][0]['inputs']['payload'] = 'altered'
        with self.assertRaises(InputError):
            compare_workflow_candidates(changed, [self.reference])
        self.reference['dataset_digest'] = 'wrong'
        with self.assertRaises(InputError):
            compare_workflow_candidates(self.bundle, [self.reference])

    def test_incomplete_duplicate_case_or_duplicate_candidate_rejected(self):
        bad = copy.deepcopy(self.reference)
        bad['responses'].pop()
        with self.assertRaises(InputError):
            compare_workflow_candidates(self.bundle, [bad])
        bad['responses'].append(bad['responses'][0])
        with self.assertRaises(InputError):
            compare_workflow_candidates(self.bundle, [bad])
        with self.assertRaises(InputError):
            compare_workflow_candidates(self.bundle, [self.reference, self.reference])

    def test_malformed_output_is_a_case_failure_not_lost_denominator(self):
        self.reference['responses'][-1]['output'] = {}
        report = compare_workflow_candidates(self.bundle, [self.reference])
        self.assertEqual(report['candidates'][0]['attempted'], 5)
        self.assertEqual(report['candidates'][0]['successful'], 4)
        self.assertIn('Malformed', report['candidates'][0]['case_results'][-1]['error'])

    def test_human_verdict_is_never_inferred(self):
        result = evaluation_record('example', {}, {}, {'checks': [{'name': 'Grounding', 'passed': True}]}, 'v1')
        self.assertEqual(result['outcome'], 'Pass')
        self.assertIsNone(result['human_verdict'])


if __name__ == '__main__':
    unittest.main()
