![Meridian Labs](assets/meridian-labs-banner.svg)

# Meridian Labs | AI Agents, Workflows & Infrastructure

Building AI agents and automated workflows, supported by model routing, LLM evaluations, usage tracking and cost controls. This repository brings together the code, architecture, tests and operating guidance behind these systems.

The implemented examples currently cover workflow validation and review, task-level usage measurement, token-cost estimation and evaluation feedback. Model routing and additional agent workflows are the next components. All included examples use fictional data and run offline by default.

## What you can inspect

| Area | Implemented here | Status and next step |
| --- | --- | --- |
| **AI workflows** | Python/SQLite review service; n8n validation, candidate relay and callback examples | Offline implementations and tests; complete hosted triggers, notifications and delivery remain planned |
| **AI agents** | Task guidance and a structured OpenAI drafting adapter | Adapter tested with a fake transport; live model execution and multi-agent orchestration not verified |
| **Model routing** | Architecture and implementation direction | Executable skill/tier router, route snapshot and dispatch traces planned; a model parameter is not a router |
| **Usage measurement** | Read-only plain/Zstandard log adapter; explicit coordinator/worker/retry bindings; response deduplication and coverage checks | Offline fixture-tested; explicit source path required; no cloud/mobile usage feed |
| **Token-cost estimates** | Decimal arithmetic, cached-token handling, illustrative rate card and weekly/model summaries | Offline fixture-tested; example rates are fictional; supply verified model-specific rates for real estimates |
| **LLM evaluations** | Matched saved-output comparison, human-feedback calibration and replay protection | Offline fixture-tested; no automatic LLM judge or production quality guarantee |
| **Infrastructure** | CI, workflow export validation, SQLite state/audit trails, guarded deploy/mirror helpers | Offline checks implemented; hosted deployment/mirror execution and automatic reporting integration remain unverified |

**Implemented** means the code is present. **Offline-tested** means fictional fixtures exercise it. Neither means a hosted integration has been verified. Each guide names the remaining execution boundaries.

## Try it in five minutes

Python 3.9+ runs the core demos. Node 24+ is required for compressed-log and JavaScript checks. No model credentials or network access are needed for these commands.

```bash
python3 -m workflow_portfolio demo
python3 -m workflow_portfolio benchmark
python3 -m workflow_portfolio.usage.demo
python3 -m unittest discover -s tests -v
node --test tests/calibration-feedback.test.cjs
npm run n8n:check
npm run test:n8n
```

- **Workflow demo:** blocks a draft that claims the wrong audience can use a feature, saves the review decision and keeps an audit trail.
- **Benchmark:** compares fictional model outputs on identical cases; these are illustrative results, not real model rankings.
- **Usage demo:** reads a synthetic task with a duplicated response and reports **120 tokens once**, plus a clearly labelled illustrative cost.

## Engineering you can review

| Capability | Code and evidence |
| --- | --- |
| Deterministic workflow checks and approval state | [Domain rules](src/workflow_portfolio/domain.py), [service](src/workflow_portfolio/service.py), [SQLite store](src/workflow_portfolio/store.py) |
| Whole-task response accounting | [Measurement](src/workflow_portfolio/usage/measure_run.py), [reader](src/workflow_portfolio/usage/jsonl_reader.py), [tests](tests/test_usage_measurement.py) |
| Estimated token value | [Cost module](src/workflow_portfolio/usage/token_cost.py), [fictional rates](src/workflow_portfolio/usage/example-rate-card.json), [tests](tests/test_usage_costs.py) |
| Evaluation and calibration | [Matched cases](src/workflow_portfolio/evals.py), [feedback module](src/evaluation/calibration-feedback.cjs), [tests](tests/calibration-feedback.test.cjs) |
| Inspectable n8n workflows | [Source workflows](.n8n/), [importable exports](exports/n8n/), [assembly tools](scripts/build-n8n.mjs) |
| Automated verification | [CI](.github/workflows/ci.yml), [manual offline workflow](.github/workflows/code-only-review.yml) |

The usage layer counts each session/response once, keeps cached and reasoning tokens within their parent totals, and distinguishes complete task coverage from a measured subtotal. Human feedback is bound to a case and revision; an AI assessment never supplies a human approval.

## Read next

- [Usage and evaluation guide](docs/usage-and-evaluation.md): runnable example, data contracts, limitations and recovery.
- [Workflow tour](docs/portfolio-tour.md) and [release journey](docs/release-journey.md): the first concrete business workflow.
- [System map](docs/portfolio-map.md): knowledge operations, calls/CRM, security, legal and platform workflow families.
- [Architecture](docs/architecture.md) and [implementation plan](docs/rebuild-plan.md): current design and next components.
- [Deployment boundaries](docs/n8n-deployment.md) and [security](docs/security.md): external execution and operational controls.

No automatic route selection, cloud-wide usage capture, live model benchmark, cost saving or production deployment is claimed from the offline demos.
