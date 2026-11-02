# Repo Explorer

[Open Repo Explorer](https://olilifts88.github.io/meridian-labs/) and ask a question. The page shows a short answer first, with fuller detail and supporting source files underneath. Answers use DeepWiki's free public-repository Q&A endpoint directly from the browser, without an OpenAI API key or paid model plan. Questions are sent to that service when submitted; the offline checker itself makes no model calls. DeepWiki's indexed revision can differ from the source-map revision shown on the page.

The page discovers the service's answer tool, handles JSON and event-stream replies, caches repeated questions for the current page session, cancels an answer when the question changes, and shows an explicit failure if the service cannot answer. It does not execute returned content. A source-grounded release-approval summary keeps the browser publication boundary clear; other answers use the provider's opening explanation. Full answers remain expandable. The workflow demo's saved scenarios and outputs are unchanged.


Start with the [Meridian Labs Repo Guide](../AGENTS.md) for repository orientation, source locations and public/private boundaries. This guide owns the detailed capability-review procedure. Use it for questions about what Meridian supports, how a feature works and what a visitor can actually use.

The codebase is the source of truth for implementation. [capabilities.json](../capabilities.json) is an index of claims, entry points, fixtures, tests, recorded results and known gaps, not an exhaustive inventory. The read-only checker validates file and Python-symbol references. It never dispatches a model, opens account logs or accesses connected Notion.

## Reviewing a capability

1. **Identify the evidence.** Record the repository, branch/commit or archive identity, local changes and intended user. Treat modified files as provisional. Read applicable repository instructions, the current README and relevant domain guide.
2. **Name the surface and action.** Distinguish the public hosted site, demo ZIP, full source checkout, separate private app and future plan. Find the button, URL, command or tool the intended user can reach. For downloads, follow the documented startup path too.
3. **Search the likely area.** Inspect its actual files, local instructions and entry points. Search user labels, symbols and alternate terms. Use the manifest to locate references, then look beyond it for newer or unmapped implementation.
4. **Trace the complete path.** Follow callers and imports through inputs, source selection, validation, routing, evaluation, approval, persistence and final side effects. Check configuration, permissions and flags. Locate the actual writer and destination, or confirm the result is a simulation. For exports and downloads, trace the allowlist, build, published artifact and reader/importer.
5. **Inspect the evidence at its own level.** Read corresponding fixtures, tests, dated results and known gaps. Tests describe expected behaviour; only checks run now establish observations from this invocation. A published download needs evidence beyond a locally generated ZIP.
6. **Verify proportionately.** Run the smallest relevant authorised offline check when needed. Respect a no-testing request. Report the runtime, scope and observed result; a passing reference inventory does not establish the whole feature.
7. **Resolve gaps with a bounded search.** If scoped inspection is inconclusive, make one bounded repository-wide search using alternate terminology. Refine capped searches and disclose limited coverage. Missing evidence is not proof of absence.
8. **State availability and its boundary.** Use the verdicts and answer format below. For future scope, inspect accessible roadmap records and label plans explicitly. If code cannot be read, say **Not verified in code** and limit the answer to documentation.

## Availability verdicts

Use **Available**, **Available with conditions**, **Not supported in the inspected scope**, or **Not verified**. Give separate verdicts for essential parts of a multi-step request.

Related code or help text is insufficient: the intended user must be able to reach the implementation with the required configuration, permissions and flag state. Unknown configuration means conditional or unverified availability, not a blanket claim that flagged code is unavailable.

A local demo does not establish hosted access. A recorded answer does not establish a fresh model call. Approval in a simulation does not establish an external CRM, issue-board, messaging or publishing write. Dated tests, current deployment, model identity, semantic quality and measured cost savings each require their own evidence. Fictional portfolio data does not establish employer production experience or customer adoption.

## Capability answer format

Keep these five sections, scaled to the question:

1. **Short answer:** answer the actual question in one plain sentence, including verdict and scope.
2. **Justification:** give 2–10 useful bullets explaining the implementation, conditions, verified user steps and gaps. Explain unfamiliar terms.
3. **Safe to tell the customer:** give one external-ready sentence. Add **Don't promise:** where a limit applies, keeping private details out of the customer wording.
4. **Confidence:** use **certain**, **fairly sure**, or **guess - verify with engineering**, with the reason for uncertainty. Confidence does not replace the availability verdict.
5. **Receipts:** cite precise files/functions and verified line locations, inspected commit/archive, entry point, checks actually run and dated results. Prefer public links bound to the inspected commit. Label local changes separately; never invent line numbers or passing results.

## Action boundaries

A capability question authorises read-only investigation and appropriate offline verification. It does not authorise enabling flags, changing code/settings, new model calls, deployment, publication, mirror writes, business-data changes, another person's login or contacting anyone. Apply separately authorised implementation work within its scope.

Keep private receipts, credentials and personal data out of shared answers. If code access or a runtime is missing, state the specific limit and preserve dated evidence as history. Do not silently fall back to live calls or treat an unavailable test as a feature failure.

## Checker commands

### Current repository map

Use `ai-workflows-browser` for the current visitor demo and `workflow-stage-routing-and-costs` for its route planner, pricing and quality controls. Entries labelled **Original Python demo** retain the earlier engines and benchmarks; they do not describe the current browser workbenches.

| Visitor workflow | Current implementation | Completed artefact |
| --- | --- | --- |
| Release notes | [Release workbench](../demo-web/assets/release-workbench.mjs), [source cases](../demo-web/assets/release-examples.mjs), [checks](../demo-web/assets/release-quality.mjs) | [Release publication](../demo-web/assets/release-publication.mjs) and [release-note page](../demo-web/assets/release-note.mjs) |
| Transcript to action | [Business workbench](../demo-web/assets/business-workbench.mjs), [transcripts and scenarios](../demo-web/assets/business-data.mjs), [checks and approval](../demo-web/assets/business-engine.mjs) | [Company workspace](../demo-web/assets/company-workspace.mjs): CRM, issue board, revenue tracker, company message board and call library |
| Vulnerability review | Same business workbench and engine, with the vulnerability inventory and remediation policy in the business data | Company workspace: vulnerability review records |
| Security questionnaires | Same business workbench and engine, with questions and approved policy evidence in the business data | Company workspace: completed security response |
| SOC 2 evidence review | Same business workbench and engine, with controls and evidence records in the business data | Company workspace: evidence review pack |

[run-explorer.mjs](../demo-web/assets/run-explorer.mjs) selects the workbench. [quality-review.mjs](../demo-web/assets/quality-review.mjs) provides the shared review interface. The [local server](../src/workflow_portfolio/web_demo.py) serves these browser files; the [ZIP builder](../scripts/build-workflow-showcase.py) packages them. Public hosting is a separate delivery surface and needs its own deployment evidence.

```sh
python3 scripts/capability_check.py
python3 scripts/capability_check.py --capability ai-workflows-browser
python3 scripts/capability_check.py --capability release-notes
python3 scripts/capability_check.py --search 'model_called_this_run|output_gate'
python3 scripts/capability_check.py --verify
```

The first two commands inspect references only. `--search` searches tracked and relevant nonignored uncommitted text, including hidden `.n8n/` workflow sources; uncommitted matches are labelled provisional. `.git/`, ignored private inputs, telemetry, credentials and paths outside the checkout are excluded. `exports/n8n/` contains generated exports, not the source of truth.

Inventory and verification also work from a downloaded source archive: commit and working-tree state remain unavailable. Search requires a Git checkout so repository ignore rules can be respected.

`--verify` explicitly runs mapped offline checks: Python tests, deterministic scenarios, JavaScript checks and n8n export consistency. Python 3.9+ and Node 24+ are required for the complete suite. It reports results observed in that invocation. The optional `MERIDIAN_NODE` environment variable selects a Node executable when needed. An unavailable runtime fails its check; no model or paid fallback runs.

The `web` group runs the same browser-module test files as `npm run test:web`; the older `javascript` group covers n8n and calibration checks. A browser-module pass does not verify the ZIP or public deployment. Use `npm run test:download` for the package checks and inspect the hosted version separately when the claim concerns that surface.

## Interpreting the report

| Field | Meaning |
| --- | --- |
| `code_present` | Referenced implementation files and symbols exist; no correctness claim |
| `test_present` | Referenced test files and named cases exist; no passing result inferred |
| `observed_passing_this_run` | The mapped offline commands were actually run successfully using `--verify` |
| `recorded_evidence` | Dated local execution observations; not a fresh live call or provider attestation |
| `status: planned` | Roadmap documentation only; code/test presence stays unset |
| `status: implemented` | Manifest classification, not an availability verdict or proof of current user access |
| `commit`, `working_tree_clean` | The checkout inspected, including whether local changes are present |

The [recorded model summaries](../examples/showcase/verified-runs.json) retain accepted requested routes, source/input bindings, pass/hold assessments and explicit identity limits. Raw account receipts stay private. The [verification record](verification-2026-10-26.md) states the dates, scope and remaining gaps.

This repository supplies the repeatable map and local search tool. It does not install or alter anyone's Notion skills or automatically intercept future assistant requests.
