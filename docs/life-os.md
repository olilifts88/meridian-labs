# Life OS

Life OS is a private Meridian web app for daily tasks, waiting items, personal dates and one saved daily lesson. It replaces the Notion dashboard page while keeping the existing Notion tracker and original records behind it. The interface uses the approved Meridian dark palette and works in a desktop or mobile browser.

The four tabs are Today, Tasks, Waiting and What’s On. AI evaluations, maintenance proposals and suggested fixes stay in the separate [AI performance dashboard](ai-performance-dashboard.md) Review inbox.

## Updates and decisions

- **While open:** the app rereads its saved data every minute and when reopened. Refresh view reads that same saved data immediately.
- **Source updates:** the existing Life Sweep is configured for 08:00, 13:00 and 19:00 Europe/London. It reads the original sources, updates Notion and publishes verified tracker, sweep and daily-learning data to the private app. No additional scheduler is introduced.
- **Refresh source data:** saves an explicit tracker-refresh request for the existing connected publisher. It does not start another mail sweep. The request remains queued until a publisher processes it.
- **Task choices:** Done, Not doing, Pause and Resume are saved immediately in the private app with the authenticated actor, original task ID and evidence revision. The next connected Life Sweep checks the current Notion card, records the bounded change and reads its receipt back. Saved and verified in Notion are distinct states.
- **Agenda:** generated only for an explicit requested date range. Opening the app or a routine sweep does not silently regenerate it.

The app is available from the cloud; viewing it does not require the Mac or a Terminal server. Source publication still depends on the existing connected workflow. The AI dashboard’s retained local-log collection and desktop WHOOP feed have their own Mac dependencies.

Life OS and AI Performance share one private ChatGPT Sites deployment, using Cloudflare Workers and a Cloudflare D1 app database. Hosting the interface does not move Notion records, scheduled ChatGPT work or Mac collectors into Cloudflare. The repository's public AI Workflows route remains the downloadable demo.

A natural 13:00 London run on 30 October 2026 completed in the existing cloud chat. The matching app readback showed successful tracker, sweep and learning publication. The scheduler receipt and app publication were checked separately; an explicit run-ID binding between them was not exposed. Phone notification receipt and the separate Mac desktop-feed update remain unverified. See the [dated verification](verification-life-os-2026-10-30.md).

## Today

What you see:

- The current London date and last verified tracker check.
- One expanded Learn something card with the saved question, short explanation and original lesson link.
- A short next-actions list, coming dates and waiting items, with links to the complete lists.
- A route to AI reviews and suggested fixes in the Performance inbox.
- Source details, update requests and their actual states.

Backing data and freshness:

- Original Notion Life Sweep records, including status, priority, type, dates, factual-review flags and source links.
- The existing daily Knowledge Library lesson, reused unchanged across the day’s sweeps. App refresh does not create another lesson.
- Verified sweep metadata, with its run time separate from each source-read time.
- Published through the existing three daily sweeps or an explicit bounded source request; the browser polls the saved projection every minute.

The next-actions list is a short selection from the tracker, not a fresh AI judgment or a guarantee that every open item appears on the first screen. A past event is not automatically marked Done.

## Tasks

What you see:

- Searchable original tasks with status and priority filters.
- Open work, factual checks, pauses, dismissed items and completed or archived history.
- Task detail with the original card, source context, email/draft links where recorded, decision reason and saved history.
- Explicit Done, Not doing, Pause and Resume controls, with an optional reason and separate return date.
- Pending choices and verified source receipts.

Backing data and freshness:

- A complete inventory of the existing tracker, including inactive statuses, with full content fetched for new or changed cards.
- App decisions in a separate durable store, bound to the task’s source revision.
- Notion remains authoritative after a verified write. A pending app choice never silently overwrites a later source edit.
- The same sweep/request publication timing as Today; a choice is saved immediately but its source completion depends on the connected publisher.

Original deadlines and return dates stay separate. An undated pause lasts until explicit resumption. Archived records do not reopen because an old return date passed. Repeated or interrupted writes reconcile existing receipts instead of repeating completed actions. Task completion never approves an AI fix.

## Waiting

What you see:

- Items where another person or organisation owns the next move.
- Priority, useful dates, the existing reason/context and original source links.
- The same task detail and explicit controls used elsewhere, without making another task copy.

Backing data and freshness:

- The original tracker’s Type and Status fields and saved source evidence.
- Life Sweep establishes the latest state from complete relevant conversations during its normal source scan; a browser refresh does not scan Gmail.
- The shared tracker projection follows the existing sweep or bounded refresh timing. Source times remain visible.

A Type of Waiting and a Status of Waiting describe different aspects of the same record. A follow-up question or a newer message is not automatically a correction, new task or completed commitment.

## What’s On

What you see:

- An explicit London date range with chronological personal events and dated tracker commitments.
- Times, useful locations, all-day and multi-day entries, travel and preparation context where evidenced.
- Overlapping events and provisional tracker items, plus overdue work separately.
- Original Calendar or Notion links and the agenda’s generation/source-read dates.
- A request control for a new range and its queued, running, completed or failed state.

Backing data and freshness:

- The primary personal Google Calendar, read with exact start and exclusive end bounds and all result pages.
- The complete existing tracker, filtered to relevant active dated commitments.
- Matching Calendar Event IDs merge the same event. Similar titles alone do not merge different records or hide a conflict.
- Generated only for an explicit request by the existing connected agenda workflow. The saved agenda stays visible until a verified replacement is published.

The agenda workflow does not change Calendar, RSVP, tracker status, reminders or email. A failed required read retains the previous agenda and reports the error; it is never presented as an empty successful week. Undated work does not receive invented dates.

## Data and history

The app separates original source records, saved projections, authenticated decisions and verified receipts. Tracker, sweep, learning and agenda have independent observation and success dates. A single writer lease prevents overlapping Life OS publication. Complete inventories, source identity checks and revision checks protect imports and decisions.

Existing per-card preferences, reasons, attachments, reminder receipts and prior outcomes remain on their original Notion records. AI review handoffs keep their original choices, free-text notes and evidence revisions on their owning records. The old front pages are migration/history entry points rather than current writers. No Notion database is replaced and no column is deleted.

The app is owner-private. Source access and app access are separate: a Site publication credential grants no Notion, Gmail or Calendar permission. Personal records, private identifiers and credentials are excluded from this repository and its release assets.

[Overall and per-tab dataflow diagrams](life-os-dataflows.md) explain the source and decision paths. [The AI dashboard guide](ai-performance-dashboard.md) covers reviews, activity, usage, maintenance and the workflow lab.
