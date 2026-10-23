"""Compile a connector fetch into a pinned policy; never writes back to Notion."""
import argparse
import hashlib
import json
import re
from pathlib import Path
from .router import RoutingError

MODELS = {'GPT-6 Luna': 'gpt-6-luna', 'GPT-6.1 Sol': 'gpt-6.1-sol', 'GPT-6 Astra': 'gpt-6-astra'}

def compile_page(page, alias='summarisation'):
    if page.get('truncated') or page.get('unknown_block_count'):
        raise RoutingError('Incomplete source page')
    text = page['text']
    try:
        props = json.loads(re.search(r'<properties>\s*(.*?)\s*</properties>', text, re.S)[1])
        version = re.search(r'Current version:(?:</b>|\*\*)?\s*(v[\d.]+)', text)[1]
        section = text.split('## Model routing and default effort', 1)[1].split('## Shared guidance', 1)[0]
    except (TypeError, IndexError, ValueError) as error:
        raise RoutingError('Missing source properties, version or effort section') from error
    if props.get('Active status') != 'Active':
        raise RoutingError('Only Active skills can be compiled')
    efforts = dict(re.findall(r'\|\s*(Low|Medium|High)\s*\|\s*([^|\n]+?)\s*\|', section))
    routes = {}
    for tier in ('Low', 'Medium', 'High'):
        model = props.get(tier + ' Model Choice')
        if model == 'Not applicable':
            routes[tier] = {'enabled': False}
            continue
        effort = efforts.get(tier, '').lower()
        if model not in MODELS or effort not in {'low','medium','high','xhigh','max','ultra','minimal','none'}:
            raise RoutingError('Unresolved model/effort; inherited settings need an explicit runtime context')
        routes[tier] = {'enabled': True, 'model': MODELS[model], 'effort': effort}
    return {'schema_version': 1, 'revision': hashlib.sha256(text.encode()).hexdigest(),
            'source': {'kind': 'notion_connector_export', 'page_id': page['id'],
                       'last_edited_at': page.get('page_last_edited_at'), 'skill_name': props['Skill name']},
            'skills': {alias: {'active': True, 'version': version, 'routes': routes}}}

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--export', type=Path, required=True)
    parser.add_argument('--output', type=Path, required=True)
    args = parser.parse_args()
    policy = compile_page(json.loads(args.export.read_text()))
    args.output.write_text(json.dumps(policy, indent=2) + '\n')

if __name__ == '__main__':
    main()
