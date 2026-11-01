"""Serve the same public workflow assets as the hosted demo, on loopback only."""
import json
import threading
import time
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlsplit
from .usage.pricing_preflight import preflight

PUBLIC = Path(__file__).resolve().parents[2] / 'demo-web'


class Handler(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-cache')
        self.send_header('X-Content-Type-Options', 'nosniff')
        super().end_headers()

    def do_GET(self):
        path = urlsplit(self.path).path
        if path == '/api/pricing/preflight':
            with self.server.pricing_lock:
                if self.server.offline:
                    status = {'status': 'saved_rates', 'reason': 'Offline mode uses the saved rate card.'}
                elif time.monotonic() - self.server.pricing_checked < 900:
                    status = self.server.pricing_status
                else:
                    status = preflight(PUBLIC / 'data/rate-card.json')
                    self.server.pricing_status = status
                    self.server.pricing_checked = time.monotonic()
                card = json.loads((PUBLIC / 'data/rate-card.json').read_text())
                payload = json.dumps(dict(status, card=card)).encode()
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Content-Length', str(len(payload)))
            self.end_headers()
            self.wfile.write(payload)
        elif path.startswith('/api/'):
            self.send_error(404, 'No such public demo endpoint')
        else:
            super().do_GET()

    def do_POST(self):
        self.send_error(405, 'This demo does not accept server-side writes')


def make_server(port=8766, offline=False):
    server = ThreadingHTTPServer(('127.0.0.1', port), partial(Handler, directory=str(PUBLIC)))
    server.offline = offline
    server.pricing_lock = threading.Lock()
    server.pricing_checked = 0
    server.pricing_status = None
    return server
