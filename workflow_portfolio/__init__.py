"""Local source-checkout launcher; installed package lives in src/."""

from pathlib import Path

__path__ = [str(Path(__file__).resolve().parents[1] / "src" / "workflow_portfolio")]
