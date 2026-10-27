import json
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from workflow_portfolio.release_agent import parse_draft, run_release
from workflow_portfolio.showcase import FIXTURES, load_json, run


class ReleaseAgentTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        root = FIXTURES.parents[1]
        cls.policy = load_json(root / 'examples/showcase/review-policy.json')
        cls.capabilities = load_json(root / 'examples/showcase/review-capabilities.json')
        cls.source = run('release-notes', {'as_of': '2026-10-26'})['evidence_snapshot'][0]

    def test_draft_contract_rejects_broad_or_missing_availability(self):
        good = self.source['content']['availability_statement'] + ' Report column order is preserved.'
        self.assertEqual(parse_draft(json.dumps({'body': good}), self.source), good)
        for answer in ('{}', json.dumps({'body': 'Everyone can use CSV export.'}),
                       json.dumps({'body': good, 'approved': True}),
                       json.dumps({'body': good + ' All customers can use it.'})):
            with self.assertRaises(ValueError):
                parse_draft(answer, self.source)

    def test_full_path_records_both_stage_usage_and_keeps_release_local(self):
        body = self.source['content']['availability_statement'] + ' CSV export preserves report column order.'
        calls = []

        def draft(request, policy, capabilities, receipt):
            calls.append(request['task_kind'])
            report = {'status': 'completed', 'answer': json.dumps({'body': body}),
                      'usage': {'input_tokens': 80, 'output_tokens': 20}}
            Path(receipt).write_text(json.dumps(report))
            return report

        def review(result, policy, capabilities, receipt, live):
            calls.append('review')
            report = {'status': 'completed', 'answer': json.dumps({'verdict': 'pass', 'reason': 'Supported.', 'issues': []}),
                      'usage': {'input_tokens': 90, 'output_tokens': 10}}
            Path(receipt).write_text(json.dumps(report))
            return {'review': report, 'assessment': {'verdict': 'pass', 'reason': 'Supported.', 'issues': []}}

        with tempfile.TemporaryDirectory() as folder, patch('workflow_portfolio.showcase_review.review', review):
            first = run_release(self.policy, self.capabilities, folder, '2026-10-26', live=True, dispatch=draft)
            self.assertEqual(calls, ['draft_release_output', 'review'])
            self.assertEqual(first['result']['draft']['model'], 'subscription-model')
            self.assertEqual(first['result']['status'], 'automated_release')
            self.assertFalse(first['result']['published'])
            self.assertEqual(first['usage']['new_call_token_totals']['input_tokens'], 170)
            self.assertEqual(first['usage']['calls_attempted_this_run'], 2)
            self.assertTrue(list(Path(folder, 'local-release-feed').glob('*.json')))
            second = run_release(self.policy, self.capabilities, folder, '2026-10-26', live=True, dispatch=draft)
            self.assertEqual(calls, ['draft_release_output', 'review'])
            self.assertEqual(second['usage']['calls_attempted_this_run'], 0)
            self.assertEqual(second['usage']['new_call_token_totals'], {})
            self.assertEqual(second['usage']['receipt_token_totals']['input_tokens'], 170)

    def test_one_call_limit_holds_before_review(self):
        body = self.source['content']['availability_statement'] + ' CSV export preserves report column order.'
        def draft(request, policy, capabilities, receipt):
            report = {'status': 'completed', 'answer': json.dumps({'body': body}), 'usage': None}
            Path(receipt).write_text(json.dumps(report))
            return report
        with tempfile.TemporaryDirectory() as folder, patch('workflow_portfolio.showcase_review.review') as reviewer:
            record = run_release(self.policy, self.capabilities, folder, '2026-10-26', live=True,
                                 call_limit=1, dispatch=draft)
            reviewer.assert_not_called()
            self.assertEqual(record['result']['output_gate'], 'awaiting_model_review')
            self.assertEqual(record['usage']['coverage'], 'partial_or_unavailable')

    def test_bad_draft_and_preblocked_audience_do_not_dispatch_review(self):
        with tempfile.TemporaryDirectory() as folder, patch('workflow_portfolio.showcase_review.review') as reviewer:
            bad = run_release(self.policy, self.capabilities, folder, '2026-10-26', live=True,
                              dispatch=lambda *args: {'status': 'completed', 'answer': '{}'})
            self.assertEqual(bad['result']['output_gate'], 'held_by_agent_draft')
            reviewer.assert_not_called()
            self.assertEqual(bad['usage']['calls_attempted_this_run'], 1)
            preview = run_release(self.policy, self.capabilities, folder, '2026-10-26')
            self.assertEqual(preview['usage']['calls_attempted_this_run'], 0)


if __name__ == '__main__':
    unittest.main()
