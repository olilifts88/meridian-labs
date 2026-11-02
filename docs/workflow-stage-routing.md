# Workflow model routing and cost estimates

All five workflows have a recommended route with a model and effort for each stage. Visitors can follow that route, choose a lower-cost or deeper-review preset, or expand a step to change its model and token budget. The available models are GPT-6 Luna, GPT-6 Sol, GPT-6.1 Sol, GPT-6.1 Terra and GPT-6 Astra.

The route covers evidence gathering, drafting, review and formatting. Code handles source checks, matching and duplicates. Business approval gates remain separate from model choices. Evidence gaps hold later stages; a code-only route excludes model budgets until a visitor explicitly includes them.

## Quality before cost

The evaluation method defines the expected result and prohibited actions before comparing candidates. It uses the same source cases, code checks for fixed rules, human judgment for source truth and usefulness, and separately recorded reviewer feedback. The six checks are accuracy, completion, instructions and permissions, verification, clarity and efficiency. Inspect failures before selecting a model; compare cost among acceptable outputs. Missing evidence is fixed at the source, not by choosing a larger model.

Each route links to the original answers and evaluations for its selected example. Those forty answers, original/revised checks and owner reviews remain unchanged. New stage budgets do not add samples or establish measured model quality, speed or routing savings. Quality evidence is bound to its original fixed model/instruction setup; the stage route is a design choice informed by task requirements and that evidence.

## Calculator

`pricing.mjs` and `usage/pricing_engine.py` implement the same versioned rate card. Input is partitioned into ordinary input, cached reads, 30-minute writes and 12-hour writes. Reasoning remains a subset of output. Unknown models, invalid categories, unsupported effort/tier combinations and unverified cache-write semantics return unavailable.

Each request is priced separately, including its context-length band, processing tier and region. Effort is validated per model; it has no invented price multiplier. A higher reasoning budget must be entered explicitly. Full-task aggregation requires a complete execution inventory, deduplicates session/response identities and includes coordinator, workers, verification and retries. Partial measured subtotals never become complete task totals. API-equivalent token values remain separate from subscription charges and tool fees.

The older pilot card is retained for its original valuations. The new card is a separate current-price scenario. Saving a visitor scenario embeds its route, budgets, rate card, pricing-check status and calculated estimate, so later pricing changes do not rewrite it.

## Pricing preflight

`showcase_demo.py` checks the public official OpenAI documentation at startup, unless `--offline` is supplied. The calculator also offers a pricing check before a scenario is saved. The hosted version uses an allowlisted same-origin pricing endpoint with a fifteen-minute verification cache. It reads public documentation only, with no model or API-key calls.

All supported models refresh together. A missing source, changed page format or changed billing rule retains the last verified snapshot. Successful checks record their date, source digests and immutable prior card. The browser exposes the source and check status under Sources & calculation.

Official references: [pricing](https://developers.openai.com/api/docs/pricing), [prompt caching](https://developers.openai.com/api/docs/guides/prompt-caching), [reasoning](https://developers.openai.com/api/docs/guides/reasoning). Rates were verified on 1 November 2026.

## Visitor path

Open Workflows and choose a scenario. The recommended route appears before the approval choice. Open a step for its reason and quality check; open Customise & compare for model comparisons and pricing options. Saved scenarios retain the selected route. Evaluation provides the same route explorer alongside the recorded benchmark. Real AI runs continue to show original recorded evidence.

## Quality review in each workflow

After Run workflow, the source-check summary and finished artefact remain visible. Quality and evidence adds four tabs: Compare answers, What changed, Check a change and Step detail. The same component serves all five workflows and saved results. Approval still opens the existing release-note or business-output pages.

Instruction choices now read **What to produce** and **What to produce + how to do it**. Both use the same task and source evidence; the latter adds the workflow method and checks. Existing configuration IDs and recorded-answer hashes are preserved.

Original model comparisons remain tied to their exact source case. Expanded business scenarios show their current checks above, with an explicitly selected recorded comparison source case below. Prepared outputs do not inherit model scores. Differences and change probes for those scenarios use their own source pack. A probe works on a separate copy and cannot approve or mutate a saved result. Step detail uses the selected plan, relevant source excerpts, required checks and destination records. It does not claim measured intermediate model calls.

GitHub’s JavaScript checks include fixed scenario regression probes for every business scenario, release claim probes, comparison-source identity, output immutability and label compatibility. See [rollout verification](verification-quality-review-2026-11-02.md).
