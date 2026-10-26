import copy
import unittest
from workflow_portfolio.domain import InputError
from workflow_portfolio.showcase import FIXTURES, load_json, run


class SOC2ReviewTests(unittest.TestCase):
    def setUp(self):
        self.data = load_json(FIXTURES / 'soc2.json')
        self.knowledge = load_json(FIXTURES / 'knowledge.json')

    def review(self, **options):
        return run('soc2', dict(as_of='2026-10-26', **options), self.knowledge, self.data)

    def test_sample_distinguishes_review_ready_from_four_gap_types(self):
        r = self.review()
        self.assertEqual(r['ready_for_reviewer'], 1)
        self.assertEqual(r['controls_needing_follow_up'], 4)
        rows = r['controls']
        self.assertIn('overdue', rows[1]['follow_ups'][0])
        self.assertEqual(len(rows[2]['follow_ups']), 2)
        self.assertIn('outside', rows[3]['follow_ups'][0])
        self.assertIn('approval', rows[4]['follow_ups'][0])
        self.assertTrue(rows[0]['citations'])
        self.assertFalse(r['published'])

    def test_missing_or_disabled_register_never_passes_evidence(self):
        r = self.review(disabled_sources=['soc2-evidence-register'])
        self.assertEqual(r['ready_for_reviewer'], 0)
        self.assertTrue(r['excluded_sources'])
        self.assertFalse(r['controls'][0]['citations'])

    def test_unknown_evidence_requires_follow_up(self):
        self.data['controls'][0]['evidence_ids'] = ['unknown']
        self.assertIn('unavailable', self.review()['controls'][0]['follow_ups'][0])

    def test_resolving_stale_record_updates_only_its_control(self):
        register = next(s for s in self.knowledge['sources'] if s['id'] == 'soc2-evidence-register')
        register['content']['evidence'][1]['reviewed_on'] = '2026-10-25'
        self.assertEqual(self.review()['ready_for_reviewer'], 2)

    def test_future_and_reversed_dates_do_not_pass(self):
        for start, end in [('2026-10-27','2026-10-28'),('2026-10-25','2026-07-01')]:
            self.data.update(period_start=start, period_end=end)
            with self.assertRaises(InputError):
                self.review()

    def test_bad_controls_duplicate_evidence_and_nonfictional_input_rejected(self):
        original = copy.deepcopy(self.data)
        self.data['controls'].append(copy.deepcopy(self.data['controls'][0]))
        with self.assertRaises(InputError): self.review()
        self.data = original
        self.data['fictional'] = False
        with self.assertRaises(InputError): self.review()
        self.data['fictional'] = True
        register = self.knowledge['sources'][-1]
        register['content']['evidence'].append(copy.deepcopy(register['content']['evidence'][0]))
        with self.assertRaises(InputError): self.review()


if __name__ == '__main__': unittest.main()
