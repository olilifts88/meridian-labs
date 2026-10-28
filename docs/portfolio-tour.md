# Reviewer walkthrough

Start at the [README](../README.md), then follow this path from the repository folder. It takes about ten minutes. The example data is fictional and local. The [integrated release agent](release-agent.md) writes its first draft with a model; the browser demo starts from a template and can add a model review. They are two different implementations of the same release decision.

## First: a model-written release note

1. Read the approved [CSV export source](../examples/showcase/knowledge.json) and note that two PRs support one beta feature for two pilot groups. A merged PR is not proof that every customer has access.
2. With the Codex CLI signed in to your own ChatGPT account, run the [integrated release agent](release-agent.md#run-it-yourself) using `--summary`. Expect a short account of the source, model-written draft, deterministic checks, model verdict, local delivery and call count. No customer receives the note.
3. Open the private `run-*.json` path printed by the command. In `result.draft.body`, find the exact pilot availability statement. `result.evaluation.checks` shows the source, audience and reference checks; `result.live_model_review.assessment` shows the second model's verdict. `result.delivery_record` is a local file receipt, not an external publication.
4. Repeat the same command with the same receipt directory. Expect zero new model calls and an existing delivery record reused. This is the duplicate-run check, not another release.
5. Follow the code in [`release_agent.py`](../src/workflow_portfolio/release_agent.py) and the focused [tests](../tests/test_release_agent.py). The [verification record](verification-2026-10-27.md) states what was actually run and which production connections remain absent.

## Then: inspect the browser workflows

Run `python3 demo.py` and open http://127.0.0.1:8765/. The home directory introduces all five workflows; choose **Open workflow** under Release notes to begin. The default browser mode is offline, so its model route is a preview. The browser does not display the model-written draft from the CLI run. Start with the [exact release-note comparison](showcase.md#five-minute-walkthrough): run once for the confirmed pilot groups, then change only the proposed audience to all customers and run again. The first waits for model review; the second must say blocked. Keep the terminal open and press Ctrl+C to stop. The [browser setup guide](showcase.md) explains optional live model review.

## 1. Release notes

Run the routine CSV export update. Source checks verify feature, stage, audience and citations. The independent output evaluator checks the emitted draft. In live mode a policy-selected model reviews it against the approved evidence. A passing routine update is written once to the private local demo release feed. Offline mode pauses at model review.

Select **New feature** or **New document** to load a distinct fictional source fixture. These paths retain human review even after a passing model assessment. Change the audience to all customers to see a deterministic block before a model call. Repeated successful runs reuse the review and delivery identity.

The demo uses the existing release service for bounded in-memory draft validation. Its optional live session adds private durable model receipts and local delivery records. The older SQLite service has its own review transitions; `ready_to_publish` is a policy state, not proof of external publication. See [release engineering](release-workflows.md).

## 2. Vulnerability review

The sample matches exact package, ecosystem and pinned version against supplied fictional advisories. Findings carry severity, policy-derived owners, deadlines and available fixed versions. The output evaluator checks coverage and remediation facts. An optional routed model reviews the policy, original inventory, advisory inputs and output together.

Disable the feed to see incomplete coverage rather than a clean scan. No dependency discovery, live advisory lookup, package upgrade or ticket creation occurs. A fixed version is advisory evidence, not a safety guarantee.

## 3. Security questionnaires

Five sample questions use explicit control keys. Four produce cited policy-text drafts; the unsupported SOC 2 question is withheld. Conflicting approved texts are also held back. The output evaluator checks question coverage, answer grounding and gap counts; live mode adds a model review against the actual question inputs and relevant policies.

This is transparent policy lookup, not semantic retrieval or certification verification. Every answer remains unapproved pending human review. No questionnaire is submitted.

## 4. SOC 2 evidence review

Review five demonstration controls against an evidence register. One has evidence ready for a reviewer; four illustrate stale evidence, missing ownership/evidence, an out-of-period item and pending approval. Source checks and the evaluator verify the review rules; the optional model receives the original control register and relevant evidence.

The 90-day sample freshness rule is a demonstration policy, not a SOC 2 requirement. Date and approval checks do not establish evidence sufficiency, control effectiveness or audit readiness.

## 5. Calls to Notion CRM

Open `/calls` from the main workflow page. Follow four calls through a fictional B2B software CRM. Northstar's authorised pilot decision advances its deal. Export failures accumulate in one simulated Linear issue; a repeat call does not inflate the distinct-account count, and a third account raises priority to High.

Use the Slack mock to approve or reject selected proposals with feedback, switch meeting-report templates, inspect preparation and weekly-report previews, then open Evaluation. The shared comparison calls the existing evaluators for all five workflows. Its synthetic outputs test checker behaviour, not model accuracy. See [Calls to Notion CRM](call-crm.md) and [shared evaluation](evaluation-framework.md).

The editable Notion environment is separate from the browser snapshot. Browser decisions do not write to Notion, Linear or Slack. Transcripts and extraction candidates are authored fixtures; no model extraction or reviewer sub-agent ran.

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

Continue with the [capability evidence map](capability-check.md), [27 October integrated-agent verification](verification-2026-10-27.md), [26 October browser verification](verification-2026-10-26.md), [usage/evaluation](usage-and-evaluation.md) and [broader repository map](portfolio-map.md).

## Follow a run into the code

| Stage | Implementation |
| --- | --- |
| Model-written release draft, checks and local record | [`release_agent.py`](../src/workflow_portfolio/release_agent.py), [`test_release_agent.py`](../tests/test_release_agent.py) |
| Inputs and source snapshots | [`examples/showcase/`](../examples/showcase/) |
| Workflow processing | [`showcase.py`](../src/workflow_portfolio/showcase.py) |
| Independent output checks and route selection | [`showcase_assurance.py`](../src/workflow_portfolio/showcase_assurance.py) |
| Model review instructions and response validation | [`showcase_review.py`](../src/workflow_portfolio/showcase_review.py) |
| Session budget, receipt reuse and local delivery | [`showcase_server.py`](../src/workflow_portfolio/showcase_server.py) |
| Repeatable scenarios and corrupted-output checks | [`showcase_evaluation.py`](../src/workflow_portfolio/showcase_evaluation.py) |
| Regression tests | [`test_showcase.py`](../tests/test_showcase.py), [`test_showcase_assurance.py`](../tests/test_showcase_assurance.py), [`test_soc2_showcase.py`](../tests/test_soc2_showcase.py) |
| Call evidence, cumulative priority and simulated reviews | [`call_crm.py`](../src/workflow_portfolio/call_crm.py), [`test_call_crm.py`](../tests/test_call_crm.py) |
| Shared record and frozen-input comparison | [`evals.py`](../src/workflow_portfolio/evals.py), [`test_workflow_benchmarks.py`](../tests/test_workflow_benchmarks.py) |

Use the [capability map](capability-check.md) to locate the specific function and test behind a claim. Return to the [README folder guide](../README.md#folder-guide) for the rest of the repository.
