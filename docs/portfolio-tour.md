# Workflow tour

Start the browser demo with `python3 demo.py` from the repository folder. Open http://127.0.0.1:8765/. The [setup guide](showcase.md) explains offline mode and optional real model execution.

## 1. Release notes

Run the routine CSV export update. Source checks verify feature, stage, audience and citations. The independent output evaluator checks the emitted draft. In live mode a policy-selected model reviews it against the approved evidence. A passing routine update is written once to the private local demo release feed. Offline mode pauses at model review.

Select **New feature** or **New document** to load a distinct fictional source fixture. These paths retain human review even after a passing model assessment. Change the audience to all customers to see a deterministic block before a model call. Repeated successful runs reuse the review and delivery identity.

The showcase uses the existing release service for bounded in-memory draft validation. Its optional live session adds private durable model receipts and local delivery records. The older SQLite service has its own review transitions; `ready_to_publish` is a policy state, not proof of external publication. See [release engineering](release-workflows.md).

## 2. Vulnerability review

The sample matches exact package, ecosystem and pinned version against supplied fictional advisories. Findings carry severity, policy-derived owners, deadlines and available fixed versions. The output evaluator checks coverage and remediation facts. An optional routed model reviews the policy, original inventory, advisory inputs and output together.

Disable the feed to see incomplete coverage rather than a clean scan. No dependency discovery, live advisory lookup, package upgrade or ticket creation occurs. A fixed version is advisory evidence, not a safety guarantee.

## 3. Security questionnaires

Five sample questions use explicit control keys. Four produce cited policy-text drafts; the unsupported SOC 2 question is withheld. Conflicting approved texts are also held back. The output evaluator checks question coverage, answer grounding and gap counts; live mode adds a model review against the actual question inputs and relevant policies.

This is transparent policy lookup, not semantic retrieval or certification verification. Every answer remains unapproved pending human review. No questionnaire is submitted.

## 4. SOC 2 evidence review

Review five demonstration controls against an evidence register. One has evidence ready for a reviewer; four illustrate stale evidence, missing ownership/evidence, an out-of-period item and pending approval. Source checks and the evaluator verify the review rules; the optional model receives the original control register and relevant evidence.

The 90-day sample freshness rule is a demonstration policy, not a SOC 2 requirement. Date and approval checks do not establish evidence sufficiency, control effectiveness or audit readiness.

## How the knowledge connects

| Local source | Used for | Boundary |
| --- | --- | --- |
| Product-change and scenario snapshots | Release scope, availability, PR references and review category | No live GitHub retrieval |
| Notion- and Drive-shaped policy records | Source-backed questionnaire drafts | Supplied policy text, not proof the control operates |
| Advisory inputs and remediation policy | Dependency triage, owners and deadlines | Fictional snapshot matching, not live coverage |
| Control and evidence registers | SOC 2 evidence follow-ups | Demonstration mapping, not an auditor's conclusion |

Approval, public-demo scope and review dates filter sources before processing. Outputs carry evidence snapshots and original workflow inputs so a reviewer can inspect what was used. These local flags are filtering rules, not tenant authentication or permissions.

## What the journey shows

The interface separates deterministic processing, policy routing, output evaluation, actual model review (or an explicit preview/skip), and the final release/review gate. A correctly blocked unsafe claim can pass the evaluator because withholding it was the expected safe behavior. A model hold cannot be overridden by a passing deterministic check.

Expand **Inspect complete result** for the JSON. `cached` and `model_called_this_run` distinguish reuse from a new call. Backend model identity is not invented when the runtime exposes only requested settings and completion.

Continue with the [capability evidence map](capability-check.md), [verification record](verification-2026-10-26.md), [usage/evaluation](usage-and-evaluation.md) and [broader portfolio map](portfolio-map.md).

## Follow a run into the code

| Stage | Implementation |
| --- | --- |
| Inputs and source snapshots | [`examples/showcase/`](../examples/showcase/) |
| Workflow processing | [`showcase.py`](../src/workflow_portfolio/showcase.py) |
| Independent output checks and route selection | [`showcase_assurance.py`](../src/workflow_portfolio/showcase_assurance.py) |
| Model review instructions and response validation | [`showcase_review.py`](../src/workflow_portfolio/showcase_review.py) |
| Session budget, receipt reuse and local delivery | [`showcase_server.py`](../src/workflow_portfolio/showcase_server.py) |
| Repeatable scenarios and corrupted-output checks | [`showcase_evaluation.py`](../src/workflow_portfolio/showcase_evaluation.py) |
| Regression tests | [`test_showcase.py`](../tests/test_showcase.py), [`test_showcase_assurance.py`](../tests/test_showcase_assurance.py), [`test_soc2_showcase.py`](../tests/test_soc2_showcase.py) |

Use the [capability map](capability-check.md) to locate the specific function and test behind a claim. Return to the [README folder guide](../README.md#folder-guide) for the rest of the repository.
