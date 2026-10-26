# Implementation plan

[The portfolio map](portfolio-map.md) compares the earlier system with this repository and shows the intended GitHub layout. This plan is the build sequence. The current audience-check examples are a safe scaffold; they are not yet a faithful end-to-end port.

## 1. Rebuild the repository mechanics

- Use one folder per n8n workflow: `workflow.json` for the canvas and separate `code/*.js` files for Code nodes.
- Add general split, hydrate and round-trip checks. Make CI catch missing code files, stale exports and accidental credentials.
- Keep deploy and read-only mirror jobs manual and disabled until deliberately configured. The deploy command now previews offline and requires an explicit inactive target for a live write. A separate mirror command only saves a reviewed local preview; nightly GitHub sync is still to be built. A commit alone must not contact n8n Cloud.

**Proof:** every example workflow can be assembled, imported as an export and round-tripped without losing its node graph.

## 2. Complete the documentation and release example

- Recreate the distinct stages found in the source: product-change analysis, candidate relay, engineer notification, review callback, documentation-gap proposal, and publication.
- Keep the source distinctions visible. Joining the separate stages into a single portfolio journey is a new design choice.
- Give each change one stable identity, attach several PRs when needed, and retain the confirmed audience from source evidence.
- Use fictional records and local adapter fakes for GitHub, Notion, Slack and publication.

**Proof:** normal, wrong-audience, duplicate, new-guide review, rejected-review and failed-delivery cases produce the expected records and no duplicate external write.

## 3. Match the GitHub-only version

- Run the same inputs through code and GitHub Actions without n8n. Keep the model and external systems behind adapters.
- Compare the complete decisions and state changes of both paths, not just the current audience-check result.
- Keep the code-only path runnable offline; make its scheduled and live external actions opt-in.

**Proof:** one saved-case suite runs both paths and reports any difference by case and stage.

## 4. Complete OpenAI-backed drafting and operating evidence

- The structured-drafting adapter is implemented and fake-tested. Verify an opt-in live call in a separate test project before claiming hosted behaviour, then add model-based evaluation behind the same boundary.
- Version the public-safe skills, prompts, source snapshots, rubrics and saved examples.
- Keep deterministic identity, tenant availability and review checks separate from model judgement.
- Show the operating loop: a failure is recorded, the guidance or source is corrected, and both the failed case and earlier passing cases are retested.

**Proof:** an offline evaluation report explains the wrong result, the change made and whether the fix regressed another case. A live API run is optional and separately labelled.

## 5. Expand the portfolio and prepare sharing

- The four-flow browser showcase has [recorded local verification](verification-2026-10-26.md), including real model reviews and automated local routine releases. Keep authenticated answer approval and external submission as separate future work. Calls/CRM remains a later expansion.
- Keep any legal example bounded and fictional; the earlier legal engine is a separate, much larger system.
- Write a five-minute tour, setup instructions and a clear status marker for every capability: implemented and tested, implemented but not live-tested, or planned.
- Review the files and complete Git history for employer material and secrets before making the repository public.

**Proof:** a reviewer can understand each example from the README, run the offline suite, inspect both implementation paths and see exactly what has and has not been verified.

## Release gate

The portfolio is ready to share publicly only after the fictional-data review, offline checks, current Git history review and five-minute walkthrough pass. Production-ready is a separate claim requiring authenticated source access, tenant-scoped reads and writes, delivery receipts, retries, monitoring, retention rules and a hosted end-to-end test. None of those claims follows from an importable n8n export alone.

## Usage and evaluation foundation

Measurement, valuation and calibration modules are present. Consult recorded test results for their verification scope. The local routing components and reported pilot evidence are described in [model-routing.md](model-routing.md); broader routing is not established by that pilot. Scheduled collection/upload and usage-dashboard LLM assessment remain separate future integrations. The showcase now has a bounded real-model output reviewer; that does not establish those integrations. See [usage-and-evaluation.md](usage-and-evaluation.md).
