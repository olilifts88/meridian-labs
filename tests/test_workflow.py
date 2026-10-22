import json
import tempfile
import unittest
from pathlib import Path

from workflow_portfolio.domain import Draft, Evidence, InputError, check_candidate
from workflow_portfolio.evals import evaluate_cases
from workflow_portfolio.service import review, submit
from workflow_portfolio.store import Store, fingerprint


ROOT = Path(__file__).resolve().parents[1]


def fixture(name):
    return json.loads((ROOT / "examples" / (name + ".json")).read_text(encoding="utf-8"))


class WorkflowTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.store = Store(str(Path(self.tmp.name) / "test.sqlite3"))

    def tearDown(self):
        self.store.close()
        self.tmp.cleanup()

    def test_wrong_audience_blocks_publication(self):
        decision = submit(fixture("beta_csv_bad"), self.store)
        self.assertEqual(decision.state, "blocked")
        self.assertEqual([f.code for f in decision.findings], ["audience_mismatch"])

    def test_corrected_draft_reuses_record_and_keeps_history(self):
        bad = submit(fixture("beta_csv_bad"), self.store)
        fixed = submit(fixture("beta_csv_good"), self.store)
        self.assertEqual(fixed.state, "ready_to_publish")
        self.assertEqual(bad.record_id, fixed.record_id)
        self.assertEqual([e["event_type"] for e in self.store.events()], ["submitted", "revised"])

    def test_retry_does_not_create_a_second_record(self):
        first = submit(fixture("beta_csv_good"), self.store)
        again = submit(fixture("beta_csv_good"), self.store)
        self.assertTrue(again.duplicate)
        self.assertEqual(first.record_id, again.record_id)
        self.assertEqual(self.store.summary(), {"ready_to_publish": 1})

    def test_new_guide_needs_engineer(self):
        decision = submit(fixture("new_guide"), self.store)
        self.assertEqual(decision.state, "review_required")
        self.assertEqual(review(decision.record_id, "engineer-demo", True, self.store), "ready_to_publish")
        self.assertEqual(self.store.events()[-1]["actor"], "engineer-demo")

    def test_blocked_content_cannot_be_approved(self):
        decision = submit(fixture("beta_csv_bad"), self.store)
        with self.assertRaises(InputError):
            review(decision.record_id, "engineer-demo", True, self.store)
        self.assertEqual(self.store.summary(), {"blocked": 1})

    def test_missing_source_data_does_not_create_record(self):
        data = fixture("beta_csv_good")
        del data["evidence"]["pr_urls"]
        with self.assertRaises(InputError):
            submit(data, self.store)
        self.assertEqual(self.store.summary(), {})

    def test_unknown_citation_fails(self):
        data = fixture("beta_csv_good")
        data["draft"]["citations"] = ["https://example.invalid/other"]
        found = check_candidate(Evidence.from_dict(data["evidence"]), Draft.from_dict(data["draft"]))
        self.assertIn("unsupported_citation", [f.code for f in found])
        self.assertIn("missing_pr_evidence", [f.code for f in found])

    def test_invalid_ga_scope_fails_closed(self):
        data = fixture("new_guide")
        data["evidence"]["audiences"] = ["pilot_group_east"]
        with self.assertRaises(InputError):
            submit(data, self.store)

    def test_benchmark_uses_same_cases(self):
        scores = evaluate_cases(fixture("benchmark"))
        self.assertEqual(scores["model_alpha"]["cases"], scores["model_beta"]["cases"])
        self.assertEqual(scores["model_alpha"]["passed"], 1)
        self.assertEqual(scores["model_beta"]["passed"], 2)
        self.assertEqual(scores["model_alpha"]["failures"]["audience_mismatch"], 1)
        self.assertEqual(scores["model_beta"]["token_coverage"], "2/2")
        self.assertEqual(scores["model_alpha"]["case_results"][0]["case_id"], "beta-csv-audience")

    def test_benchmark_rejects_unmatched_models(self):
        cases = fixture("benchmark")
        cases[1]["responses"].pop()
        with self.assertRaises(InputError):
            evaluate_cases(cases)

    def test_missing_usage_is_unknown_not_zero(self):
        cases = fixture("benchmark")
        del cases[0]["responses"][0]["tokens"]
        scores = evaluate_cases(cases)
        self.assertIsNone(scores["model_alpha"]["tokens"])
        self.assertEqual(scores["model_alpha"]["token_coverage"], "1/2")

    def test_change_identity_ignores_pr_order(self):
        data = fixture("beta_csv_good")["evidence"]
        first = fingerprint(Evidence.from_dict(data))
        data["pr_urls"].reverse()
        self.assertEqual(first, fingerprint(Evidence.from_dict(data)))

    def test_new_pr_on_same_change_keeps_identity_and_rechecks_draft(self):
        first = submit(fixture("beta_csv_good"), self.store)
        later = fixture("beta_csv_good")
        later["evidence"]["pr_urls"].append("https://example.invalid/pr/103")
        updated = submit(later, self.store)
        self.assertEqual(first.record_id, updated.record_id)
        self.assertFalse(updated.duplicate)
        self.assertEqual([event["event_type"] for event in self.store.events()], ["submitted", "revised"])

    def test_pr_identity_cannot_be_reused_for_another_change(self):
        submit(fixture("beta_csv_bad"), self.store)
        other = fixture("beta_csv_good")
        other["evidence"]["change_id"] = "feature-999"
        with self.assertRaises(InputError):
            submit(other, self.store)

    def test_draft_cannot_downgrade_new_guide_to_avoid_review(self):
        data = fixture("new_guide")
        data["draft"]["kind"] = "guide_update"
        decision = submit(data, self.store)
        self.assertEqual(decision.state, "blocked")
        self.assertIn("content_kind_mismatch", [finding.code for finding in decision.findings])


if __name__ == "__main__":
    unittest.main()
