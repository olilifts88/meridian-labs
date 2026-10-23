# Operational evidence and impact

## Evidence currently represented

| Example | Engineering evidence | Claim boundary |
| --- | --- | --- |
| Release and candidate review | Python/SQLite state, guarded review actions, n8n exports and offline checks | Fixture-tested examples; not proof of a hosted production rollout |
| Usage accounting | Plain/compressed log reader, explicit task bindings, deduplication and subset checks | Counts supplied evidence; does not discover all cloud/mobile tasks |
| Evaluation feedback | Case/revision-bound human decisions and replay prevention | Automated checks do not become human approval |
| Local routing pilot | Notion-sourced requested model/effort; completed subscription CLI summary with returned usage | One narrow local execution, not universal routing or net savings |
| Cross-device operation | Shared policy and a documented acceptance matrix | Phone/cloud/timer adoption needs observed account evidence |

## What an operational rollout should measure

- Adoption: weekly active users and recurring workflow use, from an available source with a defined denominator.
- Reliability: completed/attempted tasks, connector errors, duplicate actions and recovery.
- Quality: agreed criterion results and selected human calibration, with sample sizes.
- Efficiency: time/rework before and after on comparable work; complete-task tokens and estimated token value where measurable, including coordination and retries.
- Maintainability: shared policy ownership, repeatable tests, documented permissions and an existing scheduler.

These are proposed measures, not achieved business results. No company-scale adoption, production uptime, time-saving or cost-saving figure is supplied by the fictional demos. Production evidence should be added with a source, period, baseline, denominator and sharing permission; omit confidential records.

## Acceptance checks · 23 October 2026

- 108 Python tests and 24 JavaScript tests passed. Three n8n exports match their source. These checks use fictional fixtures and make no model calls.
- A normal local request, with no routing reminder, loaded shared guidance and returned the correct three-fact status update directly. Its trace contains guidance reads and no worker dispatch or writes.
- A separately authorised native Luna/Low worker returned the correct bounded status update. This verifies explicit native dispatch, not automatic delegation across all cloud chats.
- The direct-request CLI turn reported 156,494 input tokens (123,008 cached, included in input) and 299 output tokens. Guidance/tool context can dominate a tiny task; this is a measurement, not a saving. Shared coordinator overhead is excluded.
- Three existing cloud schedules already reference the shared policy. Their saved links were inspected; no additional job or timed business run was started.

Phone-initiated execution, natural scheduled adoption after this policy change and universal ordinary-Chat capture remain unverified. Source code and saved instructions alone do not establish those outcomes. No additional API service, API-key authentication or Notion-agent job was introduced.
