"""Fictional usage demo. Creates a temporary catalog, never reads account logs."""
import json
import sqlite3
import tempfile
from pathlib import Path
from .measure_run import measure
from .token_cost import summarise_costs
ROOT = Path(__file__).resolve().parents[3]
def main():
    with tempfile.TemporaryDirectory() as directory:
        root = Path(directory)
        fixture = ROOT / 'examples' / 'usage'
        log = root / 'demo.jsonl'
        log.write_text((fixture / 'response.jsonl').read_text())
        with sqlite3.connect(root / 'state_5.sqlite') as db:
            db.execute('CREATE TABLE threads (id TEXT, rollout_path TEXT)')
            db.execute('INSERT INTO threads VALUES (?,?)', ('demo-thread', str(log)))
        report = measure(json.loads((fixture / 'manifest.json').read_text()), root)
        row = dict(report['task_usage'], recorded_model='example-model', timestamp='2026-01-05T12:00:00Z', execution_kind='main')
        print(json.dumps({'synthetic':True, 'measurement':report, 'illustrative_cost':summarise_costs([row])}, indent=2))
if __name__ == '__main__':
    main()
