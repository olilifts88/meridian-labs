# Verification record · 26 October 2026

## Repeatable offline checks

`python3 scripts/capability_check.py --verify` passed in the author's local checkout with Python 3.12.14 and Node 24.19:

| Check | Observed result |
| --- | --- |
| Python unit and integration tests | 153 passed |
| JavaScript tests | 24 passed |
| Workflow/output evaluations | 21 passed: 11 workflow scenarios and 10 deliberately corrupted outputs |
| Generated n8n export consistency | Three exports checked successfully |
| Capability map | All eight implemented capability references resolved and their mapped checks passed; dashboard remains planned |

The checker runs offline and makes no model call. A passing regression suite is not a held-out quality benchmark.

## Clean-copy and documentation checks

A clean source export ran without installing the project. The launcher produced a release-note result, all 21 evaluation cases passed, 24 JavaScript tests passed and all three n8n exports matched. The Python suite ran 153 cases: 152 passed and one Git-search case was skipped because source archives have no Git metadata. All 153 passed in the original Git checkout.

Checked 136 local Markdown links across the README and 25 documentation files; all resolved, including referenced anchors. The linked external documentation pages resolved successfully; the n8n authentication link was updated to its current destination. The workflow tour links directly to implementation and regression tests. This checks destinations and reviewed scope, not a guarantee that external pages never change.

## Live model observations

The four corrected default workflows completed real subscription model reviews on 26 October 2026. Routine release review requested `gpt-6-luna` with low effort; security evidence reviews requested `gpt-6.1-sol` with medium effort. New-feature and new-document release scenarios also completed reviews while retaining human approval.

The runner accepted the requested settings and returned validated pass assessments. Independent backend model identity was not exposed and remains unknown. [Sanitized run summaries](../examples/showcase/verified-runs.json) retain the input/output binding and assessment. Raw account receipts and earlier held results remain private. These summaries are dated observations, not signed provider attestations or a fresh call made by a reader.

The source bundle was corrected after earlier model holds identified missing original inputs and ambiguous release availability. Corrected reviews include relevant eligible sources and original workflow inputs. Missing-policy and missing-register paths were checked with real reviews; wrong-audience and unavailable-feed paths were withheld before dispatch. Repeated inputs reused completed reviews. A routine passing release was delivered once to the private local release feed; new material retained human review.

## Review and packaging

The author tested the demo and accepted its behavior. The dashboard design was approved for inclusion as a coming-soon preview. It remains illustrative and is being rebuilt separately. The two workflow guides moved from `skills/` to `docs/workflow-guidance/`; the optional drafting adapter and documentation references were updated.

## Limits

No live source-system connector, public release publication, customer questionnaire submission, n8n Cloud deployment, hosted dashboard or universal routing hook was verified here. Advisory coverage is fictional snapshot matching; SOC 2 checks are demonstration evidence rules. Cost estimates are not billing or achieved savings. Optional live mode requires the reader's own configured model access; offline mode runs without accounts.
