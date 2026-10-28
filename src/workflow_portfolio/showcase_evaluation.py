"""Repeatable behavioural scenarios and corrupted-output evaluation probes."""
import copy
import json
from .showcase import FIXTURES, load_json, run, knowledge_sources
from .showcase_assurance import evaluate_output


CASES = [
    ('release-default','release-notes',{},'awaiting_model_review'),
    ('release-wrong-audience','release-notes',{'audience':'all-customers'},'blocked'),
    ('release-prose-overclaim','release-notes',{'draft_body':'Available to all customers.'},'blocked'),
    ('release-no-source','release-notes',{'disabled_sources':['product-change']},'needs_evidence'),
    ('vulnerability-default','vulnerabilities',{},'findings_need_review'),
    ('vulnerability-feed-down','vulnerabilities',{'feed_unavailable':True},'incomplete'),
    ('vulnerability-no-policy','vulnerabilities',{'disabled_sources':['remediation-policy']},'incomplete'),
    ('questionnaire-default','questionnaire',{},'review_required'),
    ('questionnaire-no-policy','questionnaire',{'disabled_sources':['security-policy']},'review_required'),
    ('soc2-default','soc2',{},'review_required'),
    ('soc2-no-register','soc2',{'disabled_sources':['soc2-evidence-register']},'review_required'),
]


def crm_regression_cases():
    """Exercise the existing CRM engine and evaluator in the shared runner."""
    from .call_crm import load_fixture, simulate, evaluate
    rows = []

    def scenario(name, result, observed, expected):
        rows.append({'case': name, 'workflow': 'call-crm', 'kind': 'workflow_scenario',
                     'passed': observed == expected and result['evaluation']['status'] == 'passed',
                     'observed_status': observed, 'expected_status': expected})

    first, repeated, full = simulate(through=1), simulate(through=3), simulate()
    scenario('crm-supported-stage-change', first,
             first['deals'][0]['stage'] + '; ' + first['issues'][0]['priority'], 'Pilot; Medium')
    scenario('crm-repeat-account-does-not-inflate-priority', repeated,
             str(repeated['issues'][0]['distinct_accounts']) + ' accounts; ' + repeated['issues'][0]['priority'],
             '2 accounts; Medium')
    scenario('crm-cumulative-priority', full,
             str(full['issues'][0]['distinct_accounts']) + ' accounts; ' + full['issues'][0]['priority'],
             '3 accounts; High')
    fixture = load_fixture()
    fixture['calls'].append(copy.deepcopy(fixture['calls'][0]))
    duplicate = simulate(fixture, through=5)
    scenario('crm-duplicate-call', duplicate,
             str(duplicate['issues'][0]['unique_calls']) + ' calls; ' + str(len(duplicate['actions'])) + ' actions',
             '4 calls; 3 actions')
    fixture = load_fixture()
    fixture['calls'][0]['facts'][0]['quote'] = 'Unsupported customer decision'
    missing = simulate(fixture)
    scenario('crm-unsupported-stage-evidence-held', missing, missing['deals'][0]['stage'], 'Qualified')
    pending = [a for a in full['actions'] if a['state'] == 'pending']
    rejected = simulate(decisions=[{'id': pending[0]['id'], 'revision': pending[0]['revision'],
                                   'verdict': 'reject', 'reason': 'Procurement has not confirmed the amount'}])
    scenario('crm-selective-rejection-retains-feedback', rejected,
             str(rejected['deals'][2]['annual_value_gbp']) + '; ' + rejected['actions'][1]['state']
             + '; ' + rejected['actions'][2]['state'] + '; ' + str(bool(rejected['actions'][1]['feedback'])),
             '24000; rejected; pending; True')
    approved = simulate(decisions=[{'id': a['id'], 'revision': a['revision'], 'verdict': 'approve'} for a in pending])
    scenario('crm-bulk-approval', approved,
             str(approved['deals'][2]['annual_value_gbp']) + '; '
             + str('uncommitted' in approved['deals'][2].get('delivery_note', '')), '32000; True')
    try:
        simulate(decisions=[{'id': pending[0]['id'], 'revision': 'stale', 'verdict': 'approve'}])
        observed = 'stale_review_accepted'
    except ValueError as error:
        observed = 'stale_review_rejected' if 'Stale proposal' in str(error) else 'unexpected_rejection'
    scenario('crm-stale-approval-rejected', full, observed, 'stale_review_rejected')

    probes = [
        ('crm-forged-quote', lambda r: r['actions'][0].update(quote='Invented customer decision')),
        ('crm-unapproved-price', lambda r: r['deals'][2].update(annual_value_gbp=32000)),
        ('crm-dropped-engineering-signal', lambda r: r.update(issues=[])),
        ('crm-unjustified-urgent-priority', lambda r: r['issues'][0].update(priority='Urgent')),
        ('crm-wrong-evidence-account', lambda r: r['issues'][0]['evidence'][0].update(account='a3')),
        ('crm-false-delivery-claim', lambda r: r['execution'].update(external_writes=True)),
        ('crm-unsupported-proposed-amount', lambda r: r['actions'][1].update(after=99999)),
    ]
    for name, corrupt in probes:
        result = copy.deepcopy(full)
        corrupt(result)
        assessment = evaluate(result, load_fixture())
        rows.append({'case': name, 'workflow': 'call-crm', 'kind': 'corrupted_output_probe',
                     'passed': assessment['status'] == 'failed',
                     'detected_checks': [c['name'] for c in assessment['checks'] if not c['passed']]})
    return rows


def evaluate_suite():
    rows = []
    for name, flow, options, expected in CASES:
        result = run(flow, dict(as_of='2026-10-26', **options))
        rows.append({'case':name,'workflow':flow,'kind':'workflow_scenario','passed':result['status']==expected and result['evaluation']['status']=='passed',
                     'observed_status':result['status'],'expected_status':expected})
    knowledge = load_json(FIXTURES/'knowledge.json')
    sources, _ = knowledge_sources(knowledge, '2026-10-26')
    # Each probe damages a real output; the evaluator must detect the fault.
    probes = [
        ('forged-citation','release-notes',lambda r:r['citations'][0].update(id='forged')),
        ('unblocked-audience','release-notes',lambda r:r['draft'].update(audiences=['all_customers'])),
        ('public-delivery-claim','release-notes',lambda r:r.update(published=True)),
        ('invented-answer','questionnaire',lambda r:r['answers'][0].update(answer='Data is never encrypted.')),
        ('unsupported-certification','questionnaire',lambda r:r['answers'][3].update(status='draft_for_review',answer='Yes, certified.')),
        ('dropped-question','questionnaire',lambda r:r['answers'].pop()),
        ('dropped-vulnerability','vulnerabilities',lambda r:r['findings'].pop()),
        ('wrong-remediation-owner','vulnerabilities',lambda r:r['findings'][0].update(owner='Nobody')),
        ('wrong-remediation-deadline','vulnerabilities',lambda r:r['findings'][0].update(due_on='2099-01-01')),
        ('unsupported-control-ready','soc2',lambda r:r['controls'][2].update(status='ready_for_reviewer')),
    ]
    for name, flow, corrupt in probes:
        result = copy.deepcopy(run(flow, {'as_of':'2026-10-26'}))
        corrupt(result)
        payload = None if flow=='release-notes' else load_json(FIXTURES/(flow+'.json'))
        assessment = evaluate_output(flow,result,sources,payload)
        rows.append({'case':name,'workflow':flow,'kind':'corrupted_output_probe','passed':assessment['status']=='failed',
                     'detected_checks':assessment['failed_checks']})
    rows.extend(crm_regression_cases())
    workflows = sorted({r['workflow'] for r in rows})
    return {'suite':'showcase-regression-v2','passed':sum(r['passed'] for r in rows),'attempted':len(rows),
            'workflows':workflows,
            'cases':rows,'scope':'Local deterministic scenarios and deliberate corruptions; no model benchmark or live-service test.'}


def main(argv=None):
    if argv:
        raise ValueError('evaluate takes no arguments')
    result = evaluate_suite()
    print(json.dumps(result,indent=2))
    return 0 if result['passed']==result['attempted'] else 1
