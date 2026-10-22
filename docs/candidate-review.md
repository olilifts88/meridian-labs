# Review a release candidate

The fictional CSV export report groups two PRs into one announcement candidate. A reviewer could mark that candidate announced, defer it, or decline it. This review decides what happens to the **announcement candidate**; it does not approve release-note publication or grant feature access.

```bash
node scripts/preview-review-action.mjs examples/candidate_review_action.json
python3 -m workflow_portfolio candidate-review-demo
```

The first command executes the exact Code-node file used by the inactive [n8n callback workflow](../.n8n/candidate-review-callback/workflow.json). It checks a fictional Slack-shaped button event and emits a small command: candidate key, reviewer, decision and stable event ID. It does **not** apply the decision. The [saved command](../examples/candidate_review_command.json) matches that output.

The second command registers the same fictional candidate in a temporary SQLite database, applies the command and retries it. The retry returns `duplicate_event: true` and leaves one audit event. The [store](../src/workflow_portfolio/candidate_review.py) prevents one PR from being claimed by another candidate, refuses a conflicting second final decision, and lets a deferred candidate receive a later final decision. It neither posts an announcement nor updates a Notion page.

The n8n workflow is **inactive** and has no credentials. Its predictable demo webhook path and parser are not authentication. A real Slack integration must verify the Slack request signature at a trusted edge, bind the reviewer to the allowed role, then call a persistent store. A separate delivery adapter would record the external receipt before anyone could describe the announcement as sent. The [release-note audience check](release-journey.md) is another distinct decision: it prevents a draft from promising a feature to the wrong customers.
