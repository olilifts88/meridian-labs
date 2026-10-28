"""Saved-case evaluation and like-for-like benchmark reports."""

from collections import Counter
from typing import Any, Dict, List

from .domain import Draft, Evidence, InputError, check_candidate


CONTRACT_VERSION = 'workflow-evaluation-v1'


def digest(value):
    import hashlib
    import json
    return hashlib.sha256(json.dumps(value, sort_keys=True).encode()).hexdigest()


def evaluation_record(workflow, inputs, output, assessment, rubric):
    """One envelope for domain-specific checks. No human verdict or invented usage."""
    checks = [{'criterion': c.get('id', c.get('name')),
               'verdict': 'Pass' if c.get('status') == 'pass' or c.get('passed') is True else 'Needs improvement'}
              for c in assessment['checks']]
    return {'contract': CONTRACT_VERSION, 'workflow': workflow, 'rubric': rubric,
            'input_digest': digest(inputs), 'output_digest': digest(output),
            'outcome': 'Pass' if checks and all(c['verdict'] == 'Pass' for c in checks) else 'Needs improvement',
            'criteria': checks, 'human_verdict': None,
            'usage_coverage': 'Unavailable', 'task_tokens': None, 'task_cost': None,
            'boundary': 'Explicit checks only; passing does not approve or deliver an output.'}


def frozen_workflow_cases():
    """Reuse the existing producers and source snapshots across all five workflows."""
    from .showcase import FIXTURES, load_json, run, knowledge_sources
    from .call_crm import load_fixture, simulate
    knowledge = load_json(FIXTURES / 'knowledge.json')
    sources, _ = knowledge_sources(knowledge, '2026-10-26')
    cases = []
    for workflow in ('release-notes', 'vulnerabilities', 'questionnaire', 'soc2'):
        payload = None if workflow == 'release-notes' else load_json(FIXTURES / (workflow + '.json'))
        output = run(workflow, {'as_of': '2026-10-26'}, knowledge, payload)
        cases.append({'id': workflow + ':default', 'workflow': workflow,
                      'inputs': {'sources': sources, 'payload': payload}, 'reference_output': output})
    fixture = load_fixture()
    cases.append({'id': 'call-crm:four-calls', 'workflow': 'call-crm',
                  'inputs': {'fixture': fixture, 'through': 4}, 'reference_output': simulate(fixture)})
    bundle = {'contract': CONTRACT_VERSION, 'scope': 'Fictional offline reference cases; not held-out model calibration.',
              'rubrics': {'showcase': 'showcase-checks-v1', 'call-crm': 'call-crm-checks-v1'}, 'cases': cases}
    bundle['dataset_digest'] = digest(bundle)
    return bundle


def candidate_from_reference(bundle, label='reference-fixture', corrupt=False):
    import copy
    rows = [{'case_id': c['id'], 'output': copy.deepcopy(c['reference_output'])} for c in bundle['cases']]
    if corrupt:
        for row in rows:
            output = row['output']
            if row['case_id'].startswith('call-crm:'):
                output['deals'][2]['annual_value_gbp'] = 32000
            else:
                output['external_writes'] = True
    return {'candidate': label, 'dataset_digest': bundle['dataset_digest'], 'responses': rows,
            'provenance': 'Synthetic saved outputs, not model executions.'}


def compare_workflow_candidates(bundle, candidates):
    """Matched saved-output comparison using the original workflow evaluators."""
    from .showcase_assurance import evaluate_output, VERSION
    from .call_crm import evaluate as evaluate_calls
    import time
    expected_digest = bundle.get('dataset_digest')
    if expected_digest != digest({k: v for k, v in bundle.items() if k != 'dataset_digest'}):
        raise InputError('Frozen dataset digest does not match its contents')
    if bundle.get('contract') != CONTRACT_VERSION:
        raise InputError('Unsupported evaluation contract')
    if bundle.get('rubrics') != {'showcase': VERSION, 'call-crm': 'call-crm-checks-v1'}:
        raise InputError('Frozen rubric version does not match the evaluator')
    cases = bundle['cases']
    ids = {c['id'] for c in cases}
    if not cases or len(ids) != len(cases):
        raise InputError('Frozen case IDs must be nonempty and unique')
    if not candidates or len({c['candidate'] for c in candidates}) != len(candidates):
        raise InputError('Candidate labels must be nonempty and unique')
    reports = []
    for candidate in candidates:
        if candidate['dataset_digest'] != expected_digest:
            raise InputError('Candidates must use the identical frozen dataset')
        rows = candidate['responses']
        if len(rows) != len(ids) or {r['case_id'] for r in rows} != ids:
            raise InputError('Every candidate must supply exactly the same cases')
        outputs = {r['case_id']: r['output'] for r in rows}
        outcomes = []
        started = time.perf_counter()
        for case in cases:
            output, inputs = outputs[case['id']], case['inputs']
            try:
                if case['workflow'] == 'call-crm':
                    assessment = evaluate_calls(output, inputs['fixture'])
                else:
                    assessment = evaluate_output(case['workflow'], output, inputs['sources'], inputs['payload'])
                record = evaluation_record(case['workflow'], inputs, output, assessment,
                    bundle['rubrics']['call-crm' if case['workflow'] == 'call-crm' else 'showcase'])
            except (KeyError, TypeError, ValueError, AttributeError, IndexError) as error:
                record = {'outcome': 'Needs improvement', 'criteria': [],
                          'error': 'Malformed output: ' + type(error).__name__, 'human_verdict': None}
            outcomes.append(dict(case_id=case['id'], **record))
        passed = sum(r['outcome'] == 'Pass' for r in outcomes)
        reports.append({'candidate': candidate['candidate'], 'successful': passed, 'attempted': len(cases),
                        'case_results': outcomes, 'evaluator_duration_ms': round((time.perf_counter()-started)*1000, 3),
                        'candidate_latency_ms': None, 'tokens_per_success': None, 'cost_per_success': None,
                        'usage_coverage': 'Unavailable', 'cost_coverage': 'Unavailable',
                        'all_in_pilot_cost': None, 'evaluation_overhead_cost': None,
                        'measurement_note': 'Saved outputs carry no bound whole-task usage or latency. '
                          'Reuse usage.measure_run and usage.token_cost with independently bound receipts; never infer zero.'})
    baseline = reports[0]
    for report in reports:
        report['baseline'] = baseline['candidate']
        report['success_delta'] = report['successful'] - baseline['successful']
        report['cost_net_change'] = None
    return {'contract': CONTRACT_VERSION, 'dataset_digest': expected_digest, 'candidates': reports,
            'scope': bundle['scope'], 'human_calibration': 'Unverified',
            'note': 'Criterion failures are retained individually. No automatic approval, model winner or savings claim.'}


def benchmark_main(argv=None):
    import argparse
    import json
    from pathlib import Path
    parser = argparse.ArgumentParser(description='Compare saved workflow outputs on frozen inputs; no model calls or writes to services.')
    parser.add_argument('--freeze', type=Path, help='Write a new directory containing dataset and example candidates')
    parser.add_argument('--dataset', type=Path)
    parser.add_argument('--candidate', type=Path, action='append')
    args = parser.parse_args(argv)
    if bool(args.dataset) != bool(args.candidate):
        parser.error('--dataset and --candidate must be supplied together')
    if args.freeze and args.dataset:
        parser.error('Freeze a new dataset or compare saved candidates, not both')
    bundle = json.loads(args.dataset.read_text()) if args.dataset else frozen_workflow_cases()
    candidates = ([json.loads(p.read_text()) for p in args.candidate] if args.candidate else [
        candidate_from_reference(bundle), candidate_from_reference(bundle, 'deliberately-corrupted-fixture', corrupt=True)])
    report = compare_workflow_candidates(bundle, candidates)
    if args.freeze:
        args.freeze.mkdir(parents=True, exist_ok=False)
        for name, value in [('dataset.json', bundle), ('reference.json', candidates[0]),
                            ('corrupted.json', candidates[1]), ('report.json', report)]:
            (args.freeze / name).write_text(json.dumps(value, indent=2) + '\n')
    print(json.dumps(report, indent=2))
    return 0


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
