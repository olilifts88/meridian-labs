# Usage and evaluation integration review

This is the historical integration record for the usage components. See the [current verification record](verification-2026-10-26.md) for subsequent routing and showcase work.

## Scope
Reusable measurement, token-valuation and calibration logic adapted into the portfolio. No live collector, scheduler, uploader or external model execution is run. Existing production tooling is untouched.

## Verification
- Python workflow and usage suites: 63 checks, including response deduplication, subset handling, missing workers, conflicting records, malformed inputs, Zstandard parity and injected rate cards.
- JavaScript suites: 24 checks including 7 human-feedback calibration cases and the existing n8n/deployment/mirror checks.
- Three n8n exports checked for consistency.
- Synthetic usage demo: duplicated 120-token response counted once; illustrative USD value 0.000286, explicitly fictional.
- Existing offline demo, benchmark, release journey and callback demo run successfully.
- Imported content reviewed for personal paths, private Notion links, account/session identifiers and credentials. Only fictional fixtures are included; ignore patterns cover local telemetry and outputs.

## Status
Native model router, automatic LLM judge, connected dashboard/upload and hosted deployment remain planned or separate integrations. The live drafting adapter is fake-tested, not live-verified. README now presents agents, workflows, routing, evaluation, usage/cost and infrastructure with status distinctions.

## Review boundaries
No GitHub push, visibility change, paid call, schedule or account permission change. GitHub visibility checked separately. This is an offline component integration, not a production rollout or proof of routing savings.
