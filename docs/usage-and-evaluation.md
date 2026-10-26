# Usage measurement and evaluation

These modules adapt an existing local measurement and feedback implementation into reusable offline components. They do not install a collector, create a schedule, upload records or call a model.

## Run the fictional example

```bash
python3 -m workflow_portfolio.usage.demo
```

The demo creates a temporary SQLite catalog and reads only the included fictional log. The same 120-token response appears twice: it is counted once. Input is 100 tokens (including 60 cached), output is 20 (including 5 reasoning). Cached and reasoning subsets are not added again. The fictional rate card produces USD 0.000286; this number tests arithmetic, not current provider pricing.

## Measure an explicitly supplied local task

```bash
python3 -m workflow_portfolio.usage.measure_run examples/usage/manifest.json \
  --source /path/to/local-telemetry --output usage-reports/task.json
```

`--source` is mandatory. It must contain `state_5.sqlite` with a `threads(id, rollout_path)` catalog and matching local JSONL rollouts. This is a version-specific Codex log adapter, not a stable public provider telemetry API. It opens the catalog read-only and never sums cached SQLite totals or cumulative usage events. It reads referenced logs, not arbitrary account history. For reproducible tests use the demo, which constructs its own catalog.

Plain `.jsonl` and `.jsonl.zst` are supported. An exact compressed sibling is used if a catalog still references the old plain file. Install Node 24+ on PATH, or set `MERIDIAN_NODE` to its executable. No runtime is downloaded automatically. Invalid compressed data reports an availability gap.

### Binding and coverage

The example manifest shows the version-2 contract: task ID, environment, task-inventory evidence, and explicit execution bindings. Each coordinator, worker, retry or verification binding has its own ID, attempt, thread, response/turn IDs and boundary evidence.

- **Complete:** all declared execution roles and closed-turn response inventories reconcile.
- **Partial:** some responses are measured but task boundaries, workers or categories are incomplete. Only `measured_subtotal` is usable; `task_usage` remains null.
- **Unavailable:** no usable measurements. Never replace missing fields with zero.

Completion depends on the supplied inventory. This adapter cannot prove that the caller listed every external execution. Duplicate responses across bindings count once and make role attribution ambiguous. Conflicting duplicate usage is rejected. Configured model/effort labels do not independently prove backend execution identity. Shared tool actions have no invented marginal token cost.

## Token valuation

`estimate(row, card)` values one response; `summarise_costs(rows, card)` groups already deduplicated response rows by London week and recorded model. Use a versioned rate card with dated provenance and supported per-model category semantics. The shipped `example-rate-card.json` uses an invented model and rates. It is never a current provider price list.

Long-context multipliers belong to the supplied card, not every model by assumption. The current adapter refuses nonzero cache-write usage until its provider semantics are reconciled. Unknown models/categories stay unpriced. Internal guardian usage is separate. Estimated token value is neither a subscription charge nor proof of savings. Complete comparable task usage and quality are needed to compare efficiency.

## Evaluation and human feedback

`workflow_portfolio.evals.evaluate_cases` scores saved outputs against the same evidence and expected content for every candidate. Missing token coverage stays unknown. The included benchmark uses fictional outputs; it is not a live model comparison or an LLM judge.

`src/evaluation/calibration-feedback.cjs` applies supplied human decisions to frozen samples. It rejects stale revisions, unknown cases, changed receipt IDs and conflicting labels. Replaying the same receipt is a no-op. Qualitative agreement does not manufacture a categorical verdict. The caller is responsible for authenticating the reviewer and establishing that feedback was actually provided by a human; this pure function is not an approval-authentication service.

## Verification

```bash
python3 -m unittest discover -s tests -v
node --test tests/calibration-feedback.test.cjs
```

Tests construct synthetic catalogs/logs in temporary directories. They check deduplication, subset accounting, malformed sources, conflicting usage, incomplete workers, closed boundaries, compressed-log parity, illustrative valuation and feedback replay. CI uses Node 24 for Zstandard support. No account data or paid model calls are used.

## Not integrated here yet

Account-specific collection discovery, whole-account aggregation, scheduled catch-up, connected Notion upload, native dashboard publishing and automatic assessment of the usage dashboard remain separate integrations. The [showcase](showcase.md) has its own bounded output evaluator and optional real model reviewer; it does not add those telemetry integrations. Local routing components and reported pilot evidence are described in [model-routing.md](model-routing.md); the usage modules do not provide automatic routing or whole-task collection across execution surfaces. A failed source read must preserve the last verified result; retries must not replay business actions. Those operating rules need adapters and integration tests before they can be claimed as implemented in this repository.

Keep local logs, catalogs, identifiers, reports, credentials and connection settings outside Git. Use the ignored `local-telemetry/`, `usage-reports/` or `private-data/` folders. Ignore rules are a guard, not a guarantee; review diffs before every commit. No production records are included.
