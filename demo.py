"""Start the local portfolio demo from a downloaded source checkout."""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent / 'src'))
from workflow_portfolio.showcase import main

if __name__ == '__main__':
    raise SystemExit(main(sys.argv[1:] or ['serve']))
