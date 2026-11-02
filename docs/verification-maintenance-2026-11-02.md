# Workflow maintenance · 2 November 2026

The browser route-settings dialog is shared across release notes and the four business workflows. It preserves draft edits until Apply, discards cancelled edits, validates token values, updates the comparison estimates and returns focus to the trigger. Applying settings invalidates the previous output and resets the run button. Page order and approval boundaries remain unchanged.

`demo-web/` owns browser source. The hosted checkout exports it with `sync_public.py`, whose check mode rejects missing, changed or extra assets. Worker pricing and deployment remain hosted-specific.

GitHub checks now run every JavaScript module test and build/smoke-test the download. The download check verifies packaged assets and manifest hashes, starts the extracted server offline on an OS-selected port, checks workflow routes and pricing fallback, and rejects server writes and files outside the served directory. No model calls or external business writes are made.

The broader JavaScript check exposed an outdated public pricing test that still expected four transcript steps. It now expects the existing eight-part branching route; the branch-budget tests separately verify its accounting. This corrects test coverage, not routing behaviour.

Validation receipts are recorded after execution below.

## Executed checks

- All 98 JavaScript module tests passed, including pricing, branching routes, release approvals, source-bound evaluations, saved results and completion-button state.
- Download smoke passed: canonical browser asset parity, packaged manifest hashes, five HTTP paths, offline pricing for five models, forty preserved original answers, blocked server writes and blocked access outside public assets.
- Browser release workflow: invalid negative tokens rejected, Cancel preserved the original estimate, normal run displayed automatic evaluation and green completion, lower-cost preset updated the estimate and Apply restored red Run workflow with the stale output hidden.
- Hosted export parity and static source/scenario validation passed before packaging.

No Langfuse or Promptfoo service, SDK or credentials were added. Those remain proposed follow-up work.
