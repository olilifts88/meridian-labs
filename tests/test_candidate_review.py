import tempfile
import unittest
from pathlib import Path

from workflow_portfolio.candidate_review import CandidateReviewStore
from workflow_portfolio.domain import InputError


CANDIDATE = {
    "feature_key": "csv-export-pilot",
    "title": "CSV export pilot",
    "summary": "Pilot users can export saved analysis.",
    "availability": {"stage": "beta", "cohorts": ["Pilot North", "Pilot South"]},
    "prs": ["https://example.invalid/prs/41", "https://example.invalid/prs/42"],
}
ACTION = {
    "event_id": "U_DEMO_REVIEWER:1792692000.000001",
    "feature_key": "csv-export-pilot",
    "decision": "announced",
    "reviewer": "U_DEMO_REVIEWER",
}


class CandidateReviewTests(unittest.TestCase):
    def setUp(self):
        self.folder = tempfile.TemporaryDirectory()
        self.path = str(Path(self.folder.name) / "review.sqlite3")
        self.store = CandidateReviewStore(self.path)

    def tearDown(self):
        self.store.close()
        self.folder.cleanup()

    def test_review_is_persistent_and_retry_does_not_add_event(self):
        self.assertTrue(self.store.register(CANDIDATE))
        self.assertFalse(self.store.register(CANDIDATE))
        self.assertFalse(self.store.decide(ACTION)["duplicate_event"])
        self.assertTrue(self.store.decide(ACTION)["duplicate_event"])
        self.assertEqual(len(self.store.events()), 1)
        self.store.close()
        self.store = CandidateReviewStore(self.path)
        self.assertEqual(self.store.records(), [{"feature_key": "csv-export-pilot", "state": "announced"}])
        self.assertTrue(self.store.decide(ACTION)["duplicate_event"])

    def test_final_decision_rejects_a_new_conflicting_click(self):
        self.store.register(CANDIDATE)
        self.store.decide(ACTION)
        with self.assertRaisesRegex(InputError, "final review decision"):
            self.store.decide({**ACTION, "event_id": "U_DEMO_REVIEWER:1792692001.000001", "decision": "declined"})
        self.assertEqual(len(self.store.events()), 1)

    def test_deferred_candidate_can_receive_later_final_decision(self):
        self.store.register(CANDIDATE)
        self.store.decide({**ACTION, "decision": "deferred"})
        result = self.store.decide({**ACTION, "event_id": "U_DEMO_REVIEWER:1792692001.000001"})
        self.assertEqual(result["state"], "announced")
        self.assertEqual(len(self.store.events()), 2)

    def test_same_pr_cannot_be_claimed_by_another_candidate(self):
        self.store.register(CANDIDATE)
        with self.assertRaisesRegex(InputError, "PR link already belongs"):
            self.store.register({**CANDIDATE, "feature_key": "other-feature"})
        self.assertEqual(len(self.store.records()), 1)

    def test_review_event_identity_cannot_be_reused(self):
        self.store.register(CANDIDATE)
        self.store.decide(ACTION)
        with self.assertRaisesRegex(InputError, "reused with different"):
            self.store.decide({**ACTION, "decision": "declined"})
        self.assertEqual(len(self.store.events()), 1)


if __name__ == "__main__":
    unittest.main()
