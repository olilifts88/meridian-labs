#!/usr/bin/env python3
"""Measure an explicitly bound existing local run; never invoke a model or server."""
import argparse
import collections
import datetime as dt
import json
import sqlite3
from pathlib import Path
from .jsonl_reader import open_log, resolve_log, LogReadError

FIELDS = ('input_tokens', 'cached_input_tokens', 'cache_write_input_tokens',
          'output_tokens', 'reasoning_output_tokens', 'total_tokens')


def measure_response_set(manifest, source):
    if not manifest.get('run_id') or not manifest.get('environment'):
        raise ValueError('run_id and environment are required')
    result = {'run_id': manifest['run_id'], 'environment': manifest['environment'],
              'skill_url': manifest.get('skill_url'), 'skill_version': manifest.get('skill_version'),
              'mode': manifest.get('mode'), 'thread_id': manifest.get('thread_id'),
              'final_output_id': manifest.get('final_output_id'),
              'measurement_status': 'unavailable', 'measurement_scope': None,
              'usage': {key: None for key in FIELDS}, 'response_ids': [],
              'actual_models': [], 'actual_reasoning_efforts': [],
              'recorded_turn_models': [], 'recorded_turn_reasoning_efforts': [],
              'model_identity_scope': 'Turn configuration does not prove the executed response model. Provider identity unavailable.',
              'actions': [], 'action_scope': 'Unavailable', 'duration_ms': None,
              'cost': None, 'warnings': [], 'collected_at_utc': dt.datetime.now(dt.timezone.utc).isoformat()}

    def unavailable(reason):
        result['availability_reason'] = reason
        return result

    if manifest['environment'] != 'local-codex':
        return unavailable('This local adapter cannot measure cloud ChatGPT usage; a matching provider record is required.')
    thread_id = manifest.get('thread_id')
    if not thread_id:
        return unavailable('No local thread binding supplied.')
    response_ids = set(manifest.get('response_ids') or [])
    turn_ids = set(manifest.get('turn_ids') or [])
    if not response_ids and not turn_ids:
        return unavailable('No response or turn binding supplied.')
    if not response_ids and manifest.get('turn_ids_unique_to_run') is not True:
        return unavailable('Turn-only binding is ambiguous without verified unique run boundaries.')
    db = source / 'state_5.sqlite'
    if not db.exists():
        return unavailable('Local state database unavailable.')
    conn = sqlite3.connect(db.resolve().as_uri() + '?mode=ro', uri=True)
    try:
        conn.execute('PRAGMA query_only=ON')
        row = conn.execute('SELECT rollout_path FROM threads WHERE id=?', (thread_id,)).fetchone()
    finally:
        conn.close()
    if not row or not resolve_log(row[0]).exists():
        return unavailable('No accessible local rollout for this thread.')
    usage_records = {}
    contexts = {}
    items = {}
    malformed = 0
    duplicates = 0
    inventory = set()
    try:
        with open_log(row[0]) as f:
            for line in f:
                try:
                    record = json.loads(line)
                except json.JSONDecodeError:
                    malformed += 1
                    continue
                payload = record.get('payload', {})
                if not isinstance(payload, dict):
                    continue
                kind = record.get('type')
                if kind == 'turn_context':
                    contexts.setdefault(payload.get('turn_id'), set()).add((payload.get('model'), payload.get('effort')))
                elif kind == 'token_usage_record':
                    if payload.get('thread_id') != thread_id:
                        continue
                    rid = payload.get('response_id')
                    if not rid:
                        continue
                    if payload.get('turn_id') in turn_ids:
                        inventory.add((payload.get('session_id'), rid))
                    if response_ids and rid not in response_ids:
                        continue
                    if not response_ids and payload.get('turn_id') not in turn_ids:
                        continue
                    if response_ids and turn_ids and payload.get('turn_id') not in turn_ids:
                        return unavailable('Supplied response and turn bindings conflict.')
                    key = (payload.get('session_id'), rid)
                    if key in usage_records:
                        if usage_records[key].get('usage') != payload.get('usage'):
                            return unavailable('Conflicting duplicate response usage; manual reconciliation required.')
                        duplicates += 1
                    usage_records[key] = payload
                elif kind == 'event_msg' and payload.get('type') == 'item_completed':
                    item = payload.get('item', {})
                    if item.get('id'):
                        items[(payload.get('turn_id'), item['id'])] = item
    except LogReadError as error:
        return unavailable(str(error))
    result['closed_turn_inventory'] = [list(key) for key in sorted(inventory, key=str)]
    result['malformed_lines'] = malformed
    if malformed:
        result['warnings'].append(f'{malformed} malformed or partial JSONL lines skipped; completeness unverified.')
    result['duplicate_usage_records_skipped'] = duplicates
    if not usage_records:
        return unavailable('No matching per-response usage records.')
    observed_ids = {key[1] for key in usage_records}
    if response_ids and observed_ids != response_ids:
        result['warnings'].append('Some requested responses are missing; subtotal only.')
    observed_turns = {p.get('turn_id') for p in usage_records.values()}
    if not response_ids and observed_turns != turn_ids:
        result['warnings'].append('Some requested turns have no usage; subtotal only.')
    sums = {key: 0 for key in FIELDS}
    for payload in usage_records.values():
        usage = payload.get('usage') or {}
        required = tuple(key for key in FIELDS if key != 'cache_write_input_tokens')
        if any(not type(usage.get(key)) is int or usage[key] < 0 for key in required):
            return unavailable('Missing or invalid usage categories.')
        if usage['total_tokens'] != usage['input_tokens'] + usage['output_tokens']:
            return unavailable('Provider total does not reconcile with input plus output.')
        if usage['cached_input_tokens'] > usage['input_tokens'] or usage['reasoning_output_tokens'] > usage['output_tokens']:
            return unavailable('Token subset categories do not reconcile.')
        for key in FIELDS:
            value = usage.get(key)
            if value is None or sums[key] is None:
                sums[key] = None
            elif type(value) is not int or value < 0:
                return unavailable('Invalid optional token category.')
            else:
                sums[key] += value
    context_values = {value for turn in observed_turns for value in contexts.get(turn, set())}
    result['recorded_turn_models'] = sorted({model for model, _ in context_values if model})
    result['recorded_turn_reasoning_efforts'] = sorted({effort for _, effort in context_values if effort})
    if any(len(contexts.get(turn, set())) != 1 for turn in observed_turns):
        result['warnings'].append('Missing or changing turn model settings; response-level model identity is not established.')
    actions = collections.Counter()
    for (turn, _), item in items.items():
        if turn not in observed_turns:
            continue
        typ = item.get('type')
        if typ == 'McpToolCall':
            actions[str(item.get('server')) + '.' + str(item.get('tool'))] += 1
        elif typ in ('CommandExecution', 'DynamicToolCall', 'CollabToolCall', 'FileChange', 'ImageView', 'Extension'):
            actions[typ] += 1
    result['response_records'] = [{'session_id': p.get('session_id'), 'response_id': p['response_id'], 'thread_id': thread_id, 'turn_id': p.get('turn_id'), 'usage': p['usage']} for p in usage_records.values()]
    result.update(measurement_status='measured', measurement_scope='explicitly bound response set' if response_ids else 'verified run-specific turn set',
                  availability_reason=None, usage=sums, response_ids=sorted(observed_ids),
                  actions=[{'name': name, 'count': n, 'tokens': None} for name, n in sorted(actions.items())],
                  action_scope='Recorded items in selected turns; not response-linked costs. Includes surrounding actions when a response subset was selected.')
    result['warnings'].append('Run completeness and skill ownership depend on the supplied binding; the adapter cannot prove causal attribution.')
    return result


def measure(manifest, source):
    """Measure known responses; only evidence-bound, closed task inventories are Complete."""
    executions = manifest.get('executions')
    legacy = executions is None
    if legacy:
        executions = [{'binding_id': 'legacy-response-set', 'role': 'unassigned',
                       'attempt': 1, **{k: manifest[k] for k in
                       ('thread_id', 'response_ids', 'turn_ids', 'turn_ids_unique_to_run') if k in manifest}}]
    if not isinstance(executions, list) or not executions:
        raise ValueError('At least one execution binding is required')
    ids = [x.get('binding_id') for x in executions]
    if any(not x for x in ids) or len(set(ids)) != len(ids):
        raise ValueError('Execution binding IDs must be unique and nonempty')
    required_roles = manifest.get('task_inventory', {}).get('required_roles', [])
    attestation = manifest.get('task_inventory', {})
    complete = (not legacy and manifest.get('scope') == 'task'
                and attestation.get('all_executions_listed') is True
                and bool(attestation.get('evidence_ref'))
                and bool(required_roles)
                and set(required_roles) <= {x.get('role') for x in executions})
    gaps, known, bindings, owner = [], {}, [], {}
    if not complete:
        gaps.append('Complete task execution inventory is not evidenced; measured response subtotal only.')
    for execution in executions:
        if execution.get('role') not in ('coordinator', 'worker', 'retry', 'verification') and not (legacy and execution.get('role') == 'unassigned'):
            raise ValueError('Unknown execution role')
        if type(execution.get('attempt')) is not int or execution['attempt'] < 1:
            raise ValueError('Each execution needs a positive attempt number')
        if not execution.get('response_ids') and not execution.get('turn_ids'):
            raise ValueError('Every execution needs explicit response or uniquely bound turn IDs')
        part = measure_response_set({**manifest, **execution}, source)
        rows = part.get('response_records', [])
        requested = set(execution.get('response_ids', []))
        observed = {x['response_id'] for x in rows}
        closed = (execution.get('turn_ids_unique_to_run') is True
                  and bool(execution.get('turn_ids')) and bool(execution.get('evidence_ref'))
                  and bool(rows) and not part.get('malformed_lines')
                  and set(tuple(x) for x in part.get('closed_turn_inventory', []))
                      == {(x['session_id'], x['response_id']) for x in rows}
                  and (not requested or requested == observed)
                  and {x['turn_id'] for x in rows} == set(execution.get('turn_ids', [])))
        if not closed or part['measurement_status'] != 'measured':
            complete = False
            gaps.append(execution['binding_id'] + ': ' + (part.get('availability_reason') or 'Execution boundary or response coverage incomplete.'))
        for record in rows:
            key = (record['session_id'], record['response_id'])
            if not all(key):
                complete = False
                gaps.append(execution['binding_id'] + ': response lacks session identity.')
            if key in known:
                if known[key]['usage'] != record['usage']:
                    raise ValueError('Conflicting usage across execution bindings')
                if owner[key] != execution['binding_id']:
                    complete = False
                    gaps.append('Response shared across bindings; counted once, role attribution is ambiguous.')
                continue
            known[key], owner[key] = record, execution['binding_id']
        bindings.append({'binding_id': execution['binding_id'], 'role': execution['role'],
                         'attempt': execution['attempt'], 'thread_id': execution.get('thread_id'),
                         'evidence_ref': execution.get('evidence_ref'), 'boundary_complete': closed,
                         'measurement_status': part['measurement_status'],
                         'usage_subtotal': part['usage'], 'response_ids': part.get('response_ids', []),
                         'configured_models': part.get('recorded_turn_models', []),
                         'configured_efforts': part.get('recorded_turn_reasoning_efforts', []),
                         'duplicate_records_skipped': part.get('duplicate_usage_records_skipped', 0)})
    subtotal = {field: None for field in FIELDS}
    if known:
        for field in FIELDS:
            values = [x['usage'].get(field) for x in known.values()]
            subtotal[field] = sum(values) if all(type(v) is int for v in values) else None
    complete = complete and bool(known) and not gaps
    return {'schema_version': 2, 'run_id': manifest['run_id'], 'environment': manifest['environment'],
            'measurement_status': 'measured' if known else 'unavailable',
            'usage_coverage': 'Complete' if complete else ('Partial' if known else 'Unavailable'),
            'measurement_scope': 'complete evidenced task' if complete else 'bound response subtotal',
            'availability_reason': None if complete else '; '.join(gaps),
            'usage': subtotal, 'measured_subtotal': subtotal,
            'task_usage': subtotal if complete else {field: None for field in FIELDS},
            'cost': None, 'cost_coverage': 'Unavailable',
            'response_records': list(known.values()),
            'response_ids': sorted({x['response_id'] for x in known.values()}),
            'bindings': bindings, 'actual_models': [], 'actual_reasoning_efforts': [],
            'recorded_turn_models': sorted({v for b in bindings for v in b['configured_models']}),
            'recorded_turn_reasoning_efforts': sorted({v for b in bindings for v in b['configured_efforts']}),
            'duplicate_usage_records_skipped': sum(x['duplicate_records_skipped'] for x in bindings),
            'actions': measure_response_set({**manifest, **executions[0]}, source).get('actions', []) if legacy else [],
            'warnings': ['Configured models do not prove response model identity. Actions have no measured marginal cost.'],
            'collected_at_utc': dt.datetime.now(dt.timezone.utc).isoformat()}


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('manifest', type=Path)
    parser.add_argument('--source', type=Path, required=True, help='Explicit local catalog directory; never scans the default account')
    parser.add_argument('--output', type=Path, required=True)
    args = parser.parse_args()
    data = measure(json.loads(args.manifest.read_text()), args.source)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(data, indent=2), encoding='utf-8')
    print(json.dumps({'output': str(args.output.resolve()), 'status': data['measurement_status'], 'reason': data['availability_reason']}))
