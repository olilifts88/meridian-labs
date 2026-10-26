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


def evaluate_suite():
    rows = []
    for name, flow, options, expected in CASES:
        result = run(flow, dict(as_of='2026-10-26', **options))
        rows.append({'case':name,'kind':'workflow_scenario','passed':result['status']==expected and result['evaluation']['status']=='passed',
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
        rows.append({'case':name,'kind':'corrupted_output_probe','passed':assessment['status']=='failed',
                     'detected_checks':assessment['failed_checks']})
    return {'suite':'showcase-regression-v1','passed':sum(r['passed'] for r in rows),'attempted':len(rows),
            'cases':rows,'scope':'Local deterministic scenarios and deliberate corruptions; no model benchmark or live-service test.'}


def main(argv=None):
    if argv:
        raise ValueError('evaluate takes no arguments')
    result = evaluate_suite()
    print(json.dumps(result,indent=2))
    return 0 if result['passed']==result['attempted'] else 1
