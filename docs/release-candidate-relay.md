# Release candidate relay

This is the next slice of the release journey. A product-change report arrives with a proposed feature, its confirmed availability, the engineer, and the PRs that support it. The relay keeps related PRs on one candidate, checks stable feature and PR keys against prior suggestions, and prepares a review card. It does not announce, publish, tag a real person, or write to another service.

The original system separated expensive codebase analysis in a GitHub Action from a short n8n webhook relay. This independent build keeps that **webhook → Code node** shape. The upstream analysis Action is not in the reviewed snapshot, so the saved [fictional report](../examples/release_candidates.json) stands in for its output. The source also recorded candidates and review decisions in other systems. This portfolio now has an inactive [callback parser](../.n8n/candidate-review-callback/workflow.json) and a separate [local SQLite decision store](../src/workflow_portfolio/candidate_review.py). It still has no live Slack, Notion or publishing adapter.

```text
fictional change report → candidate webhook → validate and dedupe → review card preview
```

Open the [n8n source](../.n8n/release-candidate-relay/workflow.json) and [Code node](../.n8n/release-candidate-relay/code/prepare-candidate-review.js) to inspect the implementation. The [generated export](../exports/n8n/release-candidate-relay.json) is the file to import into a test n8n workspace. It is inactive and has no credentials. Its predictable demo webhook path must not be activated on a public service without authentication.

The same Code-node file can run on GitHub without n8n. From the repo root, run `node scripts/preview-candidates.mjs examples/release_candidates.json`, or select `release_candidates` in the manual [code-only GitHub Action](../.github/workflows/code-only-review.yml). Both paths only print a preview and return the next dedupe keys. The caller would need to save those keys before a later run; this demo does not pretend that state is persistent.

In the saved example, two fictional PRs form one CSV export feature for two pilot cohorts. An older feature is already in `seen_keys`, so it is skipped. Re-running with the returned `next_seen_keys` skips both candidates. The preview shows three possible decisions. The [callback walkthrough](candidate-review.md) shows how a fictional button click becomes a bounded command, how a code-only store saves that decision, and how retries avoid a duplicate event. The button is **not** wired to Slack or the store when importing the inactive n8n workflow. The separate [audience check](n8n.md) demonstrates why a later release-note draft must still match the confirmed pilot availability before any publication decision.
