# A five-minute tour

This repo shows one problem I care about in AI systems: an answer can read well and still send someone down a path they cannot complete. The example is a fictional release note for a beta export feature. Its source record says two pilot groups can use it. One draft incorrectly says every customer can use it.

## 1. See the decision

From the repo folder, run:

```bash
python3 -m workflow_portfolio demo
```

The first draft is **blocked** for an audience mismatch. A corrected draft for the same change becomes **ready to publish**. A separate new guide waits for an engineer's review. The audit events preserve what happened; a retry does not create another change record. Nothing is actually published.

Open [`beta_csv_bad.json`](../examples/beta_csv_bad.json) and [`beta_csv_good.json`](../examples/beta_csv_good.json) to compare the two drafts. The `evidence` object is the source of truth for feature stage and permitted audience. The `draft` object is a proposal. The rule in [`domain.py`](../src/workflow_portfolio/domain.py) checks that the proposal matches the source. [`service.py`](../src/workflow_portfolio/service.py) turns those findings into a decision, and [`store.py`](../src/workflow_portfolio/store.py) records it.

## 2. See the model comparison

Run:

```bash
python3 -m workflow_portfolio benchmark
```

Both fictional model outputs face the same saved cases. The report shows which case each model passed, where each failed and whether token usage was supplied. A missing token count stays unknown. This is a repeatable evaluation example, not a claim that two live models were called or that the phrase check proves writing quality.

## 3. See how I checked it

Run:

```bash
python3 -m unittest discover -s tests -v
```

The tests cover the wrong audience, a corrected draft, duplicate requests, missing evidence, a new guide's review gate and matched benchmark cases. They show what this offline build does. They do not establish the security or reliability of a live service.

## The next engineering step

I would put identity and permissions in front of the source reader, before any customer information could enter a model's context. Then I would add a real model adapter and a separate delivery worker that records an external receipt. The [rebuild plan](rebuild-plan.md) breaks those steps into testable stages. I have kept them separate so the current demo does not imply that a saved draft was published or that a sample audience check is full tenant security.
