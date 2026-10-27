# Integrated release-note agent

This is a small, runnable example of one complete AI workflow. It uses a fictional CSV-export change. The source says the feature is in beta for two pilot groups. The agent drafts a note from that source, local checks validate the audience and references, a second model assesses the result, and the release policy decides whether a routine update can enter a **private local demo feed**. Nothing reaches customers, Slack, Notion or a production system.

## Run it yourself

From the repository root, install the Codex CLI if needed and sign in with your existing ChatGPT account. Check the sign-in with `codex login status`. If you use the Codex desktop app on a Mac and `codex` is not on your PATH, you can use the app-bundled CLI in that Terminal window:

```sh
export PATH="/Applications/ChatGPT.app/Contents/Resources/codex-cli/CodexCLI.app/Contents/MacOS:$PATH"
codex login status
```

The example policy requests `gpt-6-luna` at low effort for this routine change; your account must support that model. There is no API-key fallback.

```sh
python3 -m workflow_portfolio.release_agent \
  --policy examples/showcase/review-policy.json \
  --capabilities examples/showcase/review-capabilities.json \
  --receipts private-data/release-agent \
  --as-of 2026-10-27 \
  --live --summary
```

The command prints a short reviewer summary and saves the complete `run-*.json` result under `private-data/release-agent/`. That directory is ignored by Git. Omit `--summary` if you want the complete JSON in the terminal. The summary tells you what source was used, what the agent wrote, how many explicit checks passed, the second model's verdict, the delivery destination, the new-call count and the private record path. Open the saved JSON to inspect:

1. `stages`: source check, agent draft, deterministic evaluation and model review.
2. `result.draft.body`: the model-written text. `result.draft.model` should read `subscription-model`; the quoted availability statement must match the approved source.
3. `result.evaluation.checks`: source, audience and reference checks. These are narrow checks, not a general proof of truth.
4. `result.live_model_review.assessment`: the second model's pass or hold decision. A model pass cannot bypass a failed source check or a required human review.
5. `result.delivery_record`: routine content reaches the private local feed after both checks pass. `external_publication` remains false.
6. `usage`: stage-level token counts when the CLI exposes them, `new_call_token_totals` for this command, `receipt_token_totals` including reused results, and `calls_attempted_this_run`. The hard limit is two subscription calls per command. Cash cost is unknown, so the record does not claim a monetary saving.

Run the same command again with the same receipt directory. The summary should show zero new model calls and an existing delivery record reused. The full JSON will show `calls_attempted_this_run: 0` and empty `new_call_token_totals`. The second run still saves its own run record. If a call fails or a receipt is uncertain, the workflow holds and does not retry automatically. Inspect the private receipt before changing inputs or starting a new run.

To test the source gate without making a model call, start the offline browser with `python3 demo.py`, choose **Release notes**, set the audience to **all customers**, and run the sample. The beta note is blocked. The browser demo's offline route is a preview and its default first draft is a template; use the command above to test the model-written draft.

## What this proves, and what it does not

The route is selected from a sanitized example policy, and the CLI reports the requested model and available token usage. The independent backend identity is not exposed. The two-call limit and deduplicated receipts are real per-run controls, but there is no account-wide spending limit or measured cash cost. The source is a local fictional fixture, and the release is a local file. The broader repo has separate n8n and Python examples, but this command does not deploy to n8n Cloud or connect to live company systems.

On 27 October 2026, the default fictional case completed both subscription calls. The draft and reviewer passed, and the note was written to the local feed. A second run used zero new calls and reused the release ID. The full Python suite passed 157 tests with the bundled Node runtime and loopback socket access. See [the source](../src/workflow_portfolio/release_agent.py) and [the focused tests](../tests/test_release_agent.py).
