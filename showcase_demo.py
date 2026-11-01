"""Recorded workflow showcase. Standard-library Python only; model execution disabled."""
import argparse
import sys
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parent/'src'))
from workflow_portfolio.web_demo import make_server

if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--port',type=int,default=8766)
    parser.add_argument('--offline',action='store_true',help='Use the last verified pricing snapshot without a web check')
    args=parser.parse_args()
    if not args.offline:
        from workflow_portfolio.usage.pricing_preflight import preflight
        result=preflight(Path(__file__).resolve().parent/'demo-web/data/rate-card.json')
        print('Pricing: '+result['status']+' · '+result['verified_on'],flush=True)
    with make_server(args.port,offline=args.offline) as server:
        print(f'Open http://127.0.0.1:{server.server_port}',flush=True)
        print('Workflow demo ready. Results stay in this browser. Press Ctrl+C to stop.',flush=True)
        try:server.serve_forever()
        except KeyboardInterrupt:pass
