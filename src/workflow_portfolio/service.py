"""Publication policy is independent of model generation."""

from dataclasses import dataclass
import json
from typing import Any, Dict, Tuple

from .domain import Draft, Evidence, Finding, InputError, check_candidate
from .store import Store, fingerprint


@dataclass(frozen=True)
class Decision:
    record_id: str
    state: str
    findings: Tuple[Finding, ...]
    duplicate: bool = False


def submit(payload: Dict[str, Any], store: Store) -> Decision:
    if not isinstance(payload, dict):
        raise InputError("Candidate must be an object")
    evidence = Evidence.from_dict(payload.get("evidence"))
    draft = Draft.from_dict(payload.get("draft"))
    record_id = fingerprint(evidence)
    existing = store.get(record_id)
    if store.conflicting_pr(evidence.pr_urls, record_id):
        raise InputError("Source PR link belongs to another change")
    if existing:
        saved_evidence = json.loads(existing["evidence_json"])
        saved_draft = json.loads(existing["draft_json"])
        if Evidence.from_dict(saved_evidence) == evidence and Draft.from_dict(saved_draft) == draft:
            return Decision(record_id, existing["state"], (), duplicate=True)
    findings = check_candidate(evidence, draft)
    state = "blocked" if findings else (
        "review_required" if evidence.content_kind == "new_guide" else "ready_to_publish"
    )
    if existing:
        store.revise(evidence, draft, state, [finding.code for finding in findings])
    else:
        store.add(evidence, draft, state, [finding.code for finding in findings])
    return Decision(record_id, state, findings)


def review(record_id: str, reviewer: str, approve: bool, store: Store) -> str:
    if not reviewer.strip():
        raise InputError("Reviewer identity is required")
    record = store.get(record_id)
    if not record or record["state"] != "review_required":
        raise InputError("Only a pending new guide can be reviewed")
    state = "ready_to_publish" if approve else "rejected"
    store.transition(record_id, state, reviewer.strip(), "engineer review")
    return state
