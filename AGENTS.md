# Meridian Labs Repo Guide

Applies across this repository. Follow the user's task and any more specific repository instructions. Read `README.md` for the public site, local download and current project map.

## Where to work

- `repo-explorer/` is the GitHub Pages source map and inline free DeepWiki Q&A. Its build binds source links to the deployed commit.
- `scripts/skill-execution.mjs` supplies optional source-alias and call-budget guards. Its scope and use are in `docs/repo-explorer.md`; it controls only calls routed through it.
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

Follow nearby code and keep changes within the task. Use `docs/repo-explorer.md` for the capability-review method, availability verdicts and five-part answer format. Inspect the reachable code path; `capabilities.json` is an index, not proof of implementation. Update affected claims, tests and guides when behaviour changes.

Keep recorded-answer identities and source-bound evaluations intact. Separate planned costs from measured usage and source checks from model comparisons. Dated verification records do not establish a fresh run.

For release changes, verify the package allowlist, release asset, checksum and setup instructions. A local change does not establish a hosted deployment.

Keep credentials, private receipts, personal records and employer material out of public files. Live model calls and external writes require task authorisation. Personal communication and model preferences belong outside this public repository.

## Finish a change

Before reporting a change or rollout complete:

- Check this source map, the README, affected domain guides, capability labels/aliases and relevant canonical guidance. Update whichever changed; keep unchanged instructions in their existing home.
- For a named artifact, verify its actual source home before deep code search. A private hosted app or document may live outside this repository. Record only public-safe pointers here; use authorised private guidance for private locations.
- Verify changed links, source references and the smallest relevant checks. Preserve historical receipts and distinguish saved code, published deployment and observed runtime behaviour.
- Report the result, documentation updated and any missing access or unverified step. A documentation edit does not prove every agent or future scheduled run follows it.
