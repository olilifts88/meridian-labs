"""Transactional SQLite store and append-only decision history."""

import hashlib
import json
import sqlite3
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from .domain import Draft, Evidence


def fingerprint(evidence: Evidence) -> str:
    """The product change stays the same even when another PR joins its release."""
    return hashlib.sha256(evidence.change_id.encode("utf-8")).hexdigest()


def _now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


class Store:
    def __init__(self, path: str) -> None:
        self.connection = sqlite3.connect(path)
        self.connection.row_factory = sqlite3.Row
        self.connection.execute("PRAGMA foreign_keys = ON")
        self.connection.executescript(
            """
            CREATE TABLE IF NOT EXISTS records (
                id TEXT PRIMARY KEY,
                change_id TEXT NOT NULL,
                kind TEXT NOT NULL,
                state TEXT NOT NULL,
                evidence_json TEXT NOT NULL,
                draft_json TEXT NOT NULL,
                findings_json TEXT NOT NULL,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS events (
                sequence INTEGER PRIMARY KEY AUTOINCREMENT,
                record_id TEXT NOT NULL REFERENCES records(id),
                event_type TEXT NOT NULL,
                actor TEXT NOT NULL,
                detail TEXT NOT NULL,
                occurred_at TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS pr_links (
                url TEXT PRIMARY KEY,
                record_id TEXT NOT NULL REFERENCES records(id)
            );
            """
        )

    def close(self) -> None:
        self.connection.close()

    def get(self, record_id: str) -> Optional[Dict[str, Any]]:
        row = self.connection.execute("SELECT * FROM records WHERE id = ?", (record_id,)).fetchone()
        return dict(row) if row else None

    def conflicting_pr(self, urls: tuple, record_id: str) -> Optional[str]:
        """Prevent one source PR from being claimed by two product changes."""
        for url in urls:
            row = self.connection.execute(
                "SELECT record_id FROM pr_links WHERE url = ?", (url,)
            ).fetchone()
            if row and row["record_id"] != record_id:
                return url
        return None

    def _claim_prs(self, urls: tuple, record_id: str) -> None:
        for url in urls:
            self.connection.execute(
                "INSERT OR IGNORE INTO pr_links (url, record_id) VALUES (?, ?)",
                (url, record_id),
            )

    def add(self, evidence: Evidence, draft: Draft, state: str, findings: List[str]) -> None:
        record_id = fingerprint(evidence)
        if self.get(record_id):
            raise ValueError("Change already recorded")
        if self.conflicting_pr(evidence.pr_urls, record_id):
            raise ValueError("Source PR link belongs to another change")
        stamp = _now()
        with self.connection:
            self.connection.execute(
                "INSERT INTO records VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
                (
                    record_id,
                    evidence.change_id,
                    draft.kind,
                    state,
                    json.dumps(evidence.__dict__, default=list, sort_keys=True),
                    json.dumps(draft.__dict__, default=list, sort_keys=True),
                    json.dumps(findings),
                    stamp,
                    stamp,
                ),
            )
            self.connection.execute(
                "INSERT INTO events (record_id, event_type, actor, detail, occurred_at) VALUES (?, ?, ?, ?, ?)",
                (record_id, "submitted", "workflow", state, stamp),
            )
            self._claim_prs(evidence.pr_urls, record_id)

    def revise(self, evidence: Evidence, draft: Draft, state: str, findings: List[str]) -> None:
        """Replace a blocked candidate without losing its earlier audit event."""
        record_id = fingerprint(evidence)
        existing = self.get(record_id)
        if not existing:
            raise ValueError("Unknown change")
        if existing["change_id"] != evidence.change_id:
            raise ValueError("PR links already belong to a different change")
        if self.conflicting_pr(evidence.pr_urls, record_id):
            raise ValueError("Source PR link belongs to another change")
        stamp = _now()
        with self.connection:
            self.connection.execute(
                """UPDATE records SET state = ?, evidence_json = ?, draft_json = ?, findings_json = ?,
                   updated_at = ? WHERE id = ?""",
                (
                    state,
                    json.dumps(evidence.__dict__, default=list, sort_keys=True),
                    json.dumps(draft.__dict__, default=list, sort_keys=True),
                    json.dumps(findings),
                    stamp,
                    record_id,
                ),
            )
            self.connection.execute(
                "INSERT INTO events (record_id, event_type, actor, detail, occurred_at) VALUES (?, ?, ?, ?, ?)",
                (record_id, "revised", "workflow", state, stamp),
            )
            self._claim_prs(evidence.pr_urls, record_id)

    def transition(self, record_id: str, state: str, actor: str, detail: str) -> None:
        if not self.get(record_id):
            raise ValueError("Unknown record")
        stamp = _now()
        with self.connection:
            self.connection.execute(
                "UPDATE records SET state = ?, updated_at = ? WHERE id = ?",
                (state, stamp, record_id),
            )
            self.connection.execute(
                "INSERT INTO events (record_id, event_type, actor, detail, occurred_at) VALUES (?, ?, ?, ?, ?)",
                (record_id, state, actor, detail, stamp),
            )

    def summary(self) -> Dict[str, int]:
        rows = self.connection.execute("SELECT state, COUNT(*) AS total FROM records GROUP BY state")
        return {row["state"]: row["total"] for row in rows}

    def events(self) -> List[Dict[str, Any]]:
        rows = self.connection.execute("SELECT * FROM events ORDER BY sequence")
        return [dict(row) for row in rows]
