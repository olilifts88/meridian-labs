# A five-minute tour

This repo shows one problem I care about in AI systems: an answer can read well and still send someone down a path they cannot complete. The example is a fictional release note for a beta export feature. Its source record says two pilot groups can use it. One draft incorrectly says every customer can use it.

## 1. Follow one product change

From the repo folder, run:

```bash
node scripts/preview-candidates.mjs examples/release_journey.json
python3 -m workflow_portfolio journey examples/release_journey.json
```

The first command groups two PRs for a beta export into one candidate and shows the review-card preview. The second takes the same product report through the release-note checks. The first draft is **blocked** because it promises the feature to everyone. A corrected draft for the same change becomes **ready to publish**. The audit events preserve both decisions. Nothing is actually published. [The journey page](release-journey.md) explains where the two paths connect and where they remain separate.

Open [`release_journey.json`](../examples/release_journey.json) to compare the report and the two drafts. The [journey code](../src/workflow_portfolio/journey.py) takes stage and audience from the report, not the proposed draft. [`domain.py`](../src/workflow_portfolio/domain.py) checks the claims, [`service.py`](../src/workflow_portfolio/service.py) makes the decision, and [`store.py`](../src/workflow_portfolio/store.py) keeps one change record and its history. For a separate new-guide review example, run `python3 -m workflow_portfolio demo`.

## 2. See the model comparison

Run:

```bash
python3 -m workflow_portfolio benchmark
```

Both fictional model outputs face the same saved cases. The report shows which case each model passed, where each failed and whether token usage was supplied. A missing token count stays unknown. This is a repeatable evaluation example, not a claim that two live models were called or that the phrase check proves writing quality.

## 3. Inspect the n8n and GitHub-only paths

The [release candidate relay](release-candidate-relay.md) follows the original **webhook → Code node** shape. Its fictional report groups two PRs into one candidate and skips a previously suggested feature. Run it without n8n using `node scripts/preview-candidates.mjs examples/release_candidates.json`, or inspect its [generated n8n export](../exports/n8n/release-candidate-relay.json). The output is a review-card preview. It does not send Slack messages or save Notion rows.

The [candidate review example](candidate-review.md) adds a separate inactive callback parser and a code-only SQLite decision store. Run `node scripts/preview-review-action.mjs examples/candidate_review_action.json` to see the normalized button event, then `python3 -m workflow_portfolio candidate-review-demo` to see one stored decision and a harmless retry. These are two offline stages; the n8n canvas does not call the Python store.

The [release-note audience check](n8n.md) has an inactive n8n canvas and a separate Python service. The [manual GitHub Action](../.github/workflows/code-only-review.yml) can run the `release_journey` case without a hosted n8n workspace. Its code-only path is still narrower than the full release journey described in the [portfolio map](portfolio-map.md).

## 4. See how I checked it

Run:

```bash
python3 -m unittest discover -s tests -v
```

The Python tests cover the wrong audience, a corrected draft, duplicate requests, missing evidence, a new guide's review gate, announcement-decision retries and matched benchmark cases. Run `npm run test:n8n` to check n8n export round-trips, grouped PRs, repeated candidates, the callback parser, the message preview, and guarded deployment and mirror behaviour. These checks show what this offline build does. They do not establish the security or reliability of a live service.

## The next engineering step

I would put identity and permissions in front of the source reader, before any customer information could enter a model's context. The optional [OpenAI adapter](openai-drafting.md) is limited to fictional sources and still needs a live test. A separate delivery worker would need to record an external receipt. The [rebuild plan](rebuild-plan.md) breaks those steps into testable stages. The current demo does not imply that a saved draft was published or that a sample audience check is full tenant security.
