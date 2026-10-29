# Capability evidence map

Start with [AGENTS.md](../AGENTS.md) for repository orientation, investigation steps and public/private boundaries. Use [capabilities.json](../capabilities.json) to trace a claim to code, entry point, fixture, test, recorded result and known gap. The read-only checker validates file and Python-symbol references. It never dispatches a model, opens account logs or accesses connected Notion.

```sh
python3 scripts/capability_check.py
python3 scripts/capability_check.py --capability release-notes
python3 scripts/capability_check.py --search 'model_called_this_run|output_gate'
python3 scripts/capability_check.py --verify
```

The first two commands inspect references only. `--search` searches tracked and relevant nonignored uncommitted text, including hidden `.n8n/` workflow sources; uncommitted matches are labelled provisional. `.git/`, ignored private inputs, telemetry, credentials and paths outside the checkout are excluded. `exports/n8n/` contains generated exports, not the source of truth.

Inventory and verification also work from a downloaded source archive: commit and working-tree state remain unavailable. Search requires a Git checkout so repository ignore rules can be respected.

`--verify` explicitly runs mapped offline checks: Python tests, deterministic scenarios, JavaScript checks and n8n export consistency. Python 3.9+ and Node 24+ are required for the complete suite. It reports results observed in that invocation. The optional `MERIDIAN_NODE` environment variable selects a Node executable when needed. An unavailable runtime fails its check; no model or paid fallback runs.

## Interpreting the report

| Field | Meaning |
| --- | --- |
| `code_present` | Referenced implementation files and symbols exist; no correctness claim |
| `test_present` | Referenced test files and named cases exist; no passing result inferred |
| `observed_passing_this_run` | The mapped offline commands were actually run successfully using `--verify` |
| `recorded_evidence` | Dated local execution observations; not a fresh live call or provider attestation |
| `status: planned` | Roadmap documentation only; code/test presence stays unset |
| `commit`, `working_tree_clean` | The checkout inspected, including whether local changes are present |

The [recorded model summaries](../examples/showcase/verified-runs.json) retain accepted requested routes, source/input bindings, pass/hold assessments and explicit identity limits. Raw account receipts stay private. The [verification record](verification-2026-10-26.md) states the dates, scope and remaining gaps.

## Reviewing a claim

Start with repository instructions and checkout state. Find the capability ID, inspect the cited function and original fixture, then inspect the relevant test. Run its mapped offline checks when verification is needed. Treat live execution as a separate claim requiring a matching dated receipt. Report unsupported behavior as a gap. Do not infer semantic quality, production readiness or cost savings from source presence, passing unit tests or a README statement.

This repository supplies the repeatable map and local search tool. It does not install or alter anyone's Notion skills or automatically intercept future assistant requests.
