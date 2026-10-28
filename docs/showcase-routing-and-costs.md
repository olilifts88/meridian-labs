# Studio demo: routing and estimated costs

The functional five-AI workflows uses the selected Studio 1 direction: compact Meridian branding, warm surfaces, two home paths, and shared results with Overview, Evidence & answer, Checks, Routing & usage and Compare setups. The older design studies remain references; use `/` for the working product.

## Estimated API cost

`showcase_measurement.py` adapts recorded usage to the existing `usage/token_cost.py` calculator. It supplies a dated rate card from [OpenAI's published API pricing](https://developers.openai.com/api/docs/pricing), checked 28 October 2026. These are standard short-context text-token rates in USD per million tokens:

| Requested model | Uncached input | Cached input | Output |
| --- | ---: | ---: | ---: |
| GPT-6 Luna | $0.10 | $0.01 | $0.50 |
| GPT-6.1 Sol | $2.00 | $0.10 | $10.00 |

Estimate = ((input − cached input) × input rate + cached input × cached rate + output × output rate) / 1,000,000.

Cached input is a subset of input and reasoning is a subset of output. Neither is added twice. Missing, invalid or unsupported usage returns unavailable, not zero. This card refuses inputs over 272,000 tokens and nonzero cache writes rather than extrapolating. No external pricing lookup occurs when visitors open the app. Updating rates changes a valuation version, never the original token receipts. The estimate uses the requested model; independent backend identity remains nullable in expandable provenance. Optional API tool fees, hosting, human review, negotiated discounts, taxes and currency conversion are outside this token-only estimate.

All 40 generation receipts are priced: **$0.19512988 estimated API-equivalent token cost**. This is not an extra bill, subscription allocation, complete operating cost or evidence of net savings. USD is retained to avoid an unstated exchange-rate assumption.

The evaluation board groups estimates by all four fixed setups and divides each total, including failed attempts, by answers passing the revised automated checks. That denominator is visible. Cost per check-passing answer is distinct from cost per human-accepted result; 31 answers remain unreviewed. Original 31/40 and revised 33/40 findings stay unchanged.

## Rules that run without a model

The explicit `showcase-routing-v1` policy is an inspectable starting hypothesis, defined after the pilot. It is specific to the demo and does not change Oli's personal Notion skill settings. It examines source inputs, not reference answers, case numbers, titles, expected success text or model scores. It reuses the existing domain preflight checks and validates chosen model/effort pairs through the existing router.

| Workflow | Starting decision |
| --- | --- |
| Release notes | Bounded confirmed release → Luna; restricted rollout wording → Sol. Inconsistent/missing evidence → hold. |
| Vulnerabilities | Version matching finds no affected package → ordinary code; supported finding narrative → Luna. |
| Questionnaires | Missing policy evidence → hold; bounded supported draft → Luna. |
| SOC 2 | Owner/date/approval checks identify gaps → code follow-up; supported summary → Luna. |
| Calls to CRM | Simple extraction → Luna; multiple signals → Sol; uncertain commercial language → Sol with human approval still required. Missing transcript → hold. |

Task tier and reasoning effort are separate. All selected model candidates currently use medium effort, matching the existing saved pilot answers. Low tier does not claim a low-effort experiment. Rules are deliberately conservative and will need more representative tests before deployment claims.

In scenario selection, **Follow routing rule** chooses the matching guided recorded answer when a model is selected. A fixed setup can be selected instead. For hold/code routes, the page explicitly says a historical AI answer is only shown for comparison. All visitor scenarios still recheck saved answers and simulate approvals; they do not execute fresh model inference. The route preview is shown alongside the original fixed experimental route, never as a rewritten history. The evaluation board lists all ten decisions and links available matched outputs, retaining failures.

No online routing classifier, automatic retries, model escalation calls or live dispatcher is added. Public endpoints accept only preset record and approval choices. No browser credential, model key or public inference path exists. This work tests rule execution and retrospective candidate selection, not prospective routing quality or savings.

## Reuse

The calculator, routing boundary, domain checks, immutable pilot answers, review labels and browser storage are reused. One enrichment layer joins a versioned estimate and routing preview to the original record at read time. The original snapshot and private answer/receipt files remain unchanged. Visitor records retain their enriched result, with policy/rate versions, in browser storage and JSON downloads. The standalone ZIP includes the required calculator, rate fixture, Studio assets and source.
