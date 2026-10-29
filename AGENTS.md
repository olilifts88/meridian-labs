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

## Standard capability review

Use this sequence for "can it do X?" questions and before changing a public capability claim. It is a source-review procedure, not a requirement to run every test.

1. **Fix the evidence revision.** In a checkout, record `git rev-parse HEAD` and `git status --short`; in GitHub, record the inspected commit. Treat uncommitted files as provisional. Read this file, the current `README.md` and the relevant domain guide.
2. **Name the surface and user action.** Decide whether the claim concerns the downloadable ZIP, the full local source, a connected/private system or a plan. Find the button, URL, command or caller a user would actually reach. A source file with no reachable entry point is not an available feature.
3. **Trace one complete path.** Follow inputs and source selection through validation, routing, evaluation, approval, state and the final side effect. Locate the exact writer or confirm the result is a simulation. Check relevant flags, configuration and permissions. For a download, follow the package allowlist, release asset and startup path.
4. **Search narrowly, then once broadly.** Search the likely area first, for example `rg -n 'term|alternate_term' src/workflow_portfolio tests docs`. If that is inconclusive, do one bounded repository-wide search. A capped or missing result is not proof of absence.
5. **Check evidence at the right level.** Read the matching test and fixture, then the latest relevant dated verification. Distinguish expected behaviour in code from a test run observed now. A recorded AI answer, local receipt or simulated approval does not prove a fresh model call or an external write.
6. **Report the boundary.** State what is available, conditional, unsupported in the inspected scope or not verified. Include the inspected commit, entry point, code/test links, checks actually run and the remaining gap. If code access is missing, label the answer documentation-only.

Use `capabilities.json` to locate mapped claims, then inspect the code and search beyond the manifest. The checker inspects mapped references without executing tests:

```sh
python3 scripts/capability_check.py
python3 scripts/capability_check.py --capability call-notion-crm
```

Use `--verify` only when a fresh offline check is relevant and authorised; it runs mapped Python, JavaScript, scenario and export checks and needs the documented Python and Node runtimes. Do not run tests for a requested no-testing review. Never start live model calls, publication, deployment, mirror writes or business-system writes merely to answer a capability question.

## Keep changes and claims in sync

Use the same evidence revision for code, capability records and public wording. Before editing, identify the affected manifest entry and guide. After editing:

- **Behaviour or entry point changed:** update the implementation, a focused test when useful, the `capabilities.json` claim/known gaps and the relevant domain guide. Update `README.md` only when a visitor's path or public claim changes.
- **Evidence or status changed without repo code:** update the affected claim and dated guide without implying the code moved into this repository. The Performance Dashboard is a separate private app; its public guide is here.
- **n8n workflow changed:** edit `.n8n/` source first, regenerate `exports/n8n/` through the documented build path and check consistency. Do not hand-edit generated exports.
- **Release or package changed:** check the explicit package allowlist, release asset name, checksum and README instructions against the actual artifact.

Run `python3 scripts/capability_check.py` after changing the manifest when the runtime is available. Run a fresh `--verify` or focused test only when the change warrants it and the user has not excluded testing. Record what ran and what did not. If a cross-file update cannot be completed, leave a specific gap in the same change; do not silently publish conflicting claims.

Keep fictional and public-safe data boundaries. Do not commit private receipts, credentials, personal records or employer material. A successful local demo is not production readiness, customer adoption or measured savings. This guide reduces drift when agents follow it; it does not enforce truth by itself.
