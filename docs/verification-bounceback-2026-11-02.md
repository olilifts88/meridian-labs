# Bounceback verification · 2 November 2026

Scope: a sixth prepared-response workflow built on the merged Meridian UI refresh. No production deployment, live inference or external support-system writes were performed.

## Results

- **Automated web suite:** 124/124 passed, including 10 recovery tests. Covered normal recovery, missing guidance, technical exception, learned reuse, idempotence, account scope, stale sources, missing confirmation, wrong-account logs, unapproved fix, withdrawal after reopen, immutable snapshots and storage failures.
- **Browser journey:** Chrome completed REC-101 → REC-102 → prepared technical fix → REC-103. Confirmed evidence drawer, route settings, local save/reload, shared saved-result page, read-only snapshot and reopened-case withdrawal. No page errors in that journey.
- **Browser failure paths:** stale-source evidence is visible in the drawer; malformed working data remains intact and blocks actions until reset; a simulated storage write failure leaves the previous displayed state intact; missing confirmation leaves the case open. Home entry and the existing release-note workbench were checked. An initial regression assertion used the wrong existing page heading; corrected to “Prepare a release announcement” and rerun successfully.
- **Layout:** desktop light/dark and 390px mobile views inspected. Mobile viewport screenshot verified the case content and navigation; no horizontal overflow. A full-page mobile capture repeated viewport tiles, so it was not used as layout evidence.
- **Download:** packaged asset parity passed, 257 manifest files, 10 HTTP paths, offline prices, original 40 recorded answers and blocked server writes verified.
- **Source hygiene:** authored fictional cases only. No application recording, employer brief, private ticket records, credentials or external integrations added.

## Boundaries

The model route and token costs are editable planning assumptions; no actual model-task cost, latency or accuracy was measured. The learning index is browser-local exact-key retrieval over checked records. It illustrates knowledge reuse, not model training or a production search service. Functional checks do not establish customer outcomes or cost savings in production.

The reviewer-facing hosted link remains a publication step. Existing public site, GitHub release assets and Notion reviewer content were not replaced during these tests.
