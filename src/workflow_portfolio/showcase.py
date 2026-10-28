"""Local, source-backed portfolio workflows. No external service writes."""
import argparse
import copy
import datetime as dt
import json
from pathlib import Path
from .domain import InputError
from .service import submit
from .store import Store

ROOT = Path(__file__).resolve().parents[2]
FIXTURES = ROOT / 'examples' / 'showcase'
FLOWS = ('release-notes', 'vulnerabilities', 'questionnaire', 'soc2')


def load_json(path):
    with Path(path).open(encoding='utf-8') as f:
        return json.load(f)


def date(value):
    try:
        return dt.date.fromisoformat(value)
    except (TypeError, ValueError) as e:
        raise InputError('Use an ISO date such as 2026-10-26') from e


def knowledge_sources(knowledge, as_of, disabled=()):
    """Only explicitly approved, current, public demo evidence enters outputs."""
    if not isinstance(knowledge, dict) or knowledge.get('fictional') is not True:
        raise InputError('This demo accepts fictional knowledge snapshots only')
    sources = knowledge.get('sources')
    if not isinstance(sources, list) or len(sources) > 100:
        raise InputError('Knowledge sources must be a list of at most 100 records')
    eligible, excluded, seen = {}, [], set()
    for source in sources:
        if not isinstance(source, dict) or not isinstance(source.get('id'), str):
            raise InputError('Each source needs an ID')
        sid = source['id']
        if sid in seen:
            raise InputError('Duplicate knowledge source ID: ' + sid)
        seen.add(sid)
        age = (date(as_of) - date(source.get('reviewed_on'))).days
        reason = ('disabled by reviewer' if sid in disabled else
                  'not approved for this demo' if source.get('approved') is not True else
                  'outside public demo access' if source.get('scope') != 'public-demo' else
                  'review date is in the future' if age < 0 else
                  'source review is over 180 days old' if age > 180 else None)
        if reason:
            excluded.append({'id': sid, 'reason': reason})
        elif not isinstance(source.get('content'), dict):
            raise InputError('Source content must be an object')
        else:
            eligible[sid] = source
    return eligible, excluded


def citation(source):
    return {k: source[k] for k in ('id', 'title', 'system', 'reviewed_on')}


def envelope(flow, as_of, excluded):
    return {'flow': flow, 'as_of': as_of, 'fictional': True,
            'execution': 'local deterministic workflow; no LLM called',
            'external_writes': False, 'published': False,
            'review_required': True, 'excluded_sources': excluded}


def release_notes(sources, as_of, excluded, audience='confirmed', body=None, change_category=None,
                  draft_origin='supplied-text'):
    result = envelope('release-notes', as_of, excluded)
    source = sources.get('product-change')
    if source is None:
        return dict(result, status='needs_evidence', summary='Release source unavailable. No draft produced.',
                    citations=[], audit=[{'stage': 'source check', 'outcome': 'blocked'}])
    c = source['content']
    category = change_category or c.get('change_category','new_feature')
    if category not in ('routine_update','new_feature','new_document'):
        raise InputError('Unknown release change category')
    if c.get('change_category') != 'routine_update' and category == 'routine_update':
        raise InputError('Source review requirements cannot be downgraded')
    result['release_policy'] = {'change_category':category,
                                'human_review_required':category!='routine_update',
                                'automatic_delivery':'local_demo_only'}
    result['review_required'] = category != 'routine_update'
    confirmed = c.get('audiences')
    if (c.get('stage') not in ('beta', 'ga') or not isinstance(confirmed, list)
            or not confirmed or not all(isinstance(x, str) and x for x in confirmed)):
        raise InputError('Release source needs confirmed stage and audiences')
    target = ['all_customers'] if audience == 'all-customers' else confirmed
    if audience not in ('confirmed', 'all-customers'):
        raise InputError('Unknown release audience')
    default_body = c.get('availability_statement', c['feature'] + ' update.') + ' ' + c['summary']

    kind = 'new_guide' if category=='new_document' else 'release_note'
    draft = {'kind': kind, 'headline': c['feature'] + (' pilot' if c['stage'] == 'beta' else ''),
             'body': body if body is not None else default_body,
             'feature': c['feature'], 'stage': c['stage'], 'audiences': target,
             'citations': c['pr_urls'], 'model': draft_origin if body is not None else 'deterministic-template'}
    evidence = dict(change_id=c['change_id'], feature=c['feature'], content_kind=kind,
                    stage=c['stage'], audiences=confirmed, pr_urls=c['pr_urls'],
                    source_urls=['fixture://product-change'])
    store = Store(':memory:')
    try:
        decision = submit({'evidence': evidence, 'draft': draft}, store)
        duplicate = submit({'evidence': evidence, 'draft': draft}, store)
        # Structured audience checks are authoritative. A narrow prose check catches
        # the demo's explicit overclaim; it is not a general semantic verifier.
        overclaim = c['stage'] == 'beta' and any(t in draft['body'].lower()
                         for t in ('all customers', 'every customer', 'everyone'))
        findings = [f.code for f in decision.findings]
        if overclaim:
            findings.append('prose_audience_overclaim')
        blocked = bool(findings)
        return dict(result, status='blocked' if blocked else 'review_required' if result['review_required'] else 'awaiting_model_review',
                    summary='Draft blocked: audience exceeds confirmed availability.' if blocked else
                            'New feature or document awaits human review.' if result['review_required'] else
                            'Routine release note prepared; model checks must pass before automatic local delivery.',
                    draft=draft, findings=findings, citations=[citation(source)],
                    limitations=['Automated delivery depends on explicit source facts, deterministic checks and a passing model review.'],
                    audit=[{'stage': 'source check', 'outcome': 'approved local evidence'},
                           {'stage': 'draft', 'outcome': 'template using confirmed product facts' if body is None else
                            draft_origin + ' using confirmed product facts'},
                           {'stage': 'validation', 'outcome': 'blocked' if blocked else 'passed structured checks'},
                           {'stage': 'retry check', 'outcome': 'same decision; no duplicate record',
                            'duplicate': duplicate.duplicate, 'event_count': len(store.events())},
                           {'stage': 'delivery', 'outcome': 'human review required' if result['review_required'] else 'automatic local delivery awaits model check'}])
    finally:
        store.close()


def check_packages(payload):
    packages = payload.get('packages') if isinstance(payload, dict) else None
    if not isinstance(packages, list) or not 1 <= len(packages) <= 100:
        raise InputError('Supply between 1 and 100 pinned packages')
    seen = set()
    for p in packages:
        if (not isinstance(p, dict) or p.get('ecosystem') not in ('npm', 'PyPI') or
                not all(isinstance(p.get(k), str) and p[k].strip() for k in ('name', 'version'))):
            raise InputError('Each package needs name, pinned version and npm/PyPI ecosystem')
        if any(c in p['version'] for c in '^~*<>=, ') or len(p['version']) > 100 or len(p['name']) > 200:
            raise InputError('Supply exact pinned versions, not ranges')
        key = (p['ecosystem'], p['name'], p['version'])
        if key in seen:
            raise InputError('Duplicate pinned package')
        seen.add(key)
    return packages


def vulnerabilities(sources, as_of, excluded, payload, feed_unavailable=False):
    result = envelope('vulnerabilities', as_of, excluded)
    packages = check_packages(payload)
    policy, feed = sources.get('remediation-policy'), sources.get('advisory-snapshot')
    if policy is None or feed is None or feed_unavailable:
        return dict(result, status='incomplete', summary='Advisory evidence or remediation policy unavailable. No clean bill of health.',
                    complete=False, findings=[], checked_packages=0, total_packages=len(packages), citations=[],
                    audit=[{'stage': 'evidence check', 'outcome': 'unavailable; stop before reporting coverage'}])
    advisories = payload.get('advisories')
    if not isinstance(advisories, list):
        raise InputError('Advisories must be a list, including when empty')
    findings, seen = [], set()
    ranks = {'CRITICAL': 0, 'HIGH': 1, 'MODERATE': 2, 'LOW': 3, 'UNKNOWN': 4}
    for p in packages:
        detected = date(p.get('detected_on', as_of))
        if detected > date(as_of):
            raise InputError('A finding cannot be detected after the report date')
        for advisory in advisories:
            if not isinstance(advisory, dict) or not isinstance(advisory.get('package'), dict):
                raise InputError('Malformed advisory')
            if advisory['package'] != {'name': p['name'], 'ecosystem': p['ecosystem']}:
                continue
            if p['version'] not in advisory.get('versions', []):
                continue
            if advisory.get('source_id') != feed['id'] or not advisory.get('id'):
                raise InputError('Advisory needs an approved source and identifier')
            key = (p['ecosystem'], p['name'], p['version'], advisory['id'])
            if key in seen:
                continue
            seen.add(key)
            severity = advisory.get('severity', 'UNKNOWN').upper()
            severity = severity if severity in ranks else 'UNKNOWN'
            days = policy['content']['deadlines_days'].get(severity)
            due = detected + dt.timedelta(days=days) if days is not None else None
            state = ('needs_severity_review' if due is None else 'overdue' if due < date(as_of) else
                     'due_soon' if (due - date(as_of)).days <= 2 else 'open')
            findings.append({'id': advisory['id'], 'package': p['name'], 'version': p['version'],
                             'ecosystem': p['ecosystem'], 'severity': severity,
                             'summary': advisory.get('summary', 'No advisory summary supplied'),
                             'owner': policy['content']['owners'].get(p['name'], 'Unassigned: owner review required'),
                             'due_on': due.isoformat() if due else None, 'state': state,
                             'fixed_versions': advisory.get('fixed_versions', []),
                             'next_action': 'Review and test an applicable fixed version.' if advisory.get('fixed_versions') else
                                            'No fixed version supplied: owner must assess mitigation.',
                             'source_id': feed['id']})
    findings.sort(key=lambda f: (ranks[f['severity']], f['due_on'] or '9999', f['package']))
    return dict(result, status='findings_need_review' if findings else 'no_matches_in_supplied_snapshot',
                summary=str(len(findings)) + ' dependency findings prioritised for review.',
                complete=True, checked_packages=len(packages), total_packages=len(packages), findings=findings,
                citations=[citation(policy), citation(feed)],
                limitations=['Matches exact versions in the supplied fictional snapshot. Not a live vulnerability scan.',
                             'A fixed version is advisory evidence, not an automatic upgrade or a safety guarantee.'],
                audit=[{'stage': 'dependency inventory', 'outcome': str(len(packages)) + ' pinned packages'},
                       {'stage': 'advisory matching', 'outcome': 'exact package, ecosystem and version'},
                       {'stage': 'triage', 'outcome': 'severity, owner, deadline and fix evidence'},
                       {'stage': 'delivery', 'outcome': 'local report; no tickets or code changes'}])


def questionnaire(sources, as_of, excluded, payload):
    questions = payload.get('questions') if isinstance(payload, dict) else None
    if not isinstance(questions, list) or not 1 <= len(questions) <= 100:
        raise InputError('Supply between 1 and 100 questions')
    result, answers, ids = envelope('questionnaire', as_of, excluded), [], set()
    for q in questions:
        if (not isinstance(q, dict) or not all(isinstance(q.get(k), str) and q[k].strip()
                for k in ('id', 'question', 'control')) or q['id'] in ids):
            raise InputError('Each question needs a unique ID, question and control key')
        ids.add(q['id'])
        evidence = [s for s in sources.values() if s['id'] in ('security-policy', 'security-review')
                    and isinstance(s['content'].get(q['control']), str) and s['content'][q['control']].strip()]
        values = {s['content'][q['control']].strip() for s in evidence}
        if not values:
            status, answer = 'needs_evidence', 'No approved evidence found. Ask the control owner.'
        elif len(values) > 1:
            status, answer = 'conflicting_evidence', 'Approved sources disagree. Ask the control owner before answering.'
        else:
            status, answer = 'draft_for_review', next(iter(values))
        answers.append({'id': q['id'], 'question': q['question'], 'control': q['control'],
                        'status': status, 'answer': answer, 'citations': [citation(s) for s in evidence],
                        'approved': False})
    gaps = sum(a['status'] != 'draft_for_review' for a in answers)
    return dict(result, status='review_required', answers=answers, evidence_gaps=gaps,
                summary=str(len(answers) - gaps) + ' evidence-backed drafts; ' + str(gaps) + ' questions need evidence or clarification.',
                limitations=['Questions use explicit control keys; this is transparent lookup, not semantic search or an LLM.',
                             'Draft answers require human review and are never submitted.'],
                audit=[{'stage': 'source filtering', 'outcome': 'approved, current, public demo evidence only'},
                       {'stage': 'answer drafting', 'outcome': 'source text copied with citations'},
                       {'stage': 'gap detection', 'outcome': str(gaps) + ' unsupported or conflicting answers held back'},
                       {'stage': 'delivery', 'outcome': 'local draft; no questionnaire submitted'}])


def soc2_review(sources, as_of, excluded, payload):
    if not isinstance(payload, dict) or payload.get('fictional') is not True:
        raise InputError('Use a fictional SOC 2 review input')
    start, end = date(payload.get('period_start')), date(payload.get('period_end'))
    if start > end or end > date(as_of):
        raise InputError('Review period must be ordered and cannot end after the review date')
    max_age = payload.get('max_review_age_days')
    if type(max_age) is not int or not 1 <= max_age <= 366:
        raise InputError('Evidence review age must be between 1 and 366 days')
    controls = payload.get('controls')
    if not isinstance(controls, list) or not 1 <= len(controls) <= 100:
        raise InputError('Supply between 1 and 100 demo controls')
    source = sources.get('soc2-evidence-register')
    records = source['content'].get('evidence') if source else []
    if not isinstance(records, list):
        raise InputError('Evidence register must contain a list')
    evidence = {}
    for record in records:
        if not isinstance(record, dict) or not isinstance(record.get('id'), str) or record['id'] in evidence:
            raise InputError('Evidence records need unique string IDs')
        evidence[record['id']] = record
    rows, seen = [], set()
    for control in controls:
        if (not isinstance(control, dict) or not all(isinstance(control.get(k), str) and control[k].strip()
                for k in ('id', 'title')) or control['id'] in seen):
            raise InputError('Controls need unique IDs and titles')
        seen.add(control['id'])
        owner, refs = control.get('owner'), control.get('evidence_ids')
        if not isinstance(owner, str) or not isinstance(refs, list) or any(not isinstance(x, str) for x in refs):
            raise InputError('Each control needs an owner string and evidence ID list')
        issues, details = [], []
        if not owner.strip():
            issues.append('Assign a control owner.')
        if not refs:
            issues.append('Collect supporting evidence.')
        for ref in dict.fromkeys(refs):
            item = evidence.get(ref)
            if item is None:
                issues.append('Evidence unavailable: ' + ref + '.')
                continue
            collected, reviewed = date(item.get('collected_on')), date(item.get('reviewed_on'))
            details.append(dict(item, source_id=source['id']))
            if not start <= collected <= end:
                issues.append(ref + ': evidence date is outside the selected review period.')
            if reviewed > date(as_of) or reviewed < collected:
                issues.append(ref + ': evidence review date needs correction.')
            elif (date(as_of) - reviewed).days > max_age:
                issues.append(ref + ': evidence review is overdue under the demo policy.')
            if item.get('approved') is not True:
                issues.append(ref + ': evidence awaits reviewer approval.')
        rows.append({'id': control['id'], 'title': control['title'], 'owner': owner.strip() or 'Unassigned',
                     'status': 'needs_follow_up' if issues else 'ready_for_reviewer',
                     'evidence': details, 'follow_ups': issues,
                     'citations': [citation(source)] if details else []})
    ready = sum(r['status'] == 'ready_for_reviewer' for r in rows)
    return dict(envelope('soc2', as_of, excluded), status='review_required', controls=rows,
                ready_for_reviewer=ready, controls_needing_follow_up=len(rows)-ready,
                period_start=start.isoformat(), period_end=end.isoformat(),
                summary=f'{ready} of {len(rows)} controls with evidence ready for review; {len(rows)-ready} need follow-up.',
                limitations=['Fictional demo controls, not an authoritative SOC 2 criteria mapping.',
                             'Date and approval checks do not establish evidence sufficiency, control effectiveness or audit readiness.',
                             'The 90-day sample freshness rule is a demo policy, not a SOC 2 requirement.'],
                audit=[{'stage':'source check','outcome':'approved local evidence register' if source else 'register unavailable; evidence held back'},
                       {'stage':'evidence review','outcome':'owner, evidence references, dates and reviewer approval checked'},
                       {'stage':'follow-ups','outcome':str(len(rows)-ready)+' controls need owner action'},
                       {'stage':'delivery','outcome':'local review checklist; no audit submission or compliance verdict'}])


def _run_workflow(flow, options=None, knowledge=None, payload=None):
    if flow not in FLOWS:
        raise InputError('Unknown showcase flow')
    options = options or {}
    if not isinstance(options, dict):
        raise InputError('Options must be an object')
    as_of = options.get('as_of', dt.date.today().isoformat())
    date(as_of)
    disabled = options.get('disabled_sources', [])
    if not isinstance(disabled, list) or any(not isinstance(s, str) for s in disabled):
        raise InputError('Disabled sources must be a list of IDs')
    sources, excluded = knowledge_sources(knowledge if knowledge is not None else load_json(FIXTURES / 'knowledge.json'), as_of, disabled)
    if flow == 'release-notes':
        body = options.get('draft_body')
        if body is not None and (not isinstance(body, str) or not 1 <= len(body) <= 10000):
            raise InputError('Draft text must contain 1 to 10000 characters')
        origin = options.get('draft_origin', 'supplied-text')
        if origin not in ('supplied-text', 'subscription-model'):
            raise InputError('Unknown draft origin')
        return release_notes(sources, as_of, excluded, options.get('audience', 'confirmed'), body,
                             options.get('change_category'), origin)
    if flow == 'vulnerabilities':
        data = payload if payload is not None else load_json(FIXTURES / 'vulnerabilities.json')
        return vulnerabilities(sources, as_of, excluded, data, options.get('feed_unavailable') is True)
    if flow == 'soc2':
        return soc2_review(sources, as_of, excluded, payload if payload is not None else load_json(FIXTURES / 'soc2.json'))
    data = copy.deepcopy(payload if payload is not None else load_json(FIXTURES / 'questionnaire.json'))
    return questionnaire(sources, as_of, excluded, data)


def run(flow, options=None, knowledge=None, payload=None):
    from .showcase_assurance import attach_assurance, routing_plan
    if flow not in FLOWS:
        raise InputError('Unknown showcase flow')
    if options is not None and not isinstance(options, dict):
        raise InputError('Options must be an object')
    snapshot = knowledge if knowledge is not None else load_json(FIXTURES / 'knowledge.json')
    scenario = (options or {}).get('change_category')
    if knowledge is None and flow=='release-notes' and scenario in ('new_feature','new_document'):
        # The demo selector loads distinct approved fixtures; it does not relabel
        # the same evidence or waive a source's review requirements.
        scenarios = load_json(FIXTURES/'release_scenarios.json')
        snapshot['sources'] = [scenarios[scenario] if source['id']=='product-change' else source
                               for source in snapshot['sources']]
    data = payload if payload is not None else (None if flow == 'release-notes' else load_json(FIXTURES / (flow + '.json')))
    as_of = (options or {}).get('as_of', dt.date.today().isoformat())
    sources, _ = knowledge_sources(snapshot, as_of, (options or {}).get('disabled_sources', []))
    selected = routing_plan(flow, {'task':flow,'release_policy':{'change_category':(options or {}).get('change_category') or
                            (sources.get('product-change',{}).get('content',{}).get('change_category','routine_update'))}})
    result = _run_workflow(flow, options, snapshot, data)
    return attach_assurance(flow, result, sources, data, selected)


def main(argv=None):
    if argv and argv[0] == 'pilot':
        from .ai_pilot import main as pilot_main
        return pilot_main(argv[1:])
    if argv and argv[0] == 'benchmark':
        from .evals import benchmark_main
        return benchmark_main(argv[1:])
    if argv and argv[0] == 'review':
        from .showcase_review import main as review_main
        return review_main(argv[1:])
    if argv and argv[0] == 'evaluate':
        from .showcase_evaluation import main as evaluation_main
        return evaluation_main(argv[1:])
    parser = argparse.ArgumentParser(description=__doc__)
    sub = parser.add_subparsers(dest='command', required=True)
    serve = sub.add_parser('serve', help='Open the local browser demo')
    serve.add_argument('--port', type=int, default=8765)
    serve.add_argument('--review-policy', type=Path)
    serve.add_argument('--review-capabilities', type=Path)
    serve.add_argument('--review-receipts', type=Path)
    serve.add_argument('--model-reviews', type=int, default=0,
                       help='Explicit live subscription-call budget for this server session (1 to 10)')
    cmd = sub.add_parser('run', help='Run a local workflow and print JSON')
    cmd.add_argument('flow', choices=FLOWS)
    cmd.add_argument('--input', type=Path, help='Explicit fictional input JSON (vulnerabilities/questionnaire)')
    cmd.add_argument('--knowledge', type=Path, help='Explicit fictional knowledge snapshot JSON')
    cmd.add_argument('--as-of', default=dt.date.today().isoformat())
    cmd.add_argument('--audience', choices=('confirmed', 'all-customers'), default='confirmed')
    args = parser.parse_args(argv)
    try:
        if args.command == 'serve':
            from .showcase_server import serve_local, ModelReviewSession
            configured = (args.review_policy, args.review_capabilities, args.review_receipts)
            session = None
            if args.model_reviews or any(configured):
                if not all(configured) or not args.model_reviews:
                    raise InputError('Live mode needs policy, capabilities, private receipts directory and a call budget')
                session = ModelReviewSession(load_json(args.review_policy), load_json(args.review_capabilities),
                                             args.review_receipts, args.model_reviews)
            return serve_local(args.port, session)
        result = run(args.flow, {'as_of': args.as_of, 'audience': args.audience},
                     load_json(args.knowledge) if args.knowledge else None,
                     load_json(args.input) if args.input else None)
        print(json.dumps(result, indent=2))
        return 0
    except (InputError, OSError, ValueError, KeyError, TypeError) as e:
        parser.exit(2, 'Workflow could not run: ' + str(e) + '\n')


if __name__ == '__main__':
    raise SystemExit(main())
