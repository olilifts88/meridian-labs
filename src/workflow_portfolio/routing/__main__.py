"""Offline route preview. Never invokes a model or reads an account token."""
import argparse
import json
from pathlib import Path
from .router import RoutingError, select_route, trace

def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument('--policy', required=True, type=Path)
    p.add_argument('--capabilities', required=True, type=Path)
    p.add_argument('--request', required=True, type=Path)
    args = p.parse_args()
    try:
        result = select_route(json.loads(args.request.read_text()), json.loads(args.policy.read_text()), json.loads(args.capabilities.read_text()))
        print(json.dumps(trace(result), indent=2))
        return 0
    except (RoutingError, ValueError, OSError) as error:
        p.exit(2, 'Route unavailable: ' + str(error) + '\n')
if __name__ == '__main__':
    raise SystemExit(main())
