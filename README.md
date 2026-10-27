![Meridian Labs](assets/meridian-labs-banner.svg)

# Meridian Labs | AI Agents, Workflows & Infrastructure

Building AI agents and automated workflows, supported by model routing, LLM evaluations, usage tracking and cost controls. This repository brings together the code, architecture, tests and operating guidance behind these systems.

## Start here

**[Take the reviewer walkthrough](docs/portfolio-tour.md)** for a short path through the model-written release note, its checks and duplicate protection, then the four browser workflows. It explains what to try, what should happen and where the supporting code lives.

**[Try the integrated release agent](docs/release-agent.md)** to see a subscription-model draft move through source checks, a second model evaluation, a review gate and a private local delivery record. The run also saves actual token usage where exposed and enforces a two-call limit.

To review the repository: follow the walkthrough, run the release-note agent, inspect its short summary or saved JSON, then follow the implementation and test links. The [folder guide](#folder-guide) explains the repository layout.

## Run the workflows

Download the repository, open a terminal in its folder, and run:

```sh
python3 demo.py
```

Open **http://127.0.0.1:8765/**. Python 3.9+ and a browser are enough for the offline demo. On Windows use `py demo.py`. No installation, Notion, Slack, n8n, API keys or model account is needed in this mode.

| Workflow | What happens | What to try |
| --- | --- | --- |
| **Release notes** | Draft from confirmed product facts; check rollout scope; route a model review when enabled | Routine updates automate to a local release feed after checks and model review. New features and documents require human review. Incorrect audiences are blocked. |
| **Vulnerability review** | Match pinned packages to supplied advisories; attach owners, deadlines and fixes | Two sample findings, then an unavailable-feed case that reports incomplete coverage. This is snapshot triage, not a live scanner. |
| **Security questionnaires** | Prepare cited answers from approved policy facts; hold unsupported or conflicting answers | Four supported drafts and one SOC 2 evidence gap. Remove a policy to see the affected answers withheld. |
| **SOC 2 evidence review** | Check owners, evidence references, review dates, period and approval | One control ready for a reviewer and four needing follow-up. These are demonstration controls, not an audit verdict. |

Each run shows **Journey taken**, **Output evaluation**, **Decision trail** and a downloadable **complete JSON result**. Source systems are represented by fictional local snapshots. Nothing is published externally or submitted to a customer.

### Offline and live modes

The default is offline: deterministic rules execute, and the model route is a clearly labelled preview. It does not pretend a model was called. Routine release delivery pauses at the model-review gate in this mode.

Optional live mode uses the installed Codex CLI and the reviewer's own ChatGPT sign-in, with an explicit routing policy, call budget and private receipts. The browser demo adds a model review to its initial template draft. The separate [integrated release-agent path](docs/release-agent.md) uses the model to write the initial draft as well. Identical inputs and policy reuse completed receipts. **[Setup and test paths](docs/showcase.md)** explain the browser modes.

## Inspect the engineering

- **[Workflow tour](docs/portfolio-tour.md):** the four journeys, knowledge sources and review boundaries.
- **[Capability evidence map](docs/capability-check.md):** find the implementation, tests, runnable commands, dated evidence and known gaps for a claim.
- **[Verification records](docs/verification-2026-10-27.md):** the integrated release-agent live test, local checks and what was not tested. The [26 October baseline](docs/verification-2026-10-26.md) covers the browser workflows.
- **[Release engineering](docs/release-workflows.md)** and **[architecture](docs/architecture.md):** domain contracts, the older SQLite service and separate n8n stages.
- **[Model routing](docs/model-routing.md):** policy compilation, direct-first planning and subscription execution boundaries.
- **[Usage and evaluation](docs/usage-and-evaluation.md):** supplied-log measurement, token-cost estimation and matched saved-output comparisons.
- **[Integrated release agent](docs/release-agent.md):** two bounded subscription calls, source checks, private usage record and local release outcome.
- **[Workflow guidance](docs/workflow-guidance/README.md):** two scoped example guides and where they are used.
- **[Repository security](docs/security.md)** and **[deployment boundaries](docs/n8n-deployment.md):** operational controls and optional external integrations.

## AI Performance Dashboard — coming soon

I'm rebuilding an AI Performance Dashboard for automated workflow monitoring, output evaluations, model comparisons and recorded usage. It is designed to flag checks and proposed changes for my review and approval, building on reference cases I reviewed and evaluation rules I established first. [See the intended behavior and current boundaries](docs/ai-performance-dashboard.md).

## Repeat the checks

```sh
python3 demo.py evaluate
python3 scripts/capability_check.py
```

The evaluation runs 11 workflow scenarios and 10 deliberately corrupted outputs. The capability checker reports code/test references and recorded evidence; it does not infer passing tests from their presence. Its `--verify` mode runs the offline checks, requiring Node 24+ as well as Python. See the [guide](docs/capability-check.md).

The [portfolio map](docs/portfolio-map.md) and [implementation plan](docs/rebuild-plan.md) retain historical context and future work. Hosted source connections, external publication, questionnaire submission, universal model routing and achieved cost savings are not claimed by these demos.

## Folder guide

| Folder | What is in it |
| --- | --- |
| [`src/workflow_portfolio/`](src/workflow_portfolio/) | Python workflow code, browser demo, routing, evaluation and usage modules |
| [`tests/`](tests/) | Python and JavaScript checks, including failure and duplicate-run cases |
| [`examples/`](examples/) | Fictional inputs, example policies and dated model-review summaries |
| [`docs/`](docs/) | Setup, architecture, verification and operating guidance; `workflow-guidance/` holds the two scoped guides |
| [`assets/`](assets/) | Meridian Labs banner and dashboard preview image |
| [`.n8n/`](.n8n/) | Editable n8n workflow sources with separate Code-node files |
| [`exports/n8n/`](exports/n8n/) | Generated workflows for import; change `.n8n/` sources first |
| [`scripts/`](scripts/) | Capability checks and n8n build, validation, deploy and mirror tools |
| [`.github/workflows/`](.github/workflows/) | Automated checks and the manual code-only example |
| [`workflow_portfolio/`](workflow_portfolio/) | Small source-checkout launcher for the older module commands; implementation remains in `src/` |

`demo.py` starts the four-workflow showcase. `capabilities.json` maps claims to their supporting files. Private receipts and local release records are ignored by Git and are not part of the shared repository.
