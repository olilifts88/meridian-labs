"""Local CLI for a fictional, fully offline demonstration."""

import argparse
import json
import sys
import tempfile
from pathlib import Path
from typing import Any

from .domain import InputError
from .evals import evaluate_cases
from .service import review, submit
from .store import Store


ROOT = Path(__file__).resolve().parents[2]


def _load(path: Path) -> Any:
    with path.open(encoding="utf-8") as handle:
        return json.load(handle)


def _decision_dict(decision: Any) -> dict:
    return {
        "record_id": decision.record_id[:12],
        "state": decision.state,
        "duplicate": decision.duplicate,
        "findings": [f.code for f in decision.findings],
    }


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    sub = parser.add_subparsers(dest="command", required=True)
    submit_cmd = sub.add_parser("submit", help="Validate and save a draft")
    submit_cmd.add_argument("candidate", type=Path)
    submit_cmd.add_argument("--db", required=True)
    review_cmd = sub.add_parser("review", help="Record an engineer decision on a new guide")
    review_cmd.add_argument("record_id")
    review_cmd.add_argument("--reviewer", required=True)
    review_cmd.add_argument("--approve", action="store_true")
    review_cmd.add_argument("--db", required=True)
    report_cmd = sub.add_parser("report", help="Show stored states and audit events")
    report_cmd.add_argument("--db", required=True)
    sub.add_parser("demo", help="Run the synthetic workflow end to end")
    sub.add_parser("benchmark", help="Compare saved outputs on matched cases")
    args = parser.parse_args()
    try:
        if args.command == "benchmark":
            print(json.dumps(evaluate_cases(_load(ROOT / "examples" / "benchmark.json")), indent=2))
            return 0
        if args.command == "demo":
            with tempfile.TemporaryDirectory() as directory:
                store = Store(str(Path(directory) / "demo.sqlite3"))
                try:
                    for name in ("beta_csv_bad", "beta_csv_good", "new_guide"):
                        decision = submit(_load(ROOT / "examples" / (name + ".json")), store)
                        print(name, json.dumps(_decision_dict(decision)))
                        if name == "new_guide":
                            print("engineer review", review(decision.record_id, "engineer-demo", True, store))
                    print("summary", json.dumps(store.summary(), sort_keys=True))
                    print("audit events", len(store.events()))
                finally:
                    store.close()
            return 0
        store = Store(args.db)
        try:
            if args.command == "submit":
                print(json.dumps(_decision_dict(submit(_load(args.candidate), store)), indent=2))
            elif args.command == "review":
                print(review(args.record_id, args.reviewer, args.approve, store))
            elif args.command == "report":
                print(json.dumps({"states": store.summary(), "events": store.events()}, indent=2))
        finally:
            store.close()
        return 0
    except (InputError, OSError, ValueError, json.JSONDecodeError) as error:
        print("Input or workflow error: " + str(error), file=sys.stderr)
        return 2


if __name__ == "__main__":
    raise SystemExit(main())
