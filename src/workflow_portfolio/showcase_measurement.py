"""Versioned API-equivalent valuation and offline workflow routing. No inference imports."""
import copy
import hashlib
import json
import re
from decimal import Decimal

RATE_CARD = {
    'version': 'openai-standard-short-2026-10-28', 'currency': 'USD',
    'checked_on': '2026-10-28', 'source': 'https://developers.openai.com/api/docs/pricing',
    'basis': 'Standard API text-token rates, short context; requested model. Not a subscription charge.',
    'per_million': {
        'gpt-6-luna': {'input': '0.10', 'cached_input': '0.01', 'output': '0.50'},
        'gpt-6.1-sol': {'input': '2.00', 'cached_input': '0.10', 'output': '10.00'},
    },
}
ROUTING_POLICY = {
    'version': 'showcase-routing-v1',
    'source': 'Meridian showcase policy; explicit code rules, not a change to personal Notion skill routes.',
    'routes': {'Low': {'model': 'gpt-6-luna', 'effort': 'medium'},
               'Medium': {'model': 'gpt-6.1-sol', 'effort': 'medium'},
               'High': {'model': 'gpt-6.1-sol', 'effort': 'medium'}},
    'effort_note': 'Task tier and reasoning effort are separate. Medium effort matches the available recorded pilot candidates.',
    'rules': ['missing-evidence-hold', 'unsupported-workflow-hold', 'vulnerability-no-match-code',
              'soc2-follow-up-code', 'questionnaire-gap-hold', 'call-commercial-uncertainty',
              'call-multiple-signals', 'release-scope-review', 'routine-draft'],
}

def digest(value):
    return hashlib.sha256(json.dumps(value, sort_keys=True, separators=(',', ':')).encode()).hexdigest()


def estimate_cost(record):
    base = {'kind': 'estimated_api_equivalent', 'currency': 'USD', 'rate_card': copy.deepcopy(RATE_CARD),
            'model_basis': record.get('requested_model'), 'actual_charge': None}
    from .usage.token_cost import estimate
    usage = record.get('usage')
    if not isinstance(usage, dict):
        return dict(base, amount=None, reason='Missing token usage')
    if type(usage.get('input_tokens')) is int and usage['input_tokens'] > 272000:
        return dict(base, amount=None, reason='Outside the short-context rate-card scope')
    row = {**usage, 'recorded_model': record.get('requested_model')}
    if type(row.get('input_tokens')) is int and type(row.get('output_tokens')) is int:
        row['total_tokens'] = row['input_tokens'] + row['output_tokens']
    card = {'id': RATE_CARD['version'], 'verified_on': RATE_CARD['checked_on'], 'basis': RATE_CARD['basis'],
            'long_context_threshold': 272000,
            'models': {m: {'input': r['input'], 'cached': r['cached_input'], 'output': r['output']}
                       for m, r in RATE_CARD['per_million'].items()}}
    amount, reason = estimate(row, card)
    if amount is None:
        return dict(base, amount=None, reason=reason)
    counts = {'input': usage['input_tokens'] - usage['cached_input_tokens'],
              'cached_input': usage['cached_input_tokens'], 'output': usage['output_tokens']}
    rates = RATE_CARD['per_million'][record['requested_model']]
    components = {k: Decimal(v) * Decimal(rates[k]) / Decimal(1000000) for k, v in counts.items()}
    return dict(base, amount=float(amount), token_counts=counts,
                components={k: float(v) for k, v in components.items()}, reason=None)



def route_case(case):
    """Decide from source inputs only. Never inspect answers, labels, baseline or case ID."""
    flow = case.get('workflow')
    base = {'policy_version': ROUTING_POLICY['version'], 'policy_digest': digest(ROUTING_POLICY),
            'execution_status': 'not_dispatched', 'model_calls': 0, 'model': None, 'effort': None,
            'tier': None, 'instruction_style': 'guided', 'scope': 'Offline policy preview; not the route used for the original AI call.'}
    def result(rule, reason, tier=None, action='hold'):
        decision = {}
        if tier:
            from .routing.router import select_route
            task = {'Low': 'showcase_bounded_draft', 'Medium': 'showcase_contextual_draft',
                    'High': 'showcase_uncertain_commercial'}[tier]
            policy = {'schema_version': 1, 'revision': ROUTING_POLICY['version'], 'skills': {
                'analysis': {'active': True, 'version': ROUTING_POLICY['version'], 'routes': {
                    t: dict(r, enabled=True) for t, r in ROUTING_POLICY['routes'].items()}}}}
            chosen = select_route({'task_kind': task, 'requires_write': False, 'text': reason}, policy,
                                  {'gpt-6-luna': ['medium'], 'gpt-6.1-sol': ['medium']})
            decision = {'model': chosen.model, 'effort': chosen.effort,
                        'dispatch_policy_digest': chosen.policy_digest}
        return dict(base, rule=rule, reason=reason, action=action, tier=tier, **decision)
    if flow not in ('release-notes', 'vulnerabilities', 'questionnaire', 'soc2', 'call-crm'):
        return result('unsupported-workflow-hold', 'This workflow needs an explicit routing rule.')
    if flow == 'call-crm':
        calls = case.get('fixture', {}).get('calls', [])
        text = ' '.join(c.get('transcript', '') for c in calls)
        if not text.strip():
            return result('missing-evidence-hold', 'A call transcript is needed before choosing a model.')
        if re.search(r'\b(might|tentative|not approved|once finance)\b', text, re.I):
            return result('call-commercial-uncertainty', 'Tentative commercial language needs careful interpretation; pricing still requires human approval.', 'High', 'model')
        if len(calls) > 1 or re.search(r'\b(fails|blocks|bug)\b', text, re.I):
            return result('call-multiple-signals', 'Separate customer intent from engineering signals and preserve the supporting quotes.', 'Medium', 'model')
        return result('routine-draft', 'Extract a straightforward call with the smaller model; check every proposed action.', 'Low', 'model')
    sources = case.get('sources')
    if not isinstance(sources, dict) or not sources:
        return result('missing-evidence-hold', 'Approved source evidence is needed first.')
    # Reuse domain code to inspect the supplied evidence, not the pilot reference answer.
    from .showcase import run
    try:
        checked = run(flow, {'as_of': case['as_of']}, {'fictional': True, 'sources': list(sources.values())}, case.get('payload'))
    except (ValueError, KeyError, TypeError):
        return result('missing-evidence-hold', 'The supplied evidence could not pass the workflow preflight.')
    if checked.get('excluded_sources') or checked.get('status') == 'needs_evidence':
        return result('missing-evidence-hold', 'A required source is unapproved, stale or unavailable.')
    if flow == 'questionnaire' and checked.get('evidence_gaps', 0):
        return result('questionnaire-gap-hold', 'The policy evidence does not support an answer. Ask for evidence rather than a bigger model.')
    if flow == 'soc2' and checked.get('controls_needing_follow_up', 0):
        return result('soc2-follow-up-code', 'Date/owner/approval checks already identify follow-up work. No model is needed to establish it.', action='code')
    if flow == 'vulnerabilities' and checked.get('status') == 'no_matches_in_supplied_snapshot':
        return result('vulnerability-no-match-code', 'Version matching finds no affected package in this snapshot. Return the scoped code result.', action='code')
    if flow == 'release-notes':
        change = sources.get('product-change', {}).get('content', {})
        if change.get('stage') != 'ga':
            return result('release-scope-review', 'Restricted rollout needs careful wording so pilot availability is not presented as a full release.', 'Medium', 'model')
    return result('routine-draft', 'The supplied evidence supports a bounded draft. Start with the smaller model and keep workflow checks.', 'Low', 'model')


def enrich(record, case):
    row = copy.deepcopy(record)
    row['estimated_cost'] = estimate_cost(row)
    row['routing_preview'] = route_case(case)
    row['recorded_route'] = {'model': row['requested_model'], 'effort': row['requested_effort'],
        'tier': 'Medium', 'reason': 'Fixed experiment setup: compare_saved_evidence',
        'configuration': row['configuration'], 'status': 'recorded_generation',
        'policy_source': 'Four preselected model/instruction combinations; no adaptive choice.'}
    return row


def routing_summary(cases, records):
    rows = []
    for case in cases:
        route = route_case(case)
        selected = next((r for r in records if r['case_id'] == case['id'] and
                         r['requested_model'] == route['model'] and r['configuration'].endswith('guided')), None)
        rows.append({'case_id': case['id'], 'workflow': case['workflow'], 'title': case['title'],
                     'route': route, 'matched_record_id': selected['id'] if selected else None,
                     'matched_revised_outcome': (selected.get('revised_checks') or selected['original_checks'])['outcome'] if selected else None,
                     'estimated_cost': estimate_cost(selected) if selected else None})
    return {'policy': copy.deepcopy(ROUTING_POLICY), 'cases': rows,
            'scope': 'Exploratory replay of a policy defined after the pilot. No new inference, no proven routing savings.',
            'model_calls': 0}
