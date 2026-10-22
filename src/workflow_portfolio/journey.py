"""Connect a fictional product-change report to release-note policy decisions."""

from typing import Any, Dict, List

from .domain import Evidence, InputError
from .service import submit
from .store import Store


def evidence_from_report(report: Dict[str, Any]) -> Evidence:
    if not isinstance(report, dict) or report.get("source") != "meridian-labs-example":
        raise InputError("Unexpected change-report source")
    candidates = report.get("candidates")
    if not isinstance(candidates, list) or len(candidates) != 1:
        raise InputError("This bounded example expects one product change")
    candidate = candidates[0]
    if not isinstance(candidate, dict) or not isinstance(candidate.get("availability"), dict):
        raise InputError("Change is missing confirmed availability")
    availability = candidate["availability"]
    stage = availability.get("stage")
    cohorts = availability.get("cohorts")
    if stage == "ga" and cohorts != []:
        raise InputError("GA cannot name a limited cohort")
    if stage == "beta" and (not isinstance(cohorts, list) or not cohorts):
        raise InputError("Beta needs named pilot cohorts")
    return Evidence.from_dict({
        "change_id": candidate.get("feature_key"),
        "feature": candidate.get("title"),
        "content_kind": "release_note",
        "stage": stage,
        "audiences": ["all_customers"] if stage == "ga" else cohorts,
        "pr_urls": candidate.get("prs"),
        "source_urls": candidate.get("source_urls"),
    })


def run_journey(payload: Dict[str, Any], store: Store) -> List[Dict[str, Any]]:
    if not isinstance(payload, dict):
        raise InputError("Journey must be an object")
    evidence = evidence_from_report(payload.get("report"))
    drafts = payload.get("drafts")
    if not isinstance(drafts, list) or not 1 <= len(drafts) <= 5:
        raise InputError("Journey needs one to five proposed drafts")
    outcomes = []
    for index, draft in enumerate(drafts, start=1):
        decision = submit({
            "evidence": {
                "change_id": evidence.change_id,
                "feature": evidence.feature,
                "content_kind": evidence.content_kind,
                "stage": evidence.stage,
                "audiences": sorted(evidence.audiences),
                "pr_urls": list(evidence.pr_urls),
                "source_urls": list(evidence.source_urls),
            },
            "draft": draft,
        }, store)
        outcomes.append({
            "draft_number": index,
            "record_id": decision.record_id[:12],
            "state": decision.state,
            "findings": [finding.code for finding in decision.findings],
            "duplicate": decision.duplicate,
        })
    return outcomes
