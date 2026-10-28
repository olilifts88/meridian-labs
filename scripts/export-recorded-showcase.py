"""Export fictional model evidence only; no model calls or private review prose."""
import sys
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'src'))
from workflow_portfolio.recorded_showcase import export_snapshot
if __name__=='__main__':
    value=export_snapshot(Path(__file__).resolve().parents[1]/'private-data/ai-pilot')
    print('Exported',len(value['records']),'recorded answers. No model calls.')
