"""Saved-case evaluation and like-for-like benchmark reports."""

from collections import Counter
from typing import Any, Dict, List

from .domain import Draft, Evidence, InputError, check_candidate


def evaluate_cases(cases: List[Dict[str, Any]]) -> Dict[str, Any]:
    if not isinstance(cases, list) or not cases:
        raise InputError("Benchmark needs at least one saved case")
    by_model: Dict[str, Dict[str, Any]] = {}
    expected_models = None
    seen_case_ids = set()
    for case in cases:
        case_id = case.get("case_id")
        if not isinstance(case_id, str) or not case_id.strip() or case_id in seen_case_ids:
            raise InputError("Case IDs must be present and unique")
        seen_case_ids.add(case_id)
        evidence = Evidence.from_dict(case["evidence"])
        responses = case.get("responses")
        if not isinstance(responses, list) or not responses:
            raise InputError("Each case needs model responses")
        models_in_case = set()
        for response in responses:
            draft = Draft.from_dict(response["draft"])
            if draft.model in models_in_case:
                raise InputError("Each model may answer a case only once")
            models_in_case.add(draft.model)
            findings = check_candidate(evidence, draft)
            # A documented, human-approved phrase is a simple offline stand-in
            # for semantic judgement. It does not claim to be an LLM judge.
            required_phrases = case.get("required_phrases", [])
            missing = [p for p in required_phrases if p.lower() not in draft.body.lower()]
            failures = [f.code for f in findings]
            failures += ["missing_expected_content"] if missing else []
            slot = by_model.setdefault(
                draft.model,
                {"cases": 0, "passed": 0, "tokens": 0, "token_cases": 0,
                 "failures": Counter(), "case_results": []},
            )
            slot["cases"] += 1
            slot["passed"] += int(not failures)
            tokens = response.get("tokens")
            if tokens is not None:
                if isinstance(tokens, bool) or not isinstance(tokens, int) or tokens < 0:
                    raise InputError("Tokens must be a non-negative integer when known")
                slot["tokens"] += tokens
                slot["token_cases"] += 1
            slot["failures"].update(failures)
            slot["case_results"].append(
                {"case_id": case_id, "passed": not failures, "failures": failures,
                 "tokens": tokens}
            )
        if expected_models is None:
            expected_models = models_in_case
        elif models_in_case != expected_models:
            raise InputError("Every model must answer the same saved cases")
    return {
        model: {
            "cases": values["cases"],
            "passed": values["passed"],
            "pass_rate": round(values["passed"] / values["cases"], 3),
            "tokens": values["tokens"] if values["token_cases"] == values["cases"] else None,
            "token_coverage": f"{values['token_cases']}/{values['cases']}",
            "failures": dict(values["failures"]),
            "case_results": values["case_results"],
        }
        for model, values in sorted(by_model.items())
    }
