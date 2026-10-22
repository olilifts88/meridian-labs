# n8n version: source checks before release

This is a small, importable version of the same release-note audience check shown in the Python example. The case data is fictional. The workflow is inactive, has no credentials, calls no model and publishes nothing.

Open [the importable workflow export](../exports/n8n/release-note-review.json) to see the nodes, or import that file into a separate n8n test workspace and run its Manual Trigger. It loads two drafts for a beta CSV export: one says all customers can use it, while the confirmed rollout is limited to two pilot groups. The second draft names the pilot groups correctly. The next node compares each draft with its product evidence. The final node makes the results easy to inspect: the first is **blocked**, the second is **ready for delivery**. The latter is a decision state, not a published release note.

The diagram is deliberately small:

```text
Manual Trigger → Load Synthetic Cases → Check Against Evidence → Prepare Decision Summary
```

The reviewable source is [`workflow.json`](../.n8n/release-note-review/workflow.json), with blank Code nodes and an in-file `_code` map to separate [`code/`](../.n8n/release-note-review/code/) files. Run `npm run n8n:build` to refresh the importable export, then `npm run n8n:check` and `npm run test:n8n` to verify that it matches the sources and makes the expected decisions. `npm run n8n:split -- <export.json> --slug <name> --dry-run` verifies that a flat export can be split without changing it. No npm packages are required, but Node 20 or later is recommended.

This n8n flow is an **offline operating example**, not a copy of an employer's workflow. The Python version adds durable decisions, one record per change and an audit trail. Before either version could be used with real customers, it would need authenticated and tenant-scoped evidence access, a model adapter, an engineer review route for new guides, persistent idempotency, an outbox for delivery, monitoring, and a retention policy. See [the rebuild plan](rebuild-plan.md).

The two versions are checked against the same saved example cases. Their decision names differ slightly: n8n's `engineer_review` means Python's `review_required`, and n8n's `ready_for_delivery` means Python's `ready_to_publish`. Neither is evidence that anything was published. The n8n flow has not yet been run inside a hosted n8n workspace, and its simplified canvas does not implement Python's persistent record and review transitions.
