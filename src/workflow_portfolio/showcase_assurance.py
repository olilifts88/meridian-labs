"""Output checks against source evidence; routing plans never imply dispatch."""
import datetime as dt
import hashlib
import json
from collections import Counter
from dataclasses import asdict
from pathlib import Path

from .routing.execution import plan_execution
from .routing.router import select_route, trace

VERSION = 'showcase-checks-v1'
ROOT = Path(__file__).resolve().parents[2]


def review_request(flow, result):
    kind = ('review_release_output' if result.get('release_policy',{}).get('change_category','routine_update')=='routine_update'
            else 'review_new_release_output') if flow=='release-notes' else 'review_security_output'
    fields = ('flow','as_of','status','review_required','release_policy','draft','answers','findings','controls',
              'checked_packages','total_packages','period_start','period_end','evidence_snapshot','workflow_input')
    bundle = {key:result[key] for key in fields if key in result}
    return {'task_kind': kind,
            'requires_write': False,
            'text': 'Review this fictional workflow result. Identify unsupported claims and gaps. '
                    'Do not approve, publish or perform actions.\n' + json.dumps(bundle, sort_keys=True)}


def routing_plan(flow, result):
    policy = json.loads((ROOT / 'examples/routing/policy.json').read_text())
    capabilities = json.loads((ROOT / 'examples/routing/capabilities.json').read_text())
    decision = select_route(review_request(flow, result), policy, capabilities)
    execution = plan_execution(bounded=True, worker_available=False, prohibit_workers=True)
    return {'policy_revision': policy['revision'], 'policy_source': policy['source'],
            'workflow_execution': asdict(execution), 'model_review': trace(decision),
            'model_called': False, 'actual_backend': 'local_python',
            'reason': 'Structured rules execute locally. Optional language review is planned but not dispatched.',
            'configuration_note': 'Example model policy only; not an entitlement check or a measured best-model recommendation.'}


def evaluate_output(flow, result, sources, payload=None):
    """Validate emitted records against input/source facts, not the producer's summary."""
    checks = []
    def check(key, passed, detail):
        checks.append({'id': key, 'status': 'pass' if passed else 'fail', 'detail': detail})

    routine = flow=='release-notes' and result.get('release_policy',{}).get('change_category')=='routine_update'
    check('review_boundary', (result.get('review_required') is True or routine) and
          result.get('published') is False and result.get('external_writes') is False,
          'The workflow review policy is enforced; no external delivery is claimed.')
    citations = list(result.get('citations', []))
    for row in result.get('answers', []) + result.get('controls', []):
        citations.extend(row.get('citations', []))
    valid = all(isinstance(c, dict) and c.get('id') in sources and
                all(c.get(k) == sources[c['id']].get(k) for k in ('title','system','reviewed_on'))
                for c in citations)
    check('citation_provenance', valid, 'Every emitted citation matches an eligible source record.')
    if flow == 'release-notes':
        source, draft = sources.get('product-change'), result.get('draft')
        if source and draft:
            fact = source['content']
            correct_scope = set(draft.get('audiences', [])) <= set(fact['audiences'])
            correct_scope &= draft.get('stage') == fact['stage'] and draft.get('feature') == fact['feature']
            blocked = result.get('status') == 'blocked'
            check('release_scope', correct_scope or blocked,
                  'Audience, stage and feature must match evidence, or the draft must be blocked.')
            check('release_references', bool(draft.get('citations')) and
                  set(draft['citations']) <= set(fact['pr_urls']) and bool(citations),
                  'Draft references must resolve to the confirmed product evidence.')
            overclaim = fact['stage'] == 'beta' and any(x in draft.get('body','').lower()
                         for x in ('all customers','every customer','everyone'))
            check('release_overclaim_gate', not overclaim or blocked,
                  'The explicit beta audience overclaim must be held back.')
        else:
            check('missing_release_evidence', not draft and result.get('status') == 'needs_evidence',
                  'An unavailable release source must not produce a draft.')
    elif flow == 'questionnaire':
        questions = {q['id']: q for q in payload['questions']}
        answers = result.get('answers', [])
        check('question_coverage', Counter(a.get('id') for a in answers) == Counter(questions.keys()),
              'Exactly one output is required for each input question.')
        grounded, held, gaps = True, True, 0
        for answer in answers:
            question = questions.get(answer.get('id'))
            if question is None:
                grounded = False
                continue
            evidence = [s for key,s in sources.items() if key in ('security-policy','security-review')
                        and isinstance(s['content'].get(question['control']), str)
                        and s['content'][question['control']].strip()]
            values = {s['content'][question['control']].strip() for s in evidence}
            expected = 'needs_evidence' if not values else 'conflicting_evidence' if len(values)>1 else 'draft_for_review'
            held &= answer.get('status') == expected and answer.get('approved') is False
            gaps += expected != 'draft_for_review'
            if expected == 'draft_for_review':
                grounded &= answer.get('answer') in values and {c['id'] for c in answer.get('citations', [])} == {s['id'] for s in evidence}
        check('answer_grounding', grounded, 'Draft answers must reproduce their supporting control facts and citations.')
        check('unsupported_claim_gate', held, 'Missing or conflicting evidence must prevent an answer draft.')
        check('question_gap_count', result.get('evidence_gaps') == gaps,
              'Reported evidence gaps must agree with the source-based assessment.')
    elif flow == 'vulnerabilities':
        feed, policy = sources.get('advisory-snapshot'), sources.get('remediation-policy')
        if result.get('complete') is False:
            check('incomplete_coverage', result.get('status') == 'incomplete' and
                  result.get('checked_packages') == 0 and not result.get('findings'),
                  'Unavailable evidence must be reported as incomplete, never a clean scan.')
        else:
            expected = set()
            for p in payload['packages']:
                for a in payload['advisories']:
                    if a['package'] == {'name':p['name'],'ecosystem':p['ecosystem']} and p['version'] in a.get('versions',[]):
                        expected.add((p['ecosystem'],p['name'],p['version'],a['id']))
            actual = [(f.get('ecosystem'),f.get('package'),f.get('version'),f.get('id')) for f in result.get('findings',[])]
            check('advisory_coverage', bool(feed and policy) and set(actual) == expected and len(actual) == len(expected)
                  and result.get('checked_packages') == len(payload['packages']),
                  'Every matching advisory appears once; package coverage must be complete.')
            metadata = True
            for f in result.get('findings',[]):
                a = next((a for a in payload['advisories'] if a['id'] == f.get('id')), None)
                p = next((p for p in payload['packages'] if (p['ecosystem'],p['name'],p['version']) ==
                          (f.get('ecosystem'),f.get('package'),f.get('version'))), None)
                if not a or not p or not policy:
                    metadata = False
                    continue
                severity = a.get('severity','UNKNOWN').upper()
                severity = severity if severity in ('CRITICAL','HIGH','MODERATE','LOW') else 'UNKNOWN'
                days = policy['content']['deadlines_days'].get(severity)
                due = (dt.date.fromisoformat(p.get('detected_on',result['as_of']))+dt.timedelta(days=days)).isoformat() if days is not None else None
                metadata &= f.get('severity') == severity and f.get('due_on') == due and f.get('fixed_versions') == a.get('fixed_versions',[])
                metadata &= f.get('owner') == policy['content']['owners'].get(p['name'],'Unassigned: owner review required')
            check('remediation_facts', metadata, 'Severity, fixes, owners and deadlines must agree with advisory and policy evidence.')
    elif flow == 'soc2':
        source = sources.get('soc2-evidence-register')
        evidence = {e['id']:e for e in source['content']['evidence']} if source else {}
        expected_ready = set()
        for c in payload['controls']:
            eligible = bool(c['owner'].strip() and c['evidence_ids'])
            for ref in c['evidence_ids']:
                e = evidence.get(ref)
                eligible &= bool(e and e.get('approved') is True and payload['period_start'] <= e['collected_on'] <= payload['period_end']
                                 and e['collected_on'] <= e['reviewed_on'] <= result['as_of']
                                 and (dt.date.fromisoformat(result['as_of'])-dt.date.fromisoformat(e['reviewed_on'])).days <= payload['max_review_age_days'])
            if eligible:
                expected_ready.add(c['id'])
        rows = result.get('controls',[])
        check('control_coverage', Counter(c.get('id') for c in rows) == Counter(c['id'] for c in payload['controls']),
              'Exactly one output is required for each input control.')
        check('evidence_readiness', {c['id'] for c in rows if c.get('status') == 'ready_for_reviewer'} == expected_ready
              and result.get('ready_for_reviewer') == len(expected_ready),
              'Ready status must have an owner, approved evidence and valid in-period dates.')
        check('control_follow_ups', all(bool(c.get('follow_ups')) for c in rows if c['id'] not in expected_ready),
              'Every control with a gap must expose a follow-up.')
    failed = [c['id'] for c in checks if c['status'] == 'fail']
    return {'version': VERSION, 'kind':'deterministic_output_checks',
            'status':'failed' if failed else 'passed', 'checks':checks, 'failed_checks':failed,
            'human_review_required':not routine,
            'not_assessed':['General factual entailment of free text','Writing quality','Real-world completeness','Compliance or audit readiness'],
            'note':'Passing validates these explicit checks only. Model review and release-policy gates still apply.'}


def attach_assurance(flow, result, sources, payload, selected_route=None):
    relevant = {'release-notes':{'product-change'},'questionnaire':{'security-policy','security-review'},
                'vulnerabilities':{'remediation-policy','advisory-snapshot'},'soc2':{'soc2-evidence-register'}}
    result['evidence_snapshot'] = [source for key,source in sources.items() if key in relevant[flow]]
    result['workflow_input'] = payload
    result['evaluation'] = evaluate_output(flow, result, sources, payload)
    result['routing'] = selected_route if selected_route is not None else routing_plan(flow, result)
    result['run_fingerprint'] = hashlib.sha256(json.dumps({'flow':flow,'sources':sources,'payload':payload,'result':result},
                                                        sort_keys=True).encode()).hexdigest()
    result['audit'].append({'stage':'output evaluation','outcome':result['evaluation']['status']})
    if result['evaluation']['status'] == 'failed':
        result['output_gate'] = 'held_by_evaluation'
    elif result['status'] in ('blocked', 'needs_evidence', 'incomplete'):
        result['output_gate'] = 'held_by_source'
    else:
        result['output_gate'] = 'awaiting_model_review' if flow=='release-notes' and not result['review_required'] else 'human_review_required'
    return result
