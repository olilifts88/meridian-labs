# Reviewing real AI answers

Open `/evaluation/review` from the **Review answers · flagged first** button on the evaluation page. This is the local review of the recorded model experiment, not permission to apply a business change. The nine originally flagged answers appear first; filters also show all 40, unreviewed answers, reviewed answers and changed check results across all five workflows.

Read the supplied evidence and expected behaviour next to the actual answer. Choose **Correct**, **Needs changes** or **Unsure**, optionally explain why, then **Save review & next**. Saving moves to the next unreviewed answer in the current view. Reviews survive reload, bind to the exact answer set and do not approve a CRM update, ticket or publication. Original human judgments remain protected against conflicting replacement; receipts retain the feedback history.

## Two different reviews

- Answer evaluation asks whether an answer is useful, correct and supported by evidence. That is this screen.
- Business approval asks whether a proposed action may proceed. The workflow's approval gate owns that decision.

The reusable evaluation loop is: recorded run → domain checks → human judgment → diagnosed improvement → versioned recheck or separately budgeted model experiment. The public demo is planned to replay saved examples; private review writes and the model runner must not be deployed as visitor endpoints.

## Original results and the revised check

The 28 October 2026 pilot completed ten fictional cases across four requested configurations: GPT-6 Luna and GPT-6.1 Sol, each with basic and guided instructions at medium reasoning. There are 40 saved answers, eight per workflow. Requested settings were accepted by the CLI; independent backend identity is not exposed.

| Workflow | Original checks v1 | Revised checks v2 |
| --- | ---: | ---: |
| Release notes | 7/8 | 7/8 |
| Vulnerability review | 8/8 | 8/8 |
| Security questionnaires | 8/8 | 8/8 |
| SOC 2 evidence | 5/8 | 6/8 |
| Calls to CRM | 3/8 | 4/8 |
| **Total** | **31/40** | **33/40** |

These are automated check outcomes, not human-confirmed accuracy. Both sets remain visible. The v2 check was designed after examining this development sample, not before it or on held-out data.

Two changes remove overly strict comparisons:

1. CRM fact coverage compares fields relevant to each fact kind. A bug's unused `deal`/`value` or a stage's unused `topic` no longer cause an otherwise matching fact to fail. Exact transcript excerpts, required facts, commercial values, targets, approval rules and downstream state checks remain enforced.
2. SOC 2 compares every required evidence field, citation and owner while allowing extra explanatory fields. Wrong or missing source IDs, dates, approval or owner still fail, as do stale evidence marked ready and missing follow-ups.

This changes Luna/basic's approved-pilot CRM answer from flagged to passed, and Sol/guided's stale SOC 2 answer from flagged to passed. The original plain-text release answer still fails the required JSON format. The seven remaining flags are retained for human review; the recheck does not declare them all incorrect.

## Recheck without model calls

```sh
python3 demo.py pilot recheck --directory private-data/ai-pilot
python3 demo.py pilot report --directory private-data/ai-pilot
```

`recheck` reads existing answers and writes a separate immutable `rechecks/pilot-generation-checks-v2.json` snapshot containing the original and revised assessments, changes, date, answer digests, dataset identity and answer-set revision. It never rewrites generation files, receipts or human reviews. An identical repeat reuses the snapshot; changed results under the same rubric version are rejected. Later marking changes need a new rubric version. GET/report and review saving do not dispatch models.

The API continues to expose `evaluation` as the original result for compatibility. `original_evaluation` makes that explicit; `recheck_evaluation` and `recheck` expose the separately saved revision. Original setup totals remain `checks_passed`; `recheck_passed` is additional. Human reviews retain the same answer-set revision across a recheck.

## Usage and current boundaries

The 40 generation receipts expose 610,814 processed tokens: 606,022 input (including 478,848 cached input) plus 4,792 output (including 1,006 reasoning). This excludes development/chat and human-review overhead. No additional generation was used to recheck or build the review screen. Cash cost, savings, held-out accuracy and optimal routing remain unestablished.

The pilot compared fixed model/instruction setups. Automatic routing, evidence retrieval and full visitor replay journeys remain separate planned work. Do not describe this review screen as completing those features.

## Reuse and verification

The runner reuses the five domain evaluators, common evaluation record, existing subscription receipts and `calibration-feedback.cjs` for revision-bound human decisions. There is one private review store per answer set, not another collector or AI judge. `tests/test_ai_pilot.py` checks that rechecks preserve source files and reviews, repeat without calls, reject altered evidence/quotes/values and bind to the original answers. The browser save/reload check uses an isolated temporary copy so test judgments never become Oli's actual reviews.

## Verified locally · 28 October 2026

All 191 Python tests passed with the bundled Node 24 runtime, including 17 pilot tests. Both page scripts passed syntax checks. Browser checks verified the nine-answer default queue, evidence/answer layout, original31/revised33 totals, changed-result and workflow filters, save-and-next, and persistence after reload on a temporary copy. The real queue remains 0/40 reviewed. All40 original answer strings, usage records, receipt digests and criterion results match the pre-recheck report. Exactly40 generation files remain; no new model calls were made. The existing localhost server was restarted in offline mode on port8766.
