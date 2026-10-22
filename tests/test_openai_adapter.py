import json
import unittest

from workflow_portfolio.domain import Evidence, InputError
from workflow_portfolio.openai_adapter import OpenAIDrafter


class OpenAIAdapterTests(unittest.TestCase):
    def setUp(self):
        self.evidence = Evidence.from_dict({
            "change_id": "csv-export-pilot", "feature": "CSV export",
            "content_kind": "release_note", "stage": "beta",
            "audiences": ["pilot_group_east", "pilot_group_west"],
            "pr_urls": ["https://example.invalid/prs/41"],
            "source_urls": ["https://example.invalid/spec/csv-export"],
        })

    def test_adapter_passes_source_facts_in_structured_request(self):
        captured = {}

        def fake_transport(payload, key):
            captured.update(payload)
            self.assertEqual(key, "fake-key")
            draft = {
                "kind": "release_note", "headline": "CSV export pilot",
                "body": "Pilot groups can export results to CSV.", "feature": "CSV export",
                "stage": "beta", "audiences": ["pilot_group_east", "pilot_group_west"],
                "citations": ["https://example.invalid/prs/41"], "unresolved_questions": [],
            }
            return {"status": "completed", "output": [{"type": "message", "role": "assistant",
                    "content": [{"type": "output_text", "text": json.dumps(draft)}]}]}

        draft = OpenAIDrafter("fake-key", "fictional-model", fake_transport).draft(
            self.evidence, "Export results", "The pilot groups have CSV export enabled."
        )
        self.assertEqual(draft["model"], "fictional-model")
        self.assertEqual(captured["text"]["format"]["type"], "json_schema")
        self.assertEqual(json.loads(captured["input"])["audiences"], ["pilot_group_east", "pilot_group_west"])

    def test_non_fictional_source_is_not_sent(self):
        evidence = Evidence.from_dict({**self.evidence.__dict__,
            "audiences": list(self.evidence.audiences),
            "pr_urls": ["https://private.example/pr/1"],
            "source_urls": list(self.evidence.source_urls)})
        calls = []
        with self.assertRaises(InputError):
            OpenAIDrafter("fake-key", "fictional-model", lambda *args: calls.append(args)).draft(
                evidence, "Task", "Source")
        self.assertEqual(calls, [])

    def test_unresolved_question_does_not_become_a_draft(self):
        def fake_transport(_payload, _key):
            return {"status": "completed", "output": [{"type": "message", "role": "assistant",
                    "content": [{"type": "output_text", "text": json.dumps({"unresolved_questions": ["Who can use it?"]})}]}]}

        with self.assertRaises(InputError):
            OpenAIDrafter("fake-key", "fictional-model", fake_transport).draft(
                self.evidence, "Task", "Source")


if __name__ == "__main__":
    unittest.main()
