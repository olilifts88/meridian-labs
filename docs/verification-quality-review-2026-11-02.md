# Quality review rollout · 2 November 2026

The approved branch prototype is integrated into all five normal workflow journeys and their saved-result views. Source checks and finished artefacts remain visible; four detail tabs add matched recorded comparisons, word differences, separate-copy change probes and source-backed step explanations. Approved output pages and their existing validation gates are preserved.

Instruction labels are What to produce and What to produce + how to do it. Configuration IDs, original model answers and their hashes remain unchanged. Expanded scenarios show their own checks and changes; recorded model comparisons explicitly name the original comparison source case. No scores transfer to a different source pack.

## Executed checks

- 108 JavaScript tests passed, including fixed probes across every business scenario, release claims, comparison source identity, output preservation, label compatibility and word differences. These are included in the existing GitHub test command.
- 209 Python tests passed with the documented Node runtime and loopback test access.
- Static export validation preserved forty original answers and 120 bounded scenario outcomes.
- Browser: all five workflows opened their new quality views. Questionnaire and vulnerability probes caught the intended conflict. Transcript differences and the pricing step showed their sources and records.
- Browser: release approval opened its release-note page; questionnaire opened its response pack; vulnerability and SOC 2 opened their output hubs; Transcript to action opened its CRM artefact. Probe interactions left the approval paths intact.

Local test artefacts are browser-owned. No live model calls, external CRM writes, messages or new services are introduced. Langfuse and Promptfoo patterns are implemented in the existing app, without installing either SDK. Runtime timings remain the original recorded measurements; route costs remain estimates.

## Transcript branch dropdowns

The five destination cards now use native details/summary controls, matching the expandable route steps. All start collapsed. Destination, step title, model and effort remain visible; purpose, status, cost, source excerpts and checks expand inside the same card. The separate selected-branch detail panel is removed. The split/join diagram and approved destination links are retained.

Twelve focused branch/quality tests passed. Browser checks confirmed the engineering card expands in place, supporting excerpts open, and collapsing the card hides the detail again.
