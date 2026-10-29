# AI performance dashboard

A private Meridian dashboard brings together operational reviews, recorded tasks, usage estimates and workflow evidence. It has six tabs. The public repository documents its design and data contracts; the owner’s hosted app, personal records and source access are separate from the downloadable workflow demo.

The interface uses the Meridian dark palette. Source dates and missing measurements remain visible. A saved task outcome, an automated quality check and a person’s judgment are separate records.

## Updates and refresh controls

- **Immediate app writes:** review decisions and workflow receipt imports are durable in the app database after saved-data readback.
- **While open:** the dashboard rereads saved app data every minute and on reopening. Manual-refresh status is checked every 15 seconds. These reads do not collect source data.
- **Every 12 hours:** the existing connected reporting job is configured to mirror reviews, task records, saved quality/routing evidence and dated exchange rates. The Mac, app and connected source access must be available.
- **Weekly:** the full retained local-log scan keeps its Monday 09:00 Europe/London due gate and existing overdue catch-up. The lightweight mirror reuses that report.
- **Refresh now:** choose this tab, several tabs or all tabs. A confirmation explains shared sources and other affected tabs. Selecting activity or usage requests a fresh local-log scan. No business workflow or model comparison is replayed.

A durable request queue distinguishes waiting, dispatched, running, completed and failed. An ordinary HTTPS courier checks for explicit requests every 30 seconds and queues the existing connected collector. It does not sync every source at that interval or call a model while idle. Its credential stays in process memory. A Mac restart or expired credential requires the connected reporting job to re-arm it. Requests wait when collection is unavailable.

The collector verifies source writes and app readback before recording completion. A failed source retains its previous dated family. Duplicate active scopes coalesce; different families are merged without erasing unrelated data. These are configured operating rules, not proof of a naturally timed execution or phone delivery.

## Review inbox

What you see:

- Review groups with their original finding, source links and available choices.
- Pending, follow-up, system-issue and history filters.
- Named-fix decisions, evaluator questions and existing human-verdict controls.
- Saved decision status, source-sync receipt and prior source revisions.

Backing data and freshness:

- Complete Life OS review sections and the Suggested Fixes inventory, including applied, denied, superseded and test history.
- App decisions and review revisions stored durably in D1; saving is immediate.
- New source reviews and decisions back to Notion use the 12-hour connected mirror or Refresh now.
- A choice is revision-bound. Recording it does not execute the proposed fix. Missing or changed source evidence blocks an old decision.

## Overview

What you see:

- Review groups awaiting responses, saved decisions and recorded operational tasks.
- Saved answer-quality findings and routing examples, with inspection dates and scope.
- Links into the inbox and usage detail.

Backing data and freshness:

- Shared inbox records, app decisions and original AI Run Metrics rows.
- Validated saved quality/routing projections from the existing evaluator, separate from task counts.
- Task and review mirrors are configured every 12 hours; app decisions appear immediately after saving.
- Quality judgments change only when the existing bounded weekly review inspects new or changed evidence. Reimporting a judgment preserves its inspection date.
- Historical examples are not a whole-account reliability rate, current routing compliance score or model ranking.

## Activity & effort

What you see:

- Retained model-response records, typed tool/action events and local rollout inventory.
- A searchable task history and source-linked task detail.
- Available attempts, duration, execution environment and measurement coverage.
- Capability filters on explicitly tagged records and “What can scale with this setup?” guidance.

Backing data and freshness:

- Original AI Run Metrics rows, projected without replacing their schema or identities.
- Retained Codex log reports for aggregate response/action inventory; these are separate from task records.
- Tasks mirror every 12 hours. Local logs are scanned weekly, or explicitly through Refresh now.
- Capability labels cover inspected records only. Missing attempts, technical retries, worker lineage, duration and whole-task tokens stay unavailable. A follow-up question is not automatically a retry or correction.

## Usage & cost

What you see:

- The latest completed week, measured tokens and the priced subset’s estimated value.
- Fresh input, cached input and output, with pricing coverage.
- GBP by default, an optional USD display, the exchange-rate date and rate-card version.

Backing data and freshness:

- The existing local token collector and versioned token-cost calculation.
- Public ECB reference rates for the dated USD-to-GBP conversion, carried forward if unavailable.
- Local usage updates weekly or on an explicit usage/activity refresh. The 12-hour mirror reuses the latest verified report and can refresh FX.
- Cached input is part of input; reasoning is part of output. Neither is added twice. Unpriced tokens are excluded from cost estimates, not valued at zero.
- Estimates are API-equivalent token values. They are not subscription bills, tool charges, complete account usage or demonstrated savings.

## Notion maintenance

What you see:

- Existing cleanup proposals with a route into the same review inbox.
- Source detail and the decision state of each proposal.
- A separate disclosure explaining additional workspace checks, such as homepage links, duplicates, freshness, structure and filing.

Backing data and freshness:

- The same complete Suggested Fixes and Life OS source family as the inbox.
- The configured 12-hour mirror or Refresh now updates that shared family; the confirmation also names Overview and Review inbox.
- The page consumes existing maintenance findings. Listing possible checks does not establish that a whole-workspace scanner is installed.
- Decisions and later verified fix application retain separate receipts.

## Workflow lab

What you see:

- The frozen fictional workflow pilot, original answers, revised checks and saved human labels.
- Configuration comparisons and inspectable run evidence.
- JSON receipt import, a downloadable format guide and deduplication by stable run ID.

Backing data and freshness:

- Saved pilot outputs and versioned checks, separate from operational task metrics.
- Additional run receipts stored in D1 immediately after a validated import and readback.
- Refresh now rereads saved lab records and shared FX. It does not generate additional answers.
- Optional tokens, model calls, tools, attempts, retries and duration remain unknown when omitted. Rechecking an answer does not add another run.

## Source contracts

The app keeps source records, measurements, derived projections and presentation separate. A review has its original source identity and revision; a decision has the authenticated actor, selected field, choice and receipt. Task projections reuse existing run properties. Usage retains collection date, token categories, rate-card identity and pricing coverage. Every displayed family has its own evidence date.

Only a complete verified source inventory replaces a family. Source failures never turn into an empty inbox or zero usage. Previous review revisions and authenticated decisions are retained. Source access and private Site writer access are verified separately; a Site credential grants no Notion permission.

[See the overall and per-tab dataflow diagrams](dashboard-dataflows.md). [Usage and evaluation modules](usage-and-evaluation.md) and [routing components](model-routing.md) explain supporting repository code.
