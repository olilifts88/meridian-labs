"""Loopback-only browser surface for fictional, offline workflow examples."""
import json
import hashlib
import threading
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlsplit
from .showcase import FIXTURES, FLOWS, load_json, run

HTML = Path(__file__).with_name('showcase.html')
ASSET_ROOT = Path(__file__).resolve().parents[2] / 'assets'


class ModelReviewSession:
    """Explicitly enabled server-side runner. A finite session budget and no retries."""
    def __init__(self, policy, capabilities, receipt_dir, max_calls):
        if type(max_calls) is not int or not 1 <= max_calls <= 10:
            raise ValueError('Live model review budget must be 1 to 10 calls')
        from .routing.router import validate_policy
        validate_policy(policy, capabilities)
        self.policy, self.capabilities = policy, capabilities
        self.receipts = Path(receipt_dir)
        self.receipts.mkdir(parents=True, exist_ok=True)
        self.remaining = max_calls
        self.lock = threading.Lock()
        self.saved = {}

    def apply(self, result):
        from .showcase_review import review, parse_assessment, REVIEW_VERSION
        from .showcase_assurance import review_request
        from .routing.router import select_route, trace
        selected = select_route(review_request(result['flow'],result),self.policy,self.capabilities)
        result['routing']['model_review'] = trace(selected)
        result['routing']['policy_source'] = self.policy.get('source')
        result['routing']['policy_revision'] = self.policy['revision']
        key = hashlib.sha256((result['run_fingerprint']+selected.policy_digest+REVIEW_VERSION).encode()).hexdigest()
        with self.lock:
            cached = key in self.saved
            if cached:
                report = self.saved[key]
            elif result['output_gate'] == 'held_by_evaluation' or result['status'] in ('blocked','needs_evidence','incomplete'):
                report = {'status':'skipped_output_held','model_called':False}
            else:
                receipt = self.receipts / (key + '.json')
                if receipt.exists():
                    try:
                        saved = json.loads(receipt.read_text())
                        if saved.get('status') != 'completed':
                            raise ValueError('Incomplete receipt')
                        report = {'status':'completed','model_called':True,'receipt':saved,
                                  'assessment':parse_assessment(saved['answer'])}
                        cached = True
                    except (ValueError,KeyError):
                        report = {'status':'existing_uncertain_receipt_no_retry','model_called':None}
                elif self.remaining == 0:
                    report = {'status':'session_budget_exhausted','model_called':False}
                else:
                    self.remaining -= 1
                    try:
                        response = review(result,self.policy,self.capabilities,receipt,live=True)
                        report = {'status':'completed','model_called':True,'receipt':response['review'],
                                  'assessment':response['assessment']}
                    except Exception as error:
                        report = {'status':'failed_or_uncertain_no_retry','model_called':None,
                                  'detail':type(error).__name__+': live review did not complete; inspect private receipts. No automatic retry.'}
                self.saved[key] = report
            called_now = False if cached else report['model_called']
            result['live_model_review'] = dict(report,cached=cached,model_called_this_run=called_now)
            result['routing']['model_called'] = called_now
            result['routing']['session_calls_remaining'] = self.remaining
            if report['status'] == 'completed':
                result['routing']['model_review'] = report['receipt']
                result['routing']['reason'] = 'Configured Notion policy selected the model; review completed.'
                if report['assessment']['verdict'] == 'hold':
                    result['output_gate'] = 'held_by_model_review'
                    result['status'] = 'held_by_model_review'
                elif result['flow']=='release-notes' and not result['review_required']:
                    delivery_dir = self.receipts / 'local-release-feed'
                    delivery_dir.mkdir(exist_ok=True)
                    delivery_path = delivery_dir / (key+'.json')
                    delivery = {'id':key,'destination':'local_demo_release_feed',
                        'headline':result['draft']['headline'],'body':result['draft']['body'],
                        'external_publication':False}
                    try:
                        with delivery_path.open('x') as output:
                            json.dump(delivery,output,indent=2)
                        duplicate = False
                    except FileExistsError:
                        duplicate = True
                    result['output_gate'] = 'automated_local_delivery'
                    result['status'] = 'automated_release'
                    result['summary'] = 'Routine release note passed checks and was delivered to the local demo release feed.'
                    result['delivery_record'] = dict(delivery,duplicate=duplicate)
            elif result['status'] not in ('blocked','needs_evidence','incomplete'):
                result['output_gate'] = 'awaiting_model_review'
            result['audit'].append({'stage':'live model review','outcome':report['status']})
            if result.get('delivery_record'):
                result['audit'].append({'stage':'automatic delivery','outcome':'local release feed; repeated runs reuse the same delivery ID'})
            return result


class Handler(BaseHTTPRequestHandler):
    def log_message(self, *_):
        pass  # Do not log reviewer input or source contents.

    def reply(self, status, body, content_type='application/json; charset=utf-8'):
        data = body.encode('utf-8')
        self.send_response(status)
        self.send_header('Content-Type', content_type)
        self.send_header('Content-Length', str(len(data)))
        self.send_header('Cache-Control', 'no-store')
        self.send_header('X-Content-Type-Options', 'nosniff')
        self.send_header('X-Frame-Options', 'DENY')
        self.send_header('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; connect-src 'self'; img-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'")
        self.end_headers()
        self.wfile.write(data)

    def trusted_request(self):
        allowed = {'127.0.0.1:' + str(self.server.server_port), 'localhost:' + str(self.server.server_port)}
        host = self.headers.get('Host', '')
        origin = self.headers.get('Origin')
        return host in allowed and (origin is None or origin in {'http://' + h for h in allowed})

    def do_GET(self):
        if not self.trusted_request():
            return self.reply(403, '{"error":"Local origin required"}')
        path = urlsplit(self.path).path
        assets = {
            '/assets/studio.css': (HTML.with_name('studio.css'), 'text/css; charset=utf-8'),
            '/assets/meridian-labs-banner.svg': (ASSET_ROOT / 'meridian-labs-banner.svg', 'image/svg+xml; charset=utf-8'),
            '/assets/meridian-labs-lockup.svg': (ASSET_ROOT / 'meridian-labs-lockup.svg', 'image/svg+xml; charset=utf-8'),
            '/assets/demo-banner.css': (HTML.with_name('demo_banner.css'), 'text/css; charset=utf-8'),
            '/assets/run-explorer.css': (HTML.with_name('run_explorer.css'), 'text/css; charset=utf-8'),
            '/assets/run-explorer.mjs': (HTML.with_name('run_explorer.mjs'), 'text/javascript; charset=utf-8'),
            '/assets/visitor-results.mjs': (HTML.with_name('visitor_results.mjs'), 'text/javascript; charset=utf-8'),
            '/assets/design-options.css': (HTML.with_name('design_options.css'), 'text/css; charset=utf-8'),
            '/assets/design-options.mjs': (HTML.with_name('design_options.mjs'), 'text/javascript; charset=utf-8'),
        }
        if path in assets:
            asset, content_type = assets[path]
            if not asset.is_file():
                return self.reply(404, '{"error":"This optional asset is not part of this download."}')
            return self.reply(200, asset.read_text(encoding='utf-8'), content_type)
        if path == '/':
            return self.reply(200, HTML.with_name('workflow_home.html').read_text(encoding='utf-8'), 'text/html; charset=utf-8')
        if path == '/workflows':
            return self.reply(200, HTML.read_text(encoding='utf-8'), 'text/html; charset=utf-8')
        if path in ('/runs','/scenarios','/results','/saved-results'):
            return self.reply(200, HTML.with_name('run_explorer.html').read_text(encoding='utf-8'), 'text/html; charset=utf-8')
        if path == '/design-options':
            design=HTML.with_name('design_options.html')
            if not design.is_file():
                return self.reply(404, '{"error":"Design studies are separate from the workflow download."}')
            return self.reply(200, design.read_text(encoding='utf-8'), 'text/html; charset=utf-8')
        if path == '/api/recorded-runs':
            from .recorded_showcase import catalog
            try:
                return self.reply(200, json.dumps(catalog(self.server.recorded_snapshot)))
            except (ValueError, KeyError, OSError, TypeError):
                return self.reply(409, '{"error":"The recorded example snapshot is missing or invalid. No AI call was made."}')
        if path == '/calls':
            return self.reply(200, HTML.with_name('call_crm.html').read_text(encoding='utf-8'), 'text/html; charset=utf-8')
        if path == '/evaluation':
            return self.reply(200, HTML.with_name('evaluation.html').read_text(encoding='utf-8'), 'text/html; charset=utf-8')
        if path == '/evaluation/review':
            if not self.server.owner_review_enabled:
                return self.reply(403, '{"error":"The private owner review queue is not part of this download."}')
            return self.reply(200, HTML.with_name('pilot_review.html').read_text(encoding='utf-8'), 'text/html; charset=utf-8')
        if path == '/api/pilot':
            if not self.server.owner_review_enabled:
                from .recorded_showcase import pilot_summary
                return self.reply(200, json.dumps(pilot_summary(self.server.recorded_snapshot)))
            from .ai_pilot import report
            try:
                return self.reply(200, json.dumps(report(self.server.pilot_directory)))
            except (ValueError, KeyError, OSError, TypeError):
                return self.reply(409, '{"error":"Saved pilot evidence needs checking; no model was called."}')
        if path == '/api/evaluations':
            from .showcase_evaluation import evaluate_suite
            return self.reply(200, json.dumps(evaluate_suite()))
        if path == '/api/sources':
            return self.reply(200, json.dumps(load_json(FIXTURES / 'knowledge.json')))
        if path == '/api/fixtures':
            return self.reply(200, json.dumps({f: load_json(FIXTURES / filename) for f, filename in
                [('vulnerabilities', 'vulnerabilities.json'), ('questionnaire', 'questionnaire.json'), ('soc2', 'soc2.json')]}))
        if path == '/api/benchmarks':
            from .evals import frozen_workflow_cases, candidate_from_reference, compare_workflow_candidates
            bundle = frozen_workflow_cases()
            candidates = [candidate_from_reference(bundle),
                          candidate_from_reference(bundle, 'deliberately-corrupted-fixture', corrupt=True)]
            return self.reply(200, json.dumps(compare_workflow_candidates(bundle, candidates)))
        return self.reply(404, '{"error":"Not found"}')

    def do_POST(self):
        if not self.trusted_request():
            return self.reply(403, '{"error":"Local origin required"}')
        path = urlsplit(self.path).path
        if path not in ('/api/calls', '/api/pilot/review', '/api/scenario') and (not path.startswith('/api/run/') or path.removeprefix('/api/run/') not in FLOWS):
            return self.reply(404, '{"error":"Unknown workflow"}')
        if self.headers.get_content_type() != 'application/json':
            return self.reply(415, '{"error":"JSON body required"}')
        try:
            length = int(self.headers.get('Content-Length', '0'))
            if not 0 < length <= 65536:
                return self.reply(413, '{"error":"Use an input smaller than 64 KiB"}')
            body = json.loads(self.rfile.read(length))
            if not isinstance(body, dict):
                raise ValueError('Input must be a JSON object')
            if path == '/api/scenario':
                from .recorded_showcase import run_scenario
                return self.reply(200, json.dumps(run_scenario(body, self.server.recorded_snapshot)))
            if path == '/api/pilot/review':
                if not self.server.owner_review_enabled:
                    return self.reply(403, '{"error":"Private owner review writes are disabled in this download."}')
                from .ai_pilot import review
                return self.reply(200, json.dumps(review(self.server.pilot_directory, body)))
            if path == '/api/calls':
                from .call_crm import simulate
                return self.reply(200, json.dumps(simulate(through=body.get('through', 4), decisions=body.get('decisions'))))
            result = run(path.removeprefix('/api/run/'), body.get('options', {}), payload=body.get('input'))
            if self.server.model_review_session is not None:
                result = self.server.model_review_session.apply(result)
            return self.reply(200, json.dumps(result))
        except (ValueError, TypeError, KeyError) as e:
            return self.reply(400, json.dumps({'error': str(e)}))


def make_server(port=8765, model_review_session=None, pilot_directory=None, recorded_snapshot=None, owner_review_enabled=True):
    if not isinstance(port, int) or not 0 <= port <= 65535:
        raise ValueError('Choose a valid local port')
    server = ThreadingHTTPServer(('127.0.0.1', port), Handler)
    server.daemon_threads = True
    server.model_review_session = model_review_session
    from .recorded_showcase import SNAPSHOT
    server.recorded_snapshot = recorded_snapshot if recorded_snapshot is not None else SNAPSHOT
    server.owner_review_enabled = owner_review_enabled
    from .ai_pilot import DEFAULT_DIRECTORY
    server.pilot_directory = pilot_directory if pilot_directory is not None else DEFAULT_DIRECTORY
    return server


def serve_local(port=8765, model_review_session=None):
    with make_server(port, model_review_session) as server:
        print('Meridian Labs local demo: http://127.0.0.1:' + str(server.server_port), flush=True)
        print('Fictional data. '+('Live subscription model reviews enabled; private receipts saved.' if model_review_session else
              'Offline mode: no external calls or writes.')+' Press Ctrl+C to stop.', flush=True)
        try:
            server.serve_forever()
        except KeyboardInterrupt:
            pass
    return 0
