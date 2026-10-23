"""Thin local bootstrap. Canonical policy is referenced, not copied here."""
import argparse
import json
import re
import sys
from urllib.parse import urlparse

def render_hook(event, guidance_url):
    url = urlparse(guidance_url)
    if url.scheme != 'https' or not url.hostname or url.username or url.password or any(c in guidance_url for c in '\r\n'):
        raise ValueError('A plain HTTPS guidance URL is required')
    if event.get('hook_event_name') != 'UserPromptSubmit':
        return {}
    context = 'Before this request, read and follow the current canonical guidance: ' + guidance_url
    model = event.get('model')
    if isinstance(model, str) and re.fullmatch(r'[A-Za-z0-9._/-]{1,100}', model):
        context += '\nLocal hook runtime field model=' + model + '. This is client-reported model evidence; reasoning effort and backend identity are not exposed here.'
    return {'hookSpecificOutput': {'hookEventName': 'UserPromptSubmit', 'additionalContext': context}}

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--guidance-url', required=True)
    args = parser.parse_args()
    print(json.dumps(render_hook(json.load(sys.stdin), args.guidance_url)))

if __name__ == '__main__':
    main()
