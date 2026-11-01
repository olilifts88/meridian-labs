"""Exact, offline USD token valuation. Model usage/identity and cash billing are separate evidence."""
from decimal import Decimal


def estimate(row, card):
    model = row.get('model') or row.get('recorded_model')
    rate = card['models'].get(model)
    if not rate:
        return None, 'Unknown or unsupported recorded model'
    keys = ('input_tokens', 'cached_input_tokens', 'output_tokens',
            'reasoning_output_tokens', 'cache_write_input_tokens')
    if any(type(row.get(k)) is not int or row[k] < 0 for k in keys):
        return None, 'Missing or invalid token category'
    i, c, o, r, w = (row[k] for k in keys)
    if c+w > i or r > o or row.get('total_tokens', i+o) != i+o:
        return None, 'Token categories do not reconcile'
    if row.get('effort') and row['effort'] not in rate['efforts']:
        return None, 'Unsupported effort for this model'
    a = b = 0
    if w:
        if row.get('cache_write_semantics') != 'openai-input-subset-v1':
            return None, 'Cache-write counter semantics are unverified'
        a, b = row.get('cache_write_30m_tokens'), row.get('cache_write_12h_tokens')
        if type(a) is not int or type(b) is not int or a < 0 or b < 0 or a+b != w:
            return None, 'Cache-write lifetimes are missing or inconsistent'
    tier = row.get('processing_tier', 'standard')
    if tier not in rate['tiers']:
        return None, 'Unsupported processing tier'
    region = row.get('region', 'global')
    if region not in ('global', 'regional', 'fedramp'):
        return None, 'Unknown pricing region'
    if region == 'regional' and tier in rate.get('unsupported_regional_tiers', []):
        return None, 'Regional processing is unavailable for this tier'
    long = i > rate['long_context_threshold']
    im = Decimal(str(rate['long_input_multiplier'])) if long else Decimal(1)
    om = Decimal(str(rate['long_output_multiplier'])) if long else Decimal(1)
    weighted = ((i-c-w)*Decimal(str(rate['input'])) + c*Decimal(str(rate['cached']))
                + a*Decimal(str(rate['write_30m'])) + b*Decimal(str(rate['write_12h']))) * im
    weighted += o*Decimal(str(rate['output']))*om
    region_multiplier = Decimal(str(card['regional_multiplier'])) if region != 'global' else Decimal(1)
    return weighted*Decimal(str(rate['tiers'][tier]))*region_multiplier/Decimal(1000000), None


def estimate_task(rows, card, inventory_complete=False):
    seen, by_role, by_model_effort, gaps = {}, {}, {}, []
    subtotal, priced, duplicates = Decimal(0), 0, 0
    for row in rows:
        key = (row.get('session_id'), row.get('response_id'))
        if not all(key):
            gaps.append('Missing response identity')
            continue
        if key in seen:
            if seen[key] != row:
                raise ValueError('Conflicting duplicate response')
            duplicates += 1
            continue
        seen[key] = row
        cost, reason = estimate(row, card)
        if reason:
            gaps.append(reason)
            continue
        subtotal += cost
        priced += 1
        for group, label in ((by_role, row.get('role', 'unassigned')),
                             (by_model_effort, (row.get('model') or row.get('recorded_model'), row.get('effort', 'Unknown')))):
            group[label] = group.get(label, Decimal(0)) + cost
    complete = inventory_complete and bool(seen) and not gaps
    value = str(subtotal) if priced else None
    return {'estimated_usd': value if complete else None, 'measured_subtotal_usd': value,
            'coverage': 'Complete' if complete else 'Partial' if priced else 'Unavailable',
            'gaps': gaps, 'duplicate_records_skipped': duplicates,
            'by_role': {k: str(v) for k, v in by_role.items()},
            'by_model_effort': [{'model': k[0], 'effort': k[1], 'estimated_usd': str(v)} for k, v in by_model_effort.items()],
            'rate_card_id': card['id'], 'actual_charge': None, 'tool_charges': None}
