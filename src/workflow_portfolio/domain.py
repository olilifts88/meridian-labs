"""Small, explicit contracts between evidence, generation, and publication."""

from dataclasses import dataclass
from typing import Any, Dict, FrozenSet, Tuple


class InputError(ValueError):
    """Raised when a candidate is unsafe or incomplete to process."""


def _required_string(data: Dict[str, Any], key: str) -> str:
    value = data.get(key)
    if not isinstance(value, str) or not value.strip():
        raise InputError("Missing or invalid field: " + key)
    return value.strip()


def _string_tuple(data: Dict[str, Any], key: str) -> Tuple[str, ...]:
    value = data.get(key)
    if not isinstance(value, list) or not value or any(
        not isinstance(item, str) or not item.strip() for item in value
    ):
        raise InputError("Missing or invalid list: " + key)
    return tuple(item.strip() for item in value)


@dataclass(frozen=True)
class Evidence:
    change_id: str
    feature: str
    content_kind: str
    stage: str
    audiences: FrozenSet[str]
    pr_urls: Tuple[str, ...]
    source_urls: Tuple[str, ...]

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "Evidence":
        if not isinstance(data, dict):
            raise InputError("evidence must be an object")
        stage = _required_string(data, "stage")
        if stage not in {"beta", "ga"}:
            raise InputError("stage must be beta or ga")
        audiences = frozenset(_string_tuple(data, "audiences"))
        if stage == "ga" and audiences != {"all_customers"}:
            raise InputError("GA evidence must target all_customers")
        if stage == "beta" and "all_customers" in audiences:
            raise InputError("Beta evidence cannot target all_customers")
        content_kind = _required_string(data, "content_kind")
        if content_kind not in {"release_note", "guide_update", "new_guide"}:
            raise InputError("Invalid source content kind")
        return cls(
            change_id=_required_string(data, "change_id"),
            feature=_required_string(data, "feature"),
            content_kind=content_kind,
            stage=stage,
            audiences=audiences,
            pr_urls=_string_tuple(data, "pr_urls"),
            source_urls=_string_tuple(data, "source_urls"),
        )


@dataclass(frozen=True)
class Draft:
    kind: str
    headline: str
    body: str
    feature: str
    stage: str
    audiences: FrozenSet[str]
    citations: Tuple[str, ...]
    model: str

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "Draft":
        if not isinstance(data, dict):
            raise InputError("draft must be an object")
        kind = _required_string(data, "kind")
        if kind not in {"release_note", "guide_update", "new_guide"}:
            raise InputError("Invalid content kind")
        return cls(
            kind=kind,
            headline=_required_string(data, "headline"),
            body=_required_string(data, "body"),
            feature=_required_string(data, "feature"),
            stage=_required_string(data, "stage"),
            audiences=frozenset(_string_tuple(data, "audiences")),
            citations=_string_tuple(data, "citations"),
            model=_required_string(data, "model"),
        )


@dataclass(frozen=True)
class Finding:
    code: str
    message: str


def check_candidate(evidence: Evidence, draft: Draft) -> Tuple[Finding, ...]:
    """Fail closed on facts that can be checked without asking an LLM."""
    findings = []
    if draft.feature != evidence.feature:
        findings.append(Finding("feature_mismatch", "Draft feature differs from source"))
    if draft.kind != evidence.content_kind:
        findings.append(Finding("content_kind_mismatch", "Draft content kind differs from source"))
    if draft.stage != evidence.stage:
        findings.append(Finding("stage_mismatch", "Draft release stage differs from source"))
    if draft.audiences != evidence.audiences:
        findings.append(Finding("audience_mismatch", "Draft audience differs from confirmed rollout"))
    allowed = set(evidence.pr_urls) | set(evidence.source_urls)
    if not set(draft.citations).issubset(allowed):
        findings.append(Finding("unsupported_citation", "Draft cites an unknown source"))
    if not set(evidence.pr_urls).intersection(draft.citations):
        findings.append(Finding("missing_pr_evidence", "Draft needs a source PR citation"))
    return tuple(findings)
