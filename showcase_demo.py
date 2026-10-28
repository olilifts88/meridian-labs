"""Recorded workflow showcase. Standard-library Python only; model execution disabled."""
import argparse
import sys
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parent/'src'))
from workflow_portfolio.showcase_server import make_server

if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--port',type=int,default=8766)
    args=parser.parse_args()
    with make_server(args.port,owner_review_enabled=False) as server:
        print(f'Open http://127.0.0.1:{server.server_port}',flush=True)
        print('Recorded AI answers only. No sign-in, API key or model calls. Press Ctrl+C to stop.',flush=True)
        try:server.serve_forever()
        except KeyboardInterrupt:pass
