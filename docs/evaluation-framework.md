# Shared workflow evaluation and benchmarking

All five browser workflows emit the same `evaluation_record` contract. The benchmark runner reuses each workflow's existing evaluator. No second language-model judge, collector or approval system is introduced.

## Browser page

Open **Evaluation & benchmarking → Explore evaluation** beneath the five workflow introductions on the home page, or go to `/evaluation`. The page runs the existing `/api/benchmarks` saved-output comparison and exposes the existing regression runner through `/api/evaluations`. It shows per-workflow criteria, reference outcomes, injected-fault detection and downloadable evidence. The shared runner includes 36 executed scenarios/probes across all five workflows: the existing 21 plus eight CRM scenarios and seven CRM corruption probes. Each result identifies its workflow, and the page shows per-workflow regression counts. The broader unit test suite remains a separate check. Page-session timestamps describe actual local fixture runs, not scheduled execution.

## Real model experiment and human review

The local pilot now has 40 recorded model answers across the same five workflows. `/evaluation/review` provides evidence beside each answer, starts with the nine original flags, saves revision-bound human judgments and compares original v1 with a separate offline v2 recheck. Original checks passed31/40; the revised comparisons pass33/40. These are development checks; human reviews are separate. See [the pilot review guide](pilot-review.md) for exact changes, preservation guarantees, usage scope and remaining routing/retrieval work. The synthetic checker benchmark below remains separate from these actual model runs.

## Normal runs

`evals.evaluation_record` records workflow, input/output fingerprints, rubric version, individual criterion verdicts and the overall explicit-check result. Human verdict remains unset. Tokens and cost remain unavailable until independently measured.

The four original workflows use `showcase_assurance.evaluate_output`; calls use `call_crm.evaluate`. Domain criteria differ because audience scope, advisory coverage, questionnaire grounding, control freshness and CRM mutations need different evidence. A passing check does not authorise a write or establish general model accuracy.

Original workflow records cover the output **before optional model review and delivery**. Those later steps retain their existing separate receipts and gates. The release agent and older SQLite service keep their current records; this change does not claim universal collection across every entry point.

## Matched saved-output benchmark

```sh
python3 demo.py benchmark
python3 demo.py benchmark --freeze private-data/benchmark-01
python3 demo.py benchmark --dataset private-data/benchmark-01/dataset.json \
  --candidate private-data/benchmark-01/reference.json \
  --candidate private-data/benchmark-01/corrupted.json
```

The first command evaluates one frozen reference case for each of the five workflows and deliberately corrupted copies. Reference fixtures pass 5/5; damaged copies pass 0/5. These are synthetic checker probes, not competing model runs.

Freeze writes a new directory, refusing to overwrite an existing one. Its dataset contains sources, payloads, reference outputs, rubric versions and a content digest. Candidate files must contain exactly the same case IDs and dataset digest. A malformed output fails its case; it does not vanish from the attempted denominator. Changed inputs or rubric versions require a new matched comparison.

To evaluate a real candidate later, save its actual output in the candidate format without changing the frozen dataset or criteria. Preserve the execution receipt separately. The command does not execute a model, acquire credentials, publish outputs or change defaults.

## Reused verification layers

| Layer | Existing or extended implementation | Evidence |
| --- | --- | --- |
| Behaviour and failure scenarios | `showcase_evaluation.py`, `test_call_crm.py` | Source gaps, duplicates, failed checks, stale/invalid reviews |
| Domain output checks | `showcase_assurance.py`, `call_crm.py` | Criterion findings against supplied evidence |
| Common record and matched comparison | Extended `evals.py` | Frozen data and rubric identity, full attempted denominator, per-case failures |
| Actual usage and valuation | `usage.measure_run`, `usage.token_cost` | Explicitly bound response inventories, subset accounting, dated supplied rate card |
| Human calibration | `calibration-feedback.cjs` | Existing revision-bound human decisions; model verdict stays distinct |
| Claim traceability | `capabilities.json`, `capability_check.py` | Code, tests, recorded checks and remaining gaps |

The older `evaluate_cases` entry point in `evals.py` remains compatible for its release-draft examples. The new registry extends that module to the five browser workflows, using their established evaluators.

## Measurement and interpretation

Comparison reports include successful/attempted cases, baseline success change, per-criterion findings and explicit token/cost/latency coverage. Without bound execution measurements, cost per success, tokens per success, net cost change and all-in pilot cost are null, not zero. The reported evaluator duration measures local checking time only, not candidate latency.

This saved-output comparison currently does **not** ingest measurement receipts or calculate whole-task efficiency. Reuse the existing [usage measurement path](usage-and-evaluation.md) for collection/valuation; joining those receipts to benchmark candidates is a later integration. Complete cost comparisons must include routing, execution, retries, failures and verification, with evaluation overhead separately disclosed. Subscription charges and hypothetical API token valuation stay distinct.

No quality average offsets an unsupported commercial update or unauthorised delivery. No human approval, calibrated accuracy, best-model recommendation, production reliability or savings claim follows from synthetic fixture results. Human-labelled held-out cases, real model trials and delivery failure tests remain separate evidence requirements.

## Adding another workflow

1. Define versioned source snapshots, success criteria and normal/failure/retry cases.
2. Reuse or add the smallest domain evaluator; emit `evaluation_record` in its run path.
3. Register its frozen inputs and evaluator adapter in `evals.py`.
4. Add meaningful corrupted-output probes and matched saved candidates.
5. Preserve human decisions and measure actual usage through the existing tools when available.
6. Update the workflow description, capability map and dated verification with honest scope.

The current registry covers five browser workflows. New workflows must be registered explicitly; merely placing code in the repository does not install evaluation automatically.
