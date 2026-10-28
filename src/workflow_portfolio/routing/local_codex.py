"""Explicit, read-only Codex execution using existing ChatGPT authentication only."""
import argparse
import hashlib
import json
import os
import shutil
import subprocess
import tempfile
import time
from pathlib import Path
from .router import RoutingError, select_route, trace

def subscription_environment(environ):
    # No API-key or alternate-provider fallback, including inherited endpoints.
    return {k: v for k, v in environ.items() if not (k.endswith('API_KEY') or k.startswith(('OPENAI_', 'AZURE_OPENAI_', 'CODEX_API_')))}

def command(binary, decision, cwd):
    return [binary, 'exec', '--ignore-user-config', '--json', '--ephemeral',
            '--skip-git-repo-check', '--sandbox', 'read-only', '--cd', str(cwd),
            '--model', decision.model, '-c', 'model_provider="openai"',
            '-c', 'forced_login_method="chatgpt"',
            '-c', 'model_reasoning_effort=' + json.dumps(decision.effort), '-']

def parse_events(output):
    events = [json.loads(line) for line in output.splitlines() if line.strip()]
    completed = [e for e in events if e.get('type') == 'turn.completed']
    if len(completed) != 1 or any(e.get('type') in {'turn.failed', 'error'} for e in events):
        raise RoutingError('Expected exactly one completed turn with no error; do not retry blindly')
    answers = [e['item']['text'] for e in events if e.get('type') == 'item.completed'
               and e.get('item', {}).get('type') == 'agent_message']
    if not answers:
        raise RoutingError('No completed answer')
    usage = completed[0].get('usage')
    return '\n'.join(answers), usage

def execute(request, policy, capabilities, receipt, run=subprocess.run, environ=None):
    decision = select_route(request, policy, capabilities)
    env = subscription_environment(os.environ if environ is None else environ)
    binary = shutil.which('codex', path=env.get('PATH'))
    if not binary:
        raise RoutingError('Local Codex is unavailable')
    auth = run([binary, 'login', 'status'], env=env, capture_output=True, text=True, timeout=20)
    if auth.returncode or 'Logged in using ChatGPT' not in auth.stdout + auth.stderr:
        raise RoutingError('Existing ChatGPT sign-in required; API access will not be used')
    binding = hashlib.sha256(json.dumps({'request': request, 'policy': decision.policy_digest}, sort_keys=True).encode()).hexdigest()
    # Exclusive durable claim prevents duplicate dispatch, including after uncertain failure.
    receipt = Path(receipt)
    claim = {'binding': binding, 'status': 'dispatch_pending', 'route': trace(decision)}
    with os.fdopen(os.open(str(receipt), os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600), 'w') as out:
        json.dump(claim, out)
        out.flush()
        os.fsync(out.fileno())
    with tempfile.TemporaryDirectory(prefix='meridian-readonly-') as cwd:
        prompt = ('Bounded read-only text task. Do not use tools, change files, delegate, or perform external actions. '
                  'The coordinator owns capture. Apply the supplied task only and return the answer.\n\n' + request['text'])
        started = time.perf_counter()
        try:
            result = run(command(binary, decision, cwd), input=prompt, env=env,
                         capture_output=True, text=True, timeout=120)
            if result.returncode:
                claim['diagnostic'] = {'returncode': result.returncode, 'stderr': result.stderr, 'events': result.stdout}
                raise RoutingError('Codex execution failed; no automatic retry or API fallback')
            answer, usage = parse_events(result.stdout)
        except (subprocess.TimeoutExpired, RoutingError):
            claim['duration_ms'] = round((time.perf_counter() - started)*1000, 3)
            claim['status'] = 'failed_or_uncertain_no_retry'
            receipt.write_text(json.dumps(claim, indent=2))
            raise
    report = trace(decision)
    report['decision']['execution_status'] = 'completed'
    report.update({'status': 'completed', 'binding': binding, 'auth': 'chatgpt_subscription',
                   'policy_source': policy.get('source'),
                   'duration_ms': round((time.perf_counter() - started)*1000, 3),
                   'usage': usage, 'answer': answer, 'usage_scope': 'one_local_codex_turn',
                   'actual_identity_note': 'Explicit CLI settings accepted; independent backend model/effort not exposed by exec events'})
    receipt.write_text(json.dumps(report, indent=2) + '\n')
    return report

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    for name in ('policy', 'capabilities', 'request', 'receipt'):
        parser.add_argument('--' + name, required=True, type=Path)
    args = parser.parse_args()
    try:
        result = execute(json.loads(args.request.read_text()), json.loads(args.policy.read_text()),
                         json.loads(args.capabilities.read_text()), args.receipt)
        print(json.dumps(result, indent=2))
    except (RoutingError, OSError, ValueError, subprocess.TimeoutExpired) as error:
        parser.exit(2, str(error) + '\n')

if __name__ == '__main__':
    main()
