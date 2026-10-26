"""Optional OpenAI drafting boundary for fictional release-note evidence.

The offline examples and CI never call this adapter. No model output controls
trusted rollout evidence, review policy, or publication.
"""

import json
from pathlib import Path
from typing import Any, Callable, Dict, Optional
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

from .domain import Draft, Evidence, InputError


ROOT = Path(__file__).resolve().parents[2]
SCHEMA = {
    "type": "object",
    "properties": {
        "kind": {"type": "string"},
        "headline": {"type": "string"},
        "body": {"type": "string"},
        "feature": {"type": "string"},
        "stage": {"type": "string"},
        "audiences": {"type": "array", "items": {"type": "string"}},
        "citations": {"type": "array", "items": {"type": "string"}},
        "unresolved_questions": {"type": "array", "items": {"type": "string"}},
    },
    "required": ["kind", "headline", "body", "feature", "stage", "audiences", "citations", "unresolved_questions"],
    "additionalProperties": False,
}


def _post_response(payload: Dict[str, Any], api_key: str) -> Dict[str, Any]:
    request = Request(
        "https://api.openai.com/v1/responses",
        data=json.dumps(payload).encode("utf-8"),
        headers={"Authorization": "Bearer " + api_key, "Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urlopen(request, timeout=30) as response:
            return json.load(response)
    except HTTPError as error:
        raise InputError("OpenAI request returned HTTP " + str(error.code)) from None
    except URLError:
        raise InputError("OpenAI request could not connect") from None


class OpenAIDrafter:
    def __init__(self, api_key: str, model: str, transport: Optional[Callable] = None) -> None:
        if not api_key or not model or not model.strip():
            raise InputError("An API key and explicit model are required for a live draft")
        self.api_key = api_key
        self.model = model.strip()
        self.transport = transport or _post_response

    def draft(self, evidence: Evidence, task_description: str, source_excerpt: str) -> Dict[str, Any]:
        # This demo must not silently send a real employer/customer document.
        urls = evidence.pr_urls + evidence.source_urls
        if any(not url.startswith("https://example.invalid/") for url in urls):
            raise InputError("Live drafting is limited to fictional example.invalid sources")
        if not task_description.strip() or not source_excerpt.strip():
            raise InputError("A task and source excerpt are required")
        if len(task_description) > 1000 or len(source_excerpt) > 5000:
            raise InputError("Demo task or source excerpt is too long")
        skill = (ROOT / "docs" / "workflow-guidance" / "release-note-drafting.md").read_text(encoding="utf-8")
        facts = {
            "change_id": evidence.change_id,
            "feature": evidence.feature,
            "content_kind": evidence.content_kind,
            "stage": evidence.stage,
            "audiences": sorted(evidence.audiences),
            "pr_urls": list(evidence.pr_urls),
            "source_urls": list(evidence.source_urls),
            "task_description": task_description,
            "source_excerpt": source_excerpt,
        }
        payload = {
            "model": self.model,
            "instructions": skill,
            "input": json.dumps(facts, sort_keys=True),
            "text": {"format": {"type": "json_schema", "name": "release_note_draft", "strict": True, "schema": SCHEMA}},
        }
        response = self.transport(payload, self.api_key)
        if response.get("status") != "completed":
            raise InputError("Model response was not completed")
        texts = [content.get("text") for item in response.get("output", [])
                 if item.get("type") == "message" and item.get("role") == "assistant"
                 for content in item.get("content", []) if content.get("type") == "output_text"]
        if len(texts) != 1 or not isinstance(texts[0], str):
            raise InputError("Model did not return one structured draft")
        try:
            draft = json.loads(texts[0])
        except json.JSONDecodeError:
            raise InputError("Model draft was not valid JSON") from None
        if not isinstance(draft, dict) or not isinstance(draft.get("unresolved_questions"), list):
            raise InputError("Model draft was missing review questions")
        if draft["unresolved_questions"]:
            raise InputError("Model identified unresolved source questions; review is required")
        draft.pop("unresolved_questions")
        draft["model"] = self.model
        Draft.from_dict(draft)
        return draft
