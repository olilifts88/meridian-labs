# Call CRM and shared-evaluation verification · 27 October 2026

## Scope and acceptance

Pass for the fictional local workflow and connected Notion fixture creation described below. Live AI extraction/review, browser-to-Notion syncing, persistent authenticated approvals, live Slack/Linear delivery, scheduled execution and held-out model accuracy remain unverified and are not implemented here.

Test plan: check supported stage progression, uncertain commercial holds, cross-call corroboration, repeated/conflicting calls, invalid/stale/duplicate review decisions, future/missing evidence, corrupted outputs, local request boundaries, and preservation of the four existing browser workflows. Check source links, template selection and selective rejection in the browser. Read back the fictional Notion mutations and database placement. No production service failures were induced.

## Executed checks

| Check | Observed result |
| --- | --- |
| Python suite with bundled Node 24 | 174 tests passed, including 10 new call tests and 6 shared-benchmark tests |
| Call journey | Qualified → Pilot; one issue remains Medium for two distinct accounts, then High at three; exact tentative price remains held |
| Review/retry cases | Bulk and selective decisions, reason-required rejection, stale/duplicate/automatic-action review rejection and repeat simulation checked |
| Corrupted call outputs | Seven deliberately corrupted output variants detected by independent checks |
| Shared comparison | Reference saved outputs: 5/5; deliberately corrupted saved outputs: 0/5; all five workflows reuse their existing evaluators |
| Dataset identity | Repeated freeze has the same digest; changed source/candidate identity, missing/duplicate cases and duplicate candidates rejected |
| Local HTTP | `/calls` and `/api/calls` work; invalid call count and foreign-origin requests rejected |
| Browser inspection | CRM stages, cumulative Linear history, Slack selective rejection with retained notes, template switching, evidence dialog and shared benchmark results observed |
| Notion writes | Six databases created under the Meridian experiment in OliOps; stage update read back; signal escalation and pending/action states read back; root map link verified |

The first broad suite run used the host's older Node and failed two pre-existing Zstandard checks. Repeating with the bundled Node 24 runtime passed. No code change was made to those existing tests.

The browser was inspected at `http://127.0.0.1:8766/calls` during this build. The normal documented server default is port 8765. Screenshots: [Linear mock](../assets/call-crm-linear-preview.png), [Slack mock](../assets/call-crm-slack-preview.png).

## Reproducible commands

```sh
PYTHONPATH=src python3 -m unittest discover -s tests -v
python3 demo.py evaluate
python3 demo.py benchmark
python3 demo.py benchmark --freeze private-data/example-comparison
python3 demo.py benchmark --dataset private-data/example-comparison/dataset.json \
  --candidate private-data/example-comparison/reference.json \
  --candidate private-data/example-comparison/corrupted.json
python3 scripts/capability_check.py
```

The full suite requires Node 24+ on PATH or `MERIDIAN_NODE` pointing to it, as already documented by usage measurement. Synthetic comparisons make no model calls and cost no model tokens. The author's execution cost and tokens per successful task remain unavailable; no savings baseline was measured. Evaluator checking time is reported separately from unavailable candidate latency.

## Remaining evidence

The browser's manual report edits, calendar-style preparation and audience previews are illustrative session features. Human calibration and authenticated rejection learning have not been demonstrated. The existing feedback module is reused as the planned calibration boundary, not claimed as a running learning loop. No Notion failure/retry adapter was installed; fixture creation through connected tools is separate from a reusable live writer.


## Browser navigation and evaluation page · 28 October 2026

The root page is now a directory with five introductions and Open workflow buttons. The shared Evaluation & benchmarking section links to `/evaluation`. The page reuses the existing benchmark endpoint and original four-workflow regression suite; it displays all five reference-case criteria, matched saved-output outcomes and expandable scenario findings. It does not run or claim the separate call unit tests.

Observed: home link opens the page; five reference cases pass; 21 original regression cases pass; five deliberately damaged outputs are rejected; call criteria expand; rerunning updates the page-session result. The existing 20 demo/browser-server tests pass, including the new page and data routes. Browser script syntax and diff checks pass. Local fixture results remain distinct from live model benchmarks, human calibration and cost measurements.


### Five-workflow regression coverage · 28 October 2026

Extended the shared runner with eight CRM scenarios and seven CRM corrupted-output probes. The executed regression suite is now 36/36 across all five workflows (19 scenarios, 17 probes). Coverage by workflow: release notes 7, vulnerabilities 6, questionnaires 5, SOC 2 3, CRM 15. The page identifies every case's workflow and shows per-workflow counts; historical 21/21 observations above retain their original scope. The complete 174-test Python suite passed after this change.
