# Meridian Labs: guidance for coding agents

This file applies to the whole repository. Follow the user's task and any more specific instructions first. Keep this file focused on repository facts; personal workflow and model-routing guidance lives outside this public repo.

## What this repository contains

Meridian Labs has a downloadable, local **AI Workflows** demo; source for its workflow checks, routing, evaluation, usage and n8n examples; and public guides to a separate **private AI Performance Dashboard**. The five demo workflows use fictional business data. The dashboard app, personal records and credentials are not included in this repository. Historical plans in `docs/portfolio-map.md` and `docs/rebuild-plan.md` are context, not proof that a feature is implemented.

## Find the relevant source

- Start with `README.md` for the visitor path, download, folder guide and links to current evidence.
- `showcase_demo.py` starts the recorded, no-model-call visitor demo. Follow its imports into `src/workflow_portfolio/showcase_server.py` and `recorded_showcase.py`.
- `src/workflow_portfolio/` holds the workflow engines, review rules, routing, evaluations and usage code. Follow the actual entry point, caller, state and side-effect boundary for the feature at issue.
- `examples/` holds fictional inputs and public-safe recorded runs. `tests/` holds expected cases. `docs/verification-*.md` records dated checks; it does not establish a fresh run.
- `capabilities.json` is a claim index, not an exhaustive inventory or a substitute for code inspection. `docs/capability-check.md` explains its checker and evidence fields.
- `.n8n/` contains editable n8n sources. `exports/n8n/` is generated output. Inspect the source and build path before relying on an export.
- `docs/ai-performance-dashboard.md` and `docs/dashboard-dataflows.md` describe the private dashboard. Do not infer that its app code or hosted access is in this repository.

## Check a capability before claiming it

1. Identify the surface: downloadable demo, full source checkout, separate private dashboard, or proposed work. Confirm the branch or commit and any local changes.
2. Trace the user-accessible entry point through validation, data mapping, persistence, permissions and external-write boundaries. Check relevant flags and configuration.
3. Inspect the cited code, fixtures and tests. Use `capabilities.json` to find starting points, then search beyond it for newer or unmapped work. Reconcile disagreements with the current code.
4. Separate source presence, test assertions, tests actually run, dated recorded execution and live access. Do not turn a simulated approval, recorded answer or local receipt into an external-write claim.
5. State the supported scope and remaining gap. If code access is missing, label the answer documentation-only. If evidence is inconclusive after a bounded search, say `Not verified`.

The repository checker can inspect mapped references without running tests:

```sh
python3 scripts/capability_check.py
python3 scripts/capability_check.py --capability call-notion-crm
```

Use `--verify` only when a fresh offline check is relevant and authorised; it runs mapped Python, JavaScript, scenario and export checks and needs the documented Python and Node runtimes. Run the smallest relevant check for code changes. Do not run tests when the user asks for a read-only or no-testing review. Never start live model calls, publication, deployment, mirror writes or business-system writes merely to answer a capability question.

## Keep changes and claims in sync

When changing a capability, update its `capabilities.json` entry and the relevant README or domain guide with the new scope and known gaps. Describe only checks actually run. Preserve fictional/public-safe data boundaries; do not commit private receipts, credentials, personal records or employer material. A successful local demo is not production readiness, customer adoption or measured savings.
