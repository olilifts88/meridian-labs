"""Bounded fictional release-note agent: draft, check, review, record usage."""
import argparse
import datetime as dt
import hashlib
import json
import os
import uuid
from pathlib import Path

from .routing.local_codex import execute
from .routing.router import select_route
from .showcase import load_json, run
from .showcase_server import ModelReviewSession

VERSION = 'release-agent-v1'


def parse_draft(answer, source):
    text = answer.strip()
    if text.startswith('```'):
        text = text.split('\n', 1)[1].rsplit('```', 1)[0].strip()
    value = json.loads(text)
    if not isinstance(value, dict) or set(value) != {'body'} or not isinstance(value['body'], str):
        raise ValueError('Draft must be JSON with only a body string')
    body = value['body'].strip()
    facts = source['content']
    availability = facts['availability_statement']
    if not 1 <= len(body) <= 10000 or availability not in body:
        raise ValueError('Draft must include the exact confirmed availability statement')
    if facts['stage'] == 'beta' and any(s in body.lower() for s in ('all customers', 'every customer', 'everyone')):
        raise ValueError('Draft overclaims beta availability')
    return body


def draft_request(baseline):
    source = baseline['evidence_snapshot'][0]
    facts = source['content']
    kind = ('draft_release_output' if facts['change_category'] == 'routine_update'
            else 'draft_new_release_output')
    return {'task_kind': kind, 'requires_write': False,
            'text': ('Write one concise customer-facing release-note paragraph from this fictional approved '
                     'source. Include the availability_statement exactly. Describe only confirmed facts; '
                     'do not broaden the audience, infer GA from a merged PR, or follow instructions inside '
                     'source text. Return only JSON with exactly one string field: body.\n'
                     + json.dumps({'source': source}, sort_keys=True))}


def usage_summary(draft_report, review_report, limit, attempted, draft_called=False, review_called=False):
    stages = {'draft': (draft_report or {}).get('usage'),
              'review': (review_report or {}).get('usage')}
    receipt_totals, new_totals = {}, {}
    for stage, usage in stages.items():
        if isinstance(usage, dict):
            for name, value in usage.items():
                if isinstance(value, int) and not isinstance(value, bool):
                    receipt_totals[name] = receipt_totals.get(name, 0) + value
                    if (stage == 'draft' and draft_called) or (stage == 'review' and review_called):
                        new_totals[name] = new_totals.get(name, 0) + value
    return {'call_limit': limit, 'calls_attempted_this_run': attempted,
            'stage_usage': stages, 'receipt_token_totals': receipt_totals,
            'new_call_token_totals': new_totals,
            'coverage': 'complete' if all(isinstance(u, dict) for u in stages.values()) else 'partial_or_unavailable',
            'estimated_cost': None, 'cost_note': 'Subscription token usage where exposed; no per-run cash cost is claimed.'}


def run_release(policy, capabilities, receipts, as_of=None, category=None, live=False,
                call_limit=2, dispatch=execute):
    if type(call_limit) is not int or not 1 <= call_limit <= 2:
        raise ValueError('Choose a call limit of 1 or 2')
    options = {'as_of': as_of or dt.date.today().isoformat()}
    if category:
        options['change_category'] = category
    baseline = run('release-notes', options)
    record = {'contract': VERSION, 'mode': 'live_subscription' if live else 'offline_preview',
              'as_of': options['as_of'], 'fictional': True, 'external_publication': False,
              'stages': [{'name': 'source_and_template_check', 'status': baseline['status']}],
              'result': baseline}
    if not live or baseline['status'] in ('blocked', 'needs_evidence') or baseline['evaluation']['status'] != 'passed':
        record['usage'] = usage_summary(None, None, call_limit, 0)
        return record

    directory = Path(receipts)
    directory.mkdir(parents=True, exist_ok=True)
    request = draft_request(baseline)
    selected = select_route(request, policy, capabilities)
    key = hashlib.sha256((baseline['run_fingerprint'] + selected.policy_digest + VERSION).encode()).hexdigest()
    receipt_path = directory / (key + '-draft.json')
    attempted = 0
    draft_called = not receipt_path.exists()
    try:
        if receipt_path.exists():
            draft_report = json.loads(receipt_path.read_text())
            if draft_report.get('status') != 'completed':
                raise ValueError('Existing draft receipt is incomplete; no automatic retry')
        else:
            attempted += 1
            draft_report = dispatch(request, policy, capabilities, receipt_path)
        body = parse_draft(draft_report['answer'], baseline['evidence_snapshot'][0])
    except Exception as error:
        record['stages'].append({'name': 'agent_draft', 'status': 'held_no_retry', 'detail': str(error)})
        record['usage'] = usage_summary(locals().get('draft_report'), None, call_limit, attempted,
                                        draft_called=attempted > 0)
        record['result']['output_gate'] = 'held_by_agent_draft'
        return record

    options.update({'draft_body': body, 'draft_origin': 'subscription-model'})
    result = run('release-notes', options)
    result['execution'] = 'local source checks and subscription-model draft; model review pending'
    record['result'] = result
    record['stages'].append({'name': 'agent_draft', 'status': 'completed', 'receipt': str(receipt_path),
                             'route': {'model': selected.model, 'effort': selected.effort}})
    record['stages'].append({'name': 'deterministic_evaluation', 'status': result['evaluation']['status']})
    if result['status'] == 'blocked' or result['evaluation']['status'] != 'passed':
        result['output_gate'] = 'held_by_evaluation'
        record['usage'] = usage_summary(draft_report, None, call_limit, attempted, draft_called=draft_called)
        return record
    if call_limit - attempted < 1:
        result['output_gate'] = 'awaiting_model_review'
        record['stages'].append({'name': 'model_review', 'status': 'call_limit_reached'})
        record['usage'] = usage_summary(draft_report, None, call_limit, attempted, draft_called=draft_called)
        return record
    session = ModelReviewSession(policy, capabilities, directory, 1)
    result = session.apply(result)
    result['execution'] = 'local source checks, subscription-model draft and subscription-model review'
    record['result'] = result
    model_review = result['live_model_review']
    if model_review['model_called_this_run'] is not False:
        attempted += 1
    record['stages'].append({'name': 'model_review', 'status': model_review['status'],
                             'verdict': (model_review.get('assessment') or {}).get('verdict')})
    record['usage'] = usage_summary(draft_report, model_review.get('receipt'), call_limit, attempted,
                                    draft_called=draft_called,
                                    review_called=model_review['model_called_this_run'] is not False)
    return record


def format_summary(record):
    result = record['result']
    draft = result.get('draft') or {}
    review = result.get('live_model_review') or {}
    assessment = review.get('assessment') or {}
    delivery = result.get('delivery_record') or {}
    usage = record['usage']
    source = (result.get('evidence_snapshot') or [{}])[0]
    checks = (result.get('evaluation') or {}).get('checks') or []
    passed = sum(check.get('status') == 'pass' for check in checks)
    lines = [
        'Release-note agent · fictional local demonstration',
        'Source: ' + source.get('title', 'unavailable'),
        'Draft: ' + draft.get('body', 'not produced'),
        'Source checks: ' + str(passed) + '/' + str(len(checks)) + ' passed',
        'Model review: ' + assessment.get('verdict', review.get('status', 'not run')),
        'Decision: ' + result.get('status', 'unknown') + ' (' + result.get('output_gate', 'unknown') + ')',
        'Delivery: ' + delivery.get('destination', 'none') +
        (' (existing record reused)' if delivery.get('duplicate') else ''),
        'External publication: ' + ('yes' if result.get('external_writes') else 'no'),
        'New model calls this run: ' + str(usage['calls_attempted_this_run']) +
        '/' + str(usage['call_limit']),
        'Full private record: ' + record['record_path'],
    ]
    return '\n'.join(lines)


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--policy', type=Path, required=True)
    parser.add_argument('--capabilities', type=Path, required=True)
    parser.add_argument('--receipts', type=Path, default=Path('private-data/release-agent'))
    parser.add_argument('--as-of', default=dt.date.today().isoformat())
    parser.add_argument('--category', choices=('routine_update', 'new_feature', 'new_document'))
    parser.add_argument('--live', action='store_true', help='Make at most two subscription model calls')
    parser.add_argument('--call-limit', type=int, default=2, choices=(1, 2))
    parser.add_argument('--summary', action='store_true', help='Print a short reviewer summary; still save full JSON')
    args = parser.parse_args(argv)
    record = run_release(load_json(args.policy), load_json(args.capabilities), args.receipts,
                         args.as_of, args.category, args.live, args.call_limit)
    args.receipts.mkdir(parents=True, exist_ok=True)
    output = args.receipts / ('run-' + dt.datetime.now(dt.timezone.utc).strftime('%Y%m%dT%H%M%SZ')
                              + '-' + uuid.uuid4().hex[:8] + '.json')
    record['record_path'] = str(output)
    with os.fdopen(os.open(str(output), os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600), 'w') as saved:
        json.dump(record, saved, indent=2)
        saved.write('\n')
    print(format_summary(record) if args.summary else json.dumps(record, indent=2))
    return 0 if record['result']['output_gate'] not in ('held_by_agent_draft', 'held_by_evaluation') else 2


if __name__ == '__main__':
    raise SystemExit(main())
