# Calls to Notion CRM and customer intelligence

Notion is the CRM in this example. Calls contribute evidence to deal changes, engineering issues, commercial themes and human decisions. The connected Notion environment contains fictional, editable records; the browser runs a separate reproducible snapshot. Browser actions do not sync to Notion.

## Try the journey

Run `python3 demo.py` and open **http://127.0.0.1:8765/calls**, or choose **Calls to Notion CRM → Open workflow** in the home directory.

1. Process Northstar's first call. Its authorised decision includes pilot scope, start and success criteria. The demo advances Qualified to Pilot and creates simulated issue SIM-101 at Medium.
2. Process Pebble's call, then Northstar's repeat. One issue holds three calls from two distinct accounts; priority stays Medium.
3. Process Cedar's call. The third distinct account raises priority to High. A tentative £32,000 annual budget and an uncommitted delivery request remain pending.
4. Open **Slack mock**. Select individual proposals or approve/reject all. Rejection needs a reason; free-text corrections are retained in the result. A decision carries the exact proposal fingerprint. Stale, duplicate or automatic-action reviews are rejected.
5. Open **Reports & prep**. Switch the latest-call template, edit its text, inspect weekly engineering/GTM previews and next-meeting preparation, or ask about an account. Missing documentation produces a proposal for verification, not a published answer.
6. Open **Evaluation**. Inspect the call checks and run the shared saved-output benchmark across all five workflows. Download the run evidence to inspect actions, feedback, sources and the common evaluation record.

The timeline can replay any prefix of the four calls. Changing the prefix resets review decisions. Browser edits and review state are session-local; reloading resets them. The JSON download retains the simulation's machine-readable actions and feedback; edited report prose is a separate browser-only draft.

## Notion demo structure

The demo lives under the existing Meridian project in OliOps, linked from Oli OS. It contains six databases:

| Object | Core fields | Relationships |
| --- | --- | --- |
| Accounts | Account ID, segment, owner, health, last call, next meeting | Referenced by contacts, deals, calls and signals |
| Contacts | Contact ID, role, example email, stakeholder role | Account |
| Deals | Deal ID, stage, annual value GBP, owner, next step, close date, revision | Account; referenced by action records |
| Calls | Call ID, date, report template, processing state, summary; transcript in body | Account; referenced by signals/actions |
| Signals | Signal ID, kind, priority, distinct-account and unique-call counts, decision, mock issue key | Accounts and calls |
| Approvals | Action ID, state, field, before/after, proposal revision, reason, reviewer, feedback | Deal and evidence calls |

Seed: three accounts, three contacts, three deals, four calls, three signals and three action records. Two action records remain Pending. The automatic Northstar stage change was applied to the fictional Notion deal and read back. The engineering signal was first Medium and then updated to High with cumulative evidence. No actual Linear issue or Slack message was created.

Pipeline, call-timeline, signal and pending-decision views support inspection. A status property or illustrative checkbox is not an authenticated execution instruction. Private workspace IDs and links are deliberately absent from public repository fixtures; find the environment through Oli OS / Meridian Labs · Notion CRM demo.

## What is reused

| Shared component | Use here |
| --- | --- |
| `showcase_server.py` | Existing loopback server, local-origin checks, JSON/body limits and browser entry point |
| `evals.evaluation_record` | Same criterion record, input/output digests, rubric identity and unavailable-usage fields used by all five browser workflows |
| `evals.compare_workflow_candidates` | Frozen-input comparisons that call the existing domain evaluators |
| `usage.measure_run` / `usage.token_cost` | Existing measurement and valuation path; no duplicate collector or rate card |
| `calibration-feedback.cjs` | Existing frozen-revision feedback validation, available for later human calibration; not silently connected to the mock review controls |

Call-specific logic lives in `call_crm.py`: evidence spans, account/deal association, bounded stage policy, rolling corroboration window and revision-bound simulation reviews. It does not replace the release service's persistent review machinery. The shared [evaluation framework](evaluation-framework.md) explains this boundary.

## Current execution and next stages

This first stage uses authored transcripts and extraction candidates. Code validates exact evidence excerpts and executes explicit demo rules. No transcription service, model extraction, reviewer sub-agent or general intent recognition ran. Candidate facts are trusted fixture inputs, not a secure ingestion format for arbitrary transcripts.

The rule for High is three distinct accounts reporting the same blocking issue in seven calendar days. This is illustrative policy. Mentions from one account do not become multiple accounts; Urgent is never automatic. Priority is not automatically lowered when evidence ages out.

Next stages can add a bounded subscription-model extraction/review adapter, compare saved outputs on held-out human-labelled cases, then connect a test Notion writer and authenticated reviews. Production would also need persistent event/receipt storage, connector failure recovery, permissions and delivery readback. No background schedule, live writer or learning policy was installed by this demo.

The Notion fixture creation was a real connected operation in this build. It is not proof that the browser has a working Notion connector. Linear/Slack views are inspectable mock interfaces, not screenshots of those services or live integrations.

## Verification

See [dated call and shared-evaluation evidence](verification-call-crm-2026-10-27.md), the focused tests in `tests/test_call_crm.py`, and the benchmark tests in `tests/test_workflow_benchmarks.py`.
