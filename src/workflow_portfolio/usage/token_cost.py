"""Illustrative USD token valuation; inject an independently verified rate card; no network or model calls.

Recorded model labels are not independent runtime attestations. Missing/unknown
models or categories remain unpriced. Never count subset counters twice.
"""
import datetime as dt
from decimal import Decimal
from pathlib import Path
from zoneinfo import ZoneInfo
import json
CARD = json.loads(Path(__file__).with_name('example-rate-card.json').read_text())

def estimate(row, card=None):
    card = CARD if card is None else card
    rate = card['models'].get(row.get('recorded_model'))
    if not rate: return None, 'Unknown or unsupported recorded model'
    keys = ['input_tokens','cached_input_tokens','output_tokens','total_tokens','cache_write_input_tokens','reasoning_output_tokens']
    if not all(type(row.get(k)) is int and row[k] >= 0 for k in keys): return None, 'Missing or invalid token category'
    i,c,o,w = [row[k] for k in ('input_tokens','cached_input_tokens','output_tokens','cache_write_input_tokens')]
    if c > i or row['reasoning_output_tokens'] > o or i+o != row['total_tokens']: return None, 'Token categories do not reconcile'
    # Nonzero cache writes have not been semantically reconciled with Codex input.
    if w: return None, 'Nonzero cache writes need verified category semantics'
    long = i > card['long_context_threshold']
    m = Decimal(str(card.get('long_context_input_multiplier', 1))) if long else Decimal(1); om = Decimal(str(card.get('long_context_output_multiplier', 1))) if long else Decimal(1)
    return ((i-c)*Decimal(str(rate['input']))*m + c*Decimal(str(rate['cached']))*m + o*Decimal(str(rate['output']))*om)/Decimal(1000000), None

def summarise_costs(rows, card=None):
    card = CARD if card is None else card
    groups = {}; models = {}; priced = Decimal(0); unpriced = 0; eligible = 0; excluded = 0; reasons={}
    def add(target,key,r,cost):
        b=target.setdefault(key,{'tokens':0,'uncached_input':0,'cached_input':0,'output':0,'responses':0,'priced_tokens':0,'unpriced_tokens':0,'estimated_usd':Decimal(0)})
        b['tokens']+=r['total_tokens'];b['uncached_input']+=r['input_tokens']-r['cached_input_tokens'];b['cached_input']+=r['cached_input_tokens'];b['output']+=r['output_tokens'];b['responses']+=1
        b['unpriced_tokens' if cost is None else 'priced_tokens']+=r['total_tokens']
        if cost is not None:b['estimated_usd']+=cost
    for r in rows:
        if r.get('execution_kind')=='internal guardian': excluded+=r['total_tokens'];continue
        eligible+=r['total_tokens'];cost,reason=estimate(r,card)
        if cost is None:unpriced+=r['total_tokens'];reasons[reason]=reasons.get(reason,0)+1
        else:priced+=cost
        add(models,r.get('recorded_model') or 'Unknown',r,cost)
        try:
            date=dt.datetime.fromisoformat(r['timestamp'].replace('Z','+00:00')).astimezone(ZoneInfo('Europe/London')).date()
            week=(date-dt.timedelta(days=date.weekday())).isoformat()
        except (ValueError,TypeError,KeyError):week='Undated'
        add(groups,week,r,cost)
    def finish(d,key):
        return [{key:k,**{a:(str(v) if isinstance(v,Decimal) else v) for a,v in b.items()}} for k,b in sorted(d.items())]
    return {'rate_card_id':card['id'],'rate_card_date':card['verified_on'],'basis':card['basis'],
            'estimated_usd':str(priced) if eligible>unpriced else None,'eligible_tokens':eligible,'priced_tokens':eligible-unpriced,
            'unpriced_tokens':unpriced,'excluded_guardian_tokens':excluded,'coverage':'Complete for recorded eligible subtotal' if not unpriced and eligible else 'Partial' if eligible>unpriced else 'Unavailable',
            'unpriced_reasons':reasons,'weekly':finish(groups,'week'),'models':finish(models,'model')}
