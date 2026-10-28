# Local workflow paths and design previews · 28 October 2026

## Working functionality

- Home exposes Try a workflow, See real AI runs and My saved scenarios. All five workflow cards lead to the new scenario path; older rule-based and CRM/Linear/Slack mock views remain linked.
- Forty genuine recorded answers are exported as a separate verified fictional snapshot with source evidence, instructions, requested settings, original/revised checks, owner-review labels and measured time/tokens. Authentication, raw diagnostics and private review prose are excluded.
- Visitor preset runs invoke the existing Python assessment and workflow simulator on recorded text. They cannot dispatch a model, accept arbitrary prompts or override failed answer/evidence gates.
- Both paths use one result renderer. Visitor results embed their original source answer, newly run checks, simulated approval/outcome and execution receipt; model_calls/new_model_tokens remain0 and benchmark_contribution remainsfalse.
- Local storage and JSON download keep visitor histories separate from owner feedback and the model benchmark. A missing save is reported, not silently claimed.

## Automated checks

198 Python tests passed with Python3.9 and the bundled Node24 runtime, including seven new recorded-demo/package tests. All120 combinations of40recordedanswers ×3simulatedapprovalchoices completed with source snapshots unchanged and model dispatch patched to fail. Tests cover wrong input/generation flags, altered evidence, approval holds, stale/missing evidence, cross-origin writes and disabled owner-review endpoints.

Thirteen Node tests passed: seven existing revision-bound calibration-feedback checks and six browser-storage checks. Cases include reload data, idempotent save, conflicting IDs, quota failure, history limits, invalid model-consumption claims and individual deletion. Both new runtime modules and the design-preview module passed syntax checks. Whitespace checks passed.

## Extracted package test

Built `dist/meridian-workflow-showcase.zip`:44files,147,424bytes at verification. Extracted into a new temporary directory and launched with `showcase_demo.py --port8768`, without the Node override. Browser verified a tentative-budget scenario saves as pending, survives reload, opens in My saved scenarios, and retains its source-run link. The package evaluation page loaded40actualanswers, original/revised setup totals, prepared reference5/5, regression36/36 and deliberate-fault detection5/5. It exposes read-only owner-review totals; private review UI/API are disabled. The temporary server was stopped afterwards. This Mac test does not claim a separate Windows runtime test.

The ZIP uses an explicit file allowlist and a SHA256 manifest. Tests exclude private-data, auth/environment files, Git history, databases and unrelated automation projects. Public GitHub/release placement is undecided and no push, PR, upload or Cloudflare deployment was made.

## Design studies

`/design-options` provides five separate layout directions using the approved Meridian Notion direction and existing SVG identity. Each has six navigable pages. Browser visited all30option/page combinations with no missing heading, broken brand image or page-level horizontal overflow at the inspected viewport. Home screenshots for allfive are stored in `assets/design-options/`. This is not a full accessibility or multi-device audit. The studies remain outside the standalone ZIP and have not replaced the working design.

## Evidence integrity and remaining scope

All40originalprivateanswerstrings,usagevalues,receiptdigestsandcriterionresultsmatchthepre-recheckstage03report. Exactly40generationfiles remain. No new AI test calls, automatic reruns, owner-label changes, reset usage or external business actions occurred.

Automatic routing, live retrieval-quality experiments and the final chosen design remain unfinished. Cloudflare is deferred. Visitor scenario data is browser-local and unauthenticated, not independent model-quality evidence. Generation-only usage remains separate from development and review overhead; cash cost and savings remain unavailable.
