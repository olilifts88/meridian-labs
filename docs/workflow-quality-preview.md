# Workflow quality branch preview

Branch: `preview/workflow-quality-detail`. Entry point: `demo-web/preview/quality.html`.

This review prototype leaves the normal workflow entry points and production release untouched. Serve `demo-web/` locally, then open `/preview/quality.html`. Transcript to action is the default; Release notes is the second option. Each has two original source cases.

## Review paths

1. Run a workflow. The source-check summary and output open automatically. Run controls and model route remain in place; the green button opens the result. Changing the scenario or workflow resets it.
2. Compare answers. Select instruction style to compare the original Luna and Sol answers on the same evidence. The first view highlights criteria with different verdicts; all criteria and provenance are expandable. Recorded tokens and generation times stay attached to the original answer. Costs are dated API-equivalent estimates.
3. What changed. Select any two original answers for that scenario. Word differences and changed source-check verdicts update together. Different wording is not automatically a better answer.
4. Check a change. Inject an unsupported pilot approval or release claim, inspect the failing source checks, then restore the supported output. This is browser-side prototype checking; it does not represent a GitHub execution receipt. Existing module tests cover these fixtures on the branch.
5. Step detail. Select a node in the branching route or step list to inspect input evidence, the source-backed decision, required check and prepared destination record. Transcript destinations include CRM, internal issue board, revenue tracker, company message board and call library. Destination buttons open a read-only review dialog.

The step views are authored explanations grounded in the selected source. They do not expose a model's private reasoning or fabricate per-step latency, token usage or quality scores. No external integration, live model call or business-system write is used. Langfuse and Promptfoo SDKs are not installed.

## Verification

All 102 JavaScript module tests passed. Four focused preview tests cover source/input matching, injected-change failures, source preservation, branch destinations and exact word-diff reconstruction. Browser checks cover run completion, changed scenario reset, source-comparison updates, output dialogs and failing/restored change checks.

Before merging, Oli should review the layout and interaction in both workflows. The hosted Site and downloadable release have not been updated with this prototype.
