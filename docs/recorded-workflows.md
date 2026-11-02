# Recorded runs and visitor scenarios

Current routes, model choices, pricing checks and setup are described in [Workflow model routing and cost estimates](workflow-stage-routing.md). The original saved answers remain unchanged.

Use [the public AI Workflows site](https://meridian-ai-workflows-oli.misty-moon-5776.chatgpt.site/) or [download and run a local copy](showcase-quickstart.md#run-the-download-locally). The public site needs no installation. Both offer the same workflow interface, review tools and artefact pages. **Saved results** reopens records stored in the browser used.

The current browser interface lives in `demo-web/`; `showcase_demo.py` serves those assets locally. The original recorded-run engine remains in `recorded_showcase.py` and the developer server. Its model evidence is available through the supporting run library.

| Path | Evidence and execution | Persistence |
| --- | --- | --- |
| `/runs.html` → `/results.html?run=...` |40 actual recorded model answers, source snapshots, original and revised checks, requested settings, owner-review labels and measured generation usage | Versioned fictional snapshot in `examples/recorded-runs/` |
| `/scenarios.html` → `/results.html?session=...` | Choose a workflow scenario, inspect its route, run the prepared review and open its source-linked outputs | Browser local storage; downloadable JSON; never added to the model benchmark |

The original developer server’s scenario API only accepts a known record ID and one of pending/approve/reject. Extra/free-text input, unknown records, arbitrary models and generation flags are rejected. `/api/scenario` does not invoke a dispatcher, including when the older optional model-review session is enabled. Failed answer checks hold actions. Correctly identified evidence gaps stay gaps after approval. Commercial CRM changes apply only after the visitor's simulated approval. Business output is simulated; there are no external writes.

## Reuse and provenance

`recorded_showcase.export_snapshot` verifies all40 private answer/receipt bindings through the existing pilot reporter before exporting fictional inputs and model outputs. It excludes authentication, raw diagnostic receipts and human-review prose. The exported frozen experiment includes reference data and marking rules for reproducibility; that reference data was not included in the model's original input. Actual model inputs are displayed separately.

`run_scenario` reuses `ai_pilot.assessment` with the versioned v2 marking rules, plus the existing `call_crm.simulate/evaluate` engines. No second AI judge or alternative collector is introduced. Both result views link to the same four matched model/instruction answers. Original v1 and revised v2 check outcomes stay distinct. Human answer-quality feedback and simulated business approval are separate.

Each new visitor record embeds the original answer, evidence and provenance alongside the new check findings, local execution time, simulated decision/outcome and source-run ID. Historical generation tokens are never attributed to the new replay. The replay records zero new model calls/tokens and explicitly declares `benchmark_contribution: false`.

The original experiment used fixed model and instruction setups. The current workbench adds editable stage routes and cost estimates; those plans do not create new model samples. Neither the two-case-per-workflow sample nor the post-pilot checker correction establishes real-world accuracy or cost savings.

## Storage and download

`demo-web/assets/visitor-results.mjs` owns one browser storage key, validates the result contract, refuses conflicting IDs, retains up to50 records without eviction and supports individual removal. Storage errors keep the completed result visible and downloadable instead of claiming it saved. Browser records are editable local data, not authenticated evaluation evidence. They are never uploaded to the owner's review queue or written into the snapshot. Saved results embed their source answer; if the snapshot changes later, the viewer warns that its comparison uses the current snapshot.

Online and local histories are separate. Results saved on the public site do not appear in a localhost copy or another browser. Private-browser results may be removed when that session closes.

## Standalone delivery

`python3 scripts/build-workflow-showcase.py` builds `dist/meridian-ai-workflows.zip` from an explicit file allowlist. The ZIP contains one top-level folder and one quick-start README, Python source, fictional fixtures, recorded model snapshot and required browser assets. It excludes `.git`, private-data, credentials, logs, databases, automation projects and unrelated source. `showcase_demo.py` is the recorded-only launcher and disables private owner review. The larger repo's existing local developer entry points are retained.

The ZIP and README are published together in [GitHub Releases](https://github.com/olilifts88/meridian-labs/releases/tag/ai-workflows-v1.2.1). The [public hosted site](https://meridian-ai-workflows-oli.misty-moon-5776.chatgpt.site/) is also live. It serves the exported browser assets and a hosted pricing check; it does not run the Python localhost server. The download path remains supported.


## Studio, routing and estimated costs

The selected Studio 1 direction is applied to all five workflow entry paths and the shared library/result/evaluation/history pages. The shared result uses tabs to keep evidence and technical details accessible without filling the overview. Estimated API cost and a versioned offline routing decision are joined at read time, leaving the recorded snapshot unchanged. See [the rules, calculation and verification scope](showcase-routing-and-costs.md). No additional AI calls are made.
