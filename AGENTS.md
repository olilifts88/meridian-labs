# Meridian Labs Repo Guide

Applies across this repository. Follow the user's task and any more specific repository instructions. Read `README.md` for the public site, local download and current project map.

## Where to work

- `demo-web/` is the current visitor interface, including workflow outputs, quality reviews, routing and cost controls. Keep shared behaviour in shared modules.
- `showcase_demo.py` serves that interface through `src/workflow_portfolio/web_demo.py`.
- `src/workflow_portfolio/` also contains the Python workflow engines and original recorded-run tooling. Trace the relevant entry point before choosing what to change.
- `examples/` holds public-safe inputs and recorded answers; `tests/` holds expected behaviour.
- Edit n8n sources in `.n8n/`, then regenerate `exports/n8n/`. Do not hand-edit generated exports.
- AI Performance Dashboard and Life OS guides describe separate private apps. Their app code and personal records are not included here.

## Run and check

Python 3.9+ runs the local demo. Developer checks also need Node 24+.

- Start: `python3 showcase_demo.py` (`--offline` uses saved prices).
- Browser checks: `npm run test:web`.
- Download checks: `npm run test:download`.
- Capability references: `python3 scripts/capability_check.py` (checks references, not behaviour).

Run checks appropriate to the change. Start with focused tests; use download checks when packaged content changes. Report what ran and any unresolved failure.

## Working rules

Follow nearby code and keep changes within the task. Use `docs/capability-check.md` for the capability-review method, availability verdicts and five-part answer format. Inspect the reachable code path; `capabilities.json` is an index, not proof of implementation. Update affected claims, tests and guides when behaviour changes.

Keep recorded-answer identities and source-bound evaluations intact. Separate planned costs from measured usage and source checks from model comparisons. Dated verification records do not establish a fresh run.

For release changes, verify the package allowlist, release asset, checksum and setup instructions. A local change does not establish a hosted deployment.

Keep credentials, private receipts, personal records and employer material out of public files. Live model calls and external writes require task authorisation. Personal communication and model preferences belong outside this public repository.
