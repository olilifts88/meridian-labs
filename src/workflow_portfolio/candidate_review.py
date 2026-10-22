"""Local state for announcement-candidate review, separate from publication policy."""

import json
import re
import sqlite3
from datetime import datetime, timezone
from typing import Any, Dict, List

from .domain import InputError


KEY = re.compile(r"^[a-z0-9]+(?:-[a-z0-9]+)*$")
PR = re.compile(r"^https://example\.invalid/prs/[1-9][0-9]*$")
EVENT = re.compile(r"^[A-Z0-9_]{2,40}:[0-9]{10,16}\.[0-9]{1,8}$")
FINAL = {"announced", "declined"}
DECISIONS = FINAL | {"deferred"}


def _now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def _candidate(candidate: Dict[str, Any]) -> Dict[str, Any]:
    if not isinstance(candidate, dict):
        raise InputError("Candidate must be an object")
    key = candidate.get("feature_key")
    prs = candidate.get("prs")
    availability = candidate.get("availability")
    if not isinstance(key, str) or len(key) > 80 or not KEY.fullmatch(key):
        raise InputError("Candidate needs a stable feature key")
    if not isinstance(prs, list) or not 1 <= len(prs) <= 5 or any(
        not isinstance(url, str) or not PR.fullmatch(url) for url in prs
    ) or len(prs) != len(set(prs)):
        raise InputError("Candidate needs unique fictional PR links")
    if not isinstance(availability, dict) or availability.get("stage") not in {"beta", "ga"}:
        raise InputError("Candidate needs confirmed availability")
    cohorts = availability.get("cohorts")
    if not isinstance(cohorts, list) or len(cohorts) > 5 or any(
        not isinstance(name, str) or not name.strip() or len(name) > 60 for name in cohorts
    ) or (availability["stage"] == "beta" and not cohorts) or (availability["stage"] == "ga" and cohorts):
        raise InputError("Invalid release cohorts")
    for field, limit in (("title", 150), ("summary", 500)):
        value = candidate.get(field)
        if not isinstance(value, str) or not value.strip() or len(value) > limit:
            raise InputError("Candidate needs a short " + field)
    return candidate


def _action(action: Dict[str, Any]) -> Dict[str, str]:
    if not isinstance(action, dict):
        raise InputError("Review action must be an object")
    event_id = action.get("event_id")
    key = action.get("feature_key")
    decision = action.get("decision")
    reviewer = action.get("reviewer")
    if not isinstance(event_id, str) or not EVENT.fullmatch(event_id):
        raise InputError("Invalid review event ID")
    if not isinstance(key, str) or not KEY.fullmatch(key):
        raise InputError("Invalid candidate key")
    if decision not in DECISIONS:
        raise InputError("Unknown review decision")
    if not isinstance(reviewer, str) or event_id.split(":", 1)[0] != reviewer:
        raise InputError("Reviewer does not match event ID")
    return {"event_id": event_id, "feature_key": key, "decision": decision, "reviewer": reviewer}


class CandidateReviewStore:
    def __init__(self, path: str) -> None:
        self.connection = sqlite3.connect(path)
        self.connection.row_factory = sqlite3.Row
        self.connection.execute("PRAGMA foreign_keys = ON")
        self.connection.executescript(
            """
            CREATE TABLE IF NOT EXISTS candidates (
                feature_key TEXT PRIMARY KEY,
                source_json TEXT NOT NULL,
                state TEXT NOT NULL,
                updated_at TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS candidate_pr_links (
                url TEXT PRIMARY KEY,
                feature_key TEXT NOT NULL REFERENCES candidates(feature_key)
            );
            CREATE TABLE IF NOT EXISTS candidate_review_events (
                event_id TEXT PRIMARY KEY,
                feature_key TEXT NOT NULL REFERENCES candidates(feature_key),
                decision TEXT NOT NULL,
                reviewer TEXT NOT NULL,
                occurred_at TEXT NOT NULL
            );
            """
        )

    def close(self) -> None:
        self.connection.close()

    def register(self, candidate: Dict[str, Any]) -> bool:
        candidate = _candidate(candidate)
        key = candidate["feature_key"]
        saved = json.dumps(candidate, sort_keys=True)
        try:
            self.connection.execute("BEGIN IMMEDIATE")
            existing = self.connection.execute(
                "SELECT source_json FROM candidates WHERE feature_key = ?", (key,)
            ).fetchone()
            if existing:
                if existing["source_json"] != saved:
                    raise InputError("Candidate changed after review registration")
                self.connection.commit()
                return False
            if any(self.connection.execute(
                "SELECT 1 FROM candidate_pr_links WHERE url = ?", (url,)
            ).fetchone() for url in candidate["prs"]):
                raise InputError("PR link already belongs to another candidate")
            self.connection.execute(
                "INSERT INTO candidates VALUES (?, ?, ?, ?)", (key, saved, "pending", _now())
            )
            self.connection.executemany(
                "INSERT INTO candidate_pr_links VALUES (?, ?)",
                [(url, key) for url in candidate["prs"]],
            )
            self.connection.commit()
            return True
        except Exception:
            self.connection.rollback()
            raise

    def decide(self, action: Dict[str, Any]) -> Dict[str, Any]:
        action = _action(action)
        key = action["feature_key"]
        try:
            self.connection.execute("BEGIN IMMEDIATE")
            old_event = self.connection.execute(
                "SELECT * FROM candidate_review_events WHERE event_id = ?", (action["event_id"],)
            ).fetchone()
            if old_event:
                if any(old_event[field] != action[field] for field in action):
                    raise InputError("Review event ID was reused with different content")
                state = self.connection.execute(
                    "SELECT state FROM candidates WHERE feature_key = ?", (key,)
                ).fetchone()["state"]
                self.connection.commit()
                return {"feature_key": key, "state": state, "duplicate_event": True}
            record = self.connection.execute(
                "SELECT state FROM candidates WHERE feature_key = ?", (key,)
            ).fetchone()
            if not record:
                raise InputError("Unknown candidate")
            if record["state"] in FINAL:
                raise InputError("Candidate already has a final review decision")
            if record["state"] == "deferred" and action["decision"] == "deferred":
                raise InputError("Candidate is already deferred")
            stamp = _now()
            self.connection.execute(
                "UPDATE candidates SET state = ?, updated_at = ? WHERE feature_key = ?",
                (action["decision"], stamp, key),
            )
            self.connection.execute(
                "INSERT INTO candidate_review_events VALUES (?, ?, ?, ?, ?)",
                (action["event_id"], key, action["decision"], action["reviewer"], stamp),
            )
            self.connection.commit()
            return {"feature_key": key, "state": action["decision"], "duplicate_event": False}
        except Exception:
            self.connection.rollback()
            raise

    def records(self) -> List[Dict[str, Any]]:
        rows = self.connection.execute(
            "SELECT feature_key, state FROM candidates ORDER BY feature_key"
        ).fetchall()
        return [dict(row) for row in rows]

    def events(self) -> List[Dict[str, Any]]:
        rows = self.connection.execute(
            "SELECT event_id, feature_key, decision, reviewer FROM candidate_review_events ORDER BY occurred_at, rowid"
        ).fetchall()
        return [dict(row) for row in rows]
