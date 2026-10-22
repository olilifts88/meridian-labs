# Opt-in n8n deployment

The original system stored each n8n canvas beside its Code-node files, assembled an importable workflow, then deployed changed workflows through the n8n API. Meridian Labs keeps that layout. The deployment command is deliberately narrower: it handles **one named, inactive workflow at a time** and never activates it.

## Preview without contacting n8n

With Node 20 or newer, run:

```bash
npm run n8n:build
npm run n8n:check
npm run n8n:deploy -- --workflow release-candidate-relay
```

That last command prints the proposed action and makes no network call or write. With no remote snapshot, it assumes the name is unused and previews a create. To preview an update or archived/active conflict, provide a locally saved **sanitised** JSON array of remote workflow summaries with `--remote-snapshot path/to/remote-list.json`. Do not commit a real workspace export without reviewing it for sensitive data.

## Optional live write

This is a manual operator action, not a GitHub Action. Set `N8N_API_KEY` in your own environment and pass your n8n Cloud HTTPS origin as `--base-url`. The command reads the current workflow list and requires an exact expectation:

```bash
# Create only if there is no workflow with the same name:
npm run n8n:deploy -- --workflow release-candidate-relay --apply --base-url https://your-workspace.app.n8n.cloud --expect create

# Update only an inactive workflow whose ID you have checked:
npm run n8n:deploy -- --workflow release-candidate-relay --apply --base-url https://your-workspace.app.n8n.cloud --expect YOUR_WORKFLOW_ID
```

An update refuses an active or archived workflow, duplicate names, stored execution state and existing credential references. The command checks the saved workflow after a write. New workflows stay inactive. You must inspect the import and configure credentials, webhook path and access in your own workspace before enabling anything. There is no configured Meridian Labs n8n account and no live deployment test yet.

The API boundary follows [n8n's public API authentication guidance](https://docs.n8n.io/api/authentication/) and the workflow shape in the accepted source snapshot. n8n API versions and Cloud behaviour may change, so a real workspace dry run and readback are still required before relying on the live path.

## Read-only mirror preview

The mirror tool can fetch one workflow by ID into `local-mirror/`, which Git ignores:

```bash
npm run n8n:mirror -- --workflow-id YOUR_WORKFLOW_ID --base-url https://your-workspace.app.n8n.cloud
```

It uses a GET request only. It removes credential references and live static state from the saved preview, but **Code-node text and parameters can still contain private information**. Review the file yourself before moving any part into the repo. No Git commit, nightly schedule or automatic sync is configured. Those remain future work, and should only be enabled after a source review and real-workspace test.
