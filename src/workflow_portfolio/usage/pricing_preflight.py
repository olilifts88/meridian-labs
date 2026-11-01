"""Fetch only public official documentation; no model calls, credentials or business writes.

Fail closed on changed page/rule shapes. All models refresh atomically or retain
the last verified snapshot. Historical scenario snapshots are never rewritten.
"""
import argparse
import concurrent.futures
import copy
import datetime as dt
import hashlib
import html
import json
import re
import urllib.request
from pathlib import Path


def fetch_document(url):
    if not url.startswith('https://developers.openai.com/api/docs/'):
        raise ValueError('Only official OpenAI documentation is allowed')
    request = urllib.request.Request(url, headers={'User-Agent': 'Meridian-Pricing-Preflight/2'})
    with urllib.request.urlopen(request, timeout=12) as response:
        if not response.geturl().startswith('https://developers.openai.com/api/docs/'):
            raise ValueError('Unexpected documentation redirect')
        data = response.read(4_000_001)
    if len(data) > 4_000_000:
        raise ValueError('Documentation exceeds the size limit')
    return data.decode('utf-8')


def clean_document(text):
    text = re.sub(r'<script\b[^>]*>[\s\S]*?</script>', ' ', text, flags=re.I)
    return re.sub(r'\s+', ' ', html.unescape(re.sub(r'<[^>]+>', ' ', text)))


def parse_model_page(text, model, previous):
    clean = clean_document(text)
    if model not in clean or 'Text tokens' not in clean:
        raise ValueError('Model documentation shape changed')
    section = clean[clean.index('Text tokens'):][:5000]
    result = copy.deepcopy(previous)
    patterns = {'input': r'\bInput\s+\$([\d.]+)', 'cached': r'Cached input\s+\$([\d.]+)',
                'write_30m': r'Cache writes\s+\$([\d.]+)', 'output': r'\bOutput\s+\$([\d.]+)'}
    for key, pattern in patterns.items():
        match = re.search(pattern, section)
        if not match:
            raise ValueError('Official price could not be parsed: '+key)
        result[key] = float(match.group(1))
    for marker in ('272K', '2x input', '1.5x output'):
        if marker not in section:
            raise ValueError('Long-context billing rules need review')
    if not re.search(r'50% (?:lower|of Standard)', section) or not re.search(r'2x (?:Standard|the applicable)', section):
        raise ValueError('Processing-tier billing rules need review')
    if abs(result['write_30m']-result['input']*1.25) > 1e-9:
        raise ValueError('Cache-write billing rule changed')
    if 'ultrafast' in result['tiers'] and not re.search(r'6x Standard', section) and 'Ultrafast' not in clean:
        raise ValueError('Ultrafast pricing needs review')
    result['write_12h'] = result['input']*2.5
    return result


def refresh(card, fetcher=fetch_document):
    cache_doc = clean_document(fetcher(card['cache_source']))
    if not re.search(r'2\.5[×x]', cache_doc) or '12-hour' not in cache_doc:
        raise ValueError('Cache-lifetime prices need review')
    candidate = copy.deepcopy(card)
    def model(item):
        name, old = item
        text = fetcher(old['source'])
        return name, parse_model_page(text, name, old), hashlib.sha256(text.encode()).hexdigest()
    with concurrent.futures.ThreadPoolExecutor(max_workers=5) as pool:
        results = list(pool.map(model, card['models'].items()))
    candidate['source_digests'] = {}
    for name, value, digest in results:
        candidate['models'][name] = value
        candidate['source_digests'][name] = digest
    now = dt.datetime.now(dt.timezone.utc)
    candidate.update(verified_on=now.date().isoformat(), checked_at=now.isoformat(),
                     id='openai-usd-'+now.strftime('%Y-%m-%dT%H%M%SZ')+'-verified')
    return candidate


def preflight(path, fetcher=fetch_document):
    path = Path(path)
    original = json.loads(path.read_text())
    try:
        fresh = refresh(original, fetcher)
    except (ValueError, OSError, TimeoutError) as error:
        return {'status': 'saved_rates', 'verified_on': original['verified_on'],
                'rate_card_id': original['id'], 'reason': str(error), 'model_calls': 0}
    history = path.parent/'rate-history'
    history.mkdir(exist_ok=True)
    archive = history/(hashlib.sha256(path.read_bytes()).hexdigest()+'.json')
    if not archive.exists():
        archive.write_text(json.dumps(original, indent=2)+'\n')
    pending = path.with_suffix('.pending')
    pending.write_text(json.dumps(fresh, indent=2)+'\n')
    pending.replace(path)
    return {'status': 'verified', 'verified_on': fresh['verified_on'],
            'rate_card_id': fresh['id'], 'model_calls': 0}


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--card', type=Path, default=Path(__file__).with_name('openai-rate-card.json'))
    print(json.dumps(preflight(parser.parse_args().card), indent=2))
