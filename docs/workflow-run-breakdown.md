# Model route and Run breakdown

AI Workflows is an illustrative demonstration. It makes no new model calls when showing a prepared scenario.

The existing Model route & cost area and settings dialog have two views:

- Model route selects the models, effort and token assumptions for the demonstration. Cancel discards edits; Use this route applies them.
- Run breakdown illustrates that same route, listing every enabled step and retry as a model call, its token estimate and estimated cost. It groups those calls by model and shows the reconciled total.

One visible Illustrative execution label identifies the demonstration. The shared pricing calculator handles cache categories, context thresholds, processing tiers and regions using the saved dated rate card. The demonstration's tokens are scenario assumptions, not measured task telemetry. Invalid inputs stay unpriced; excluded steps are not counted. Original model trials remain supporting evidence under Source run or the expandable calculation details. They are never silently relabelled as a multi-model historical trace.

The six workflow demonstrations share this presentation: release notes, transcript to action, vulnerability review, security questionnaires, SOC 2 evidence review and Bounceback. Transcript branches, optional retries and held/code-only routes follow their existing enabled-step rules. Saved scenarios preserve their original route/rate snapshot. Editing a modal draft changes its illustrative breakdown; Cancel preserves the underlying route.

The real AI run metrics database and AI Performance app remain a separate evidence-based reporting path. No illustrated calls, tokens or costs are written into those metrics as actual usage. This change does not install automatic Chat capture, change historical outputs or make a live inference call.
