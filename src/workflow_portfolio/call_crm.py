"""Evidence-bound call/CRM simulator. No network, model calls or external writes."""
import copy
import datetime as dt
import hashlib
import json
from pathlib import Path

FIXTURE = Path(__file__).resolve().parents[2] / 'examples/showcase/calls.json'


def fingerprint(value):
    return hashlib.sha256(json.dumps(value, sort_keys=True).encode()).hexdigest()


def load_fixture():
    return json.loads(FIXTURE.read_text())


def valid_stage_evidence(quote):
    # Deliberately narrow fixture policy, not general language understanding.
    return all(text in quote for text in (
        'I approve a two-week pilot', 'dispatch team', 'starting 2 November',
        'I own the decision', '20% reduction in manual handoffs'))


def simulate(data=None, through=4, decisions=None):
    data = copy.deepcopy(data if data is not None else load_fixture())
    original = copy.deepcopy(data)
    if type(through) is not int or not 0 <= through <= len(data['calls']):
        raise ValueError('Choose a valid number of calls')
    if decisions is None:
        decisions = []
    if not isinstance(decisions, list) or len(decisions) > 20:
        raise ValueError('Use a list of at most 20 review decisions')
    deals = {d['id']: d for d in data['deals']}
    accounts = {a['id']: a for a in data['accounts']}
    sources, actions, issues, gaps, audit, seen = {}, [], {}, [], [], {}
    as_of = dt.date.fromisoformat(data['as_of'])

    def action(call, fact, field, proposed, mode):
        deal = deals[fact['deal']]
        if deal['account'] != call['account']:
            raise ValueError('Call and target deal belong to different accounts')
        before = deal.get(field)
        row = {'id': call['id'] + ':' + field, 'call': call['id'], 'deal': deal['id'],
               'field': field, 'before': before, 'after': proposed,
               'base_revision': deal['revision'], 'quote': fact['quote'],
               'state': 'applied' if mode == 'automatic' else 'pending',
               'mode': mode, 'policy': data['policy']['revision']}
        row['revision'] = fingerprint(row)
        actions.append(row)
        if mode == 'automatic':
            deal[field] = proposed
            deal['revision'] += 1
        return row

    for call in data['calls'][:through]:
        call_digest = fingerprint(call)
        if call['id'] in seen:
            if seen[call['id']] != call_digest:
                raise ValueError('Conflicting copies of one call ID')
            audit.append({'call': call['id'], 'state': 'duplicate_skipped'})
            continue
        seen[call['id']] = call_digest
        if call['account'] not in accounts:
            raise ValueError('Unknown account')
        day = dt.datetime.fromisoformat(call['date']).date()
        if day > as_of:
            audit.append({'call': call['id'], 'state': 'future_call_held'})
            continue
        sources[call['id']] = call
        for fact in call['facts']:
            quote = fact.get('quote', '')
            if not quote or quote not in call['transcript']:
                audit.append({'call': call['id'], 'state': 'unsupported_fact_held'})
                continue
            kind = fact['kind']
            if kind == 'stage':
                deal = deals[fact['deal']]
                if (deal['stage'] == 'Qualified' and fact['value'] == 'Pilot'
                        and valid_stage_evidence(quote)):
                    action(call, fact, 'stage', 'Pilot', 'automatic')
                else:
                    audit.append({'call': call['id'], 'state': 'stage_criteria_not_met'})
            elif kind == 'bug':
                if fact['topic'] != 'export-large-reports':
                    audit.append({'call': call['id'], 'state': 'unknown_issue_needs_review'})
                    continue
                issue = issues.setdefault(fact['topic'], {
                    'id': 'SIM-101', 'title': 'CSV export fails above 10,000 rows',
                    'priority': 'Medium', 'team': 'Data platform', 'status': 'Triage',
                    'labels': ['bug', 'customer-signal', 'export'], 'evidence': [], 'history': []})
                if not any(e['call'] == call['id'] for e in issue['evidence']):
                    issue['evidence'].append({'call': call['id'], 'account': call['account'],
                                              'date': call['date'], 'quote': quote})
                window = [e for e in issue['evidence'] if
                          0 <= (day - dt.datetime.fromisoformat(e['date']).date()).days <= 6]
                n = len({e['account'] for e in window})
                prior = issue['priority']
                if n >= 3:
                    issue['priority'] = 'High'
                issue['history'].append({'call': call['id'], 'from': prior, 'to': issue['priority'],
                                          'accounts_in_window': n, 'reason':
                    'Three distinct accounts in seven days' if n >= 3 else 'Below three-account threshold'})
            elif kind == 'price':
                if type(fact.get('value')) is not int or fact['value'] <= 0:
                    audit.append({'call': call['id'], 'state': 'invalid_price_held'})
                    continue
                action(call, fact, 'annual_value_gbp', fact['value'], 'human_review')
            elif kind == 'delivery':
                action(call, fact, 'delivery_note', fact['value'], 'human_review')
            elif kind == 'knowledge_gap':
                gaps.append({'call': call['id'], 'quote': quote, 'topic': fact['topic'],
                             'state': 'proposed', 'suggestion':
                    'Ask Data platform to verify export limits, then draft a troubleshooting guide. '
                    'Customer reports alone do not establish the supported product limit.'})

    # Verify the whole review batch before applying it. Disjoint fields can be approved together.
    indexed = {a['id']: a for a in actions}
    chosen = set()
    for decision in decisions:
        if not isinstance(decision, dict):
            raise ValueError('Review decision must be an object')
        aid = decision.get('id')
        if aid in chosen:
            raise ValueError('Duplicate decision in a review batch')
        chosen.add(aid)
        row = indexed.get(aid)
        if not row or row['state'] != 'pending':
            raise ValueError('Review is not pending')
        if decision.get('revision') != row['revision']:
            raise ValueError('Stale proposal: reload evidence before review')
        if decision.get('verdict') not in ('approve', 'reject'):
            raise ValueError('Choose approve or reject')
        if decision['verdict'] == 'reject' and not decision.get('reason', '').strip():
            raise ValueError('Give a rejection reason')
        deal = deals[row['deal']]
        if deal['revision'] != row['base_revision'] or deal.get(row['field']) != row['before']:
            raise ValueError('CRM changed: regenerate the proposal')
    for decision in decisions:
        row = indexed[decision['id']]
        row['feedback'] = decision.get('reason', '')
        row['state'] = 'applied' if decision['verdict'] == 'approve' else 'rejected'
        if row['state'] == 'applied':
            deal = deals[row['deal']]
            deal[row['field']] = row['after']
            deal['revision'] += 1
            row['human_approved'] = True

    issue_list = list(issues.values())
    for issue in issue_list:
        issue['distinct_accounts'] = len({e['account'] for e in issue['evidence']})
        issue['unique_calls'] = len(issue['evidence'])
    result = {'company': data['company'], 'as_of': data['as_of'],
              'accounts': list(accounts.values()), 'contacts': data['contacts'],
              'deals': list(deals.values()), 'calls': list(sources.values()),
              'actions': actions, 'issues': issue_list, 'knowledge_gaps': gaps,
              'audit': audit, 'policy': data['policy'],
              'execution': {'mode': 'offline_fixture', 'model_called': False,
                            'external_writes': False, 'delivery': 'simulated',
                            'extraction': 'authored candidates validated against transcript spans'}}
    result['evaluation'] = evaluate(result, original)
    from .evals import evaluation_record
    result['evaluation_record'] = evaluation_record('call-crm', original, result,
                                                   result['evaluation'], 'call-crm-checks-v1')
    return result


def evaluate(result, fixture):
    """Independent checks against frozen evidence, not a model self-score."""
    source = {c['id']: c for c in fixture['calls']}
    baseline = {d['id']: d for d in fixture['deals']}
    checks = []

    def check(name, passed):
        checks.append({'name': name, 'passed': bool(passed)})

    evidence = result['actions'] + [e for i in result['issues'] for e in i['evidence']] + result['knowledge_gaps']
    check('Every evidence excerpt exists in its call', all(
        e.get('call') in source and e.get('quote') and e['quote'] in source[e['call']]['transcript']
        for e in evidence))
    check('Action targets belong to the call account', all(
        a['deal'] in baseline and source.get(a['call'], {}).get('account') == baseline[a['deal']]['account']
        for a in result['actions']))
    check('Proposed values match the supplied extraction candidates', all(
        any(f.get('deal') == a['deal'] and f.get('value') == a['after'] and f['quote'] == a['quote']
            for f in source.get(a['call'], {}).get('facts', [])) for a in result['actions']))
    check('Engineering evidence retains its source account', all(
        e['account'] == source.get(e['call'], {}).get('account')
        for i in result['issues'] for e in i['evidence']))
    expected_bugs = {(c['id'], f['quote']) for c in result['calls'] for f in c['facts']
                     if f['kind'] == 'bug' and f.get('topic') == 'export-large-reports'
                     and f.get('quote') and f['quote'] in c['transcript']}
    observed_bugs = {(e['call'], e['quote']) for i in result['issues'] for e in i['evidence']}
    check('All supported engineering signals are retained', expected_bugs == observed_bugs)
    check('Automatic stage updates meet the explicit criteria', all(
        a['field'] != 'stage' or (a['before'] == 'Qualified' and a['after'] == 'Pilot'
        and valid_stage_evidence(a['quote'])) for a in result['actions'] if a['mode'] == 'automatic'))
    check('Commercial changes need human approval', all(
        a['state'] != 'applied' or a.get('human_approved') is True
        for a in result['actions'] if a['field'] in ('annual_value_gbp', 'delivery_note')))
    check('No duplicate issue keys or call evidence',
          len({i['id'] for i in result['issues']}) == len(result['issues']) and all(
              len({e['call'] for e in i['evidence']}) == len(i['evidence']) for i in result['issues']))
    priority_ok = True
    for issue in result['issues']:
        for h in issue['history']:
            if h['to'] == 'High' and h['from'] != 'High':
                day = dt.datetime.fromisoformat(source[h['call']]['date']).date()
                n = len({e['account'] for e in issue['evidence'] if
                         0 <= (day - dt.datetime.fromisoformat(e['date']).date()).days <= 6})
                priority_ok &= n >= 3
        priority_ok &= issue['priority'] != 'Urgent'
        priority_ok &= issue['priority'] == (issue['history'][-1]['to'] if issue['history'] else 'Medium')
        priority_ok &= issue['distinct_accounts'] == len({e['account'] for e in issue['evidence']})
        priority_ok &= issue['unique_calls'] == len({e['call'] for e in issue['evidence']})
    check('Priority rises only with distinct corroboration', priority_ok)
    expected = copy.deepcopy(baseline)
    for a in result['actions']:
        if a['state'] == 'applied':
            expected[a['deal']][a['field']] = a['after']
            expected[a['deal']]['revision'] += 1
    check('CRM values match applied actions only', result['deals'] == list(expected.values()))
    check('Simulation does not claim model calls or external delivery',
          result['execution']['external_writes'] is False and result['execution']['model_called'] is False
          and result['execution']['delivery'] == 'simulated')
    return {'status': 'passed' if all(c['passed'] for c in checks) else 'failed',
            'passed': sum(c['passed'] for c in checks), 'attempted': len(checks),
            'checks': checks, 'scope': 'Deterministic evidence and policy checks; not model quality or live delivery.'}
