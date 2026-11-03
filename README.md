![Meridian Labs](assets/meridian-labs-banner.svg)

# Meridian Labs

This repository contains a runnable AI workflow demo, the code behind its evaluation and routing, n8n workflow sources, and public documentation for a separate private AI Performance Dashboard.

## Start here

| Goal | Go to |
| --- | --- |
| Ask about the repository | [Open Repo Explorer](https://olilifts88.github.io/meridian-labs/) · [Code Q&A on DeepWiki](https://deepwiki.com/olilifts88/meridian-labs) |
| Try the demo online | [Open AI Workflows](https://meridian-ai-workflows-oli.misty-moon-5776.chatgpt.site/) |
| Run it on your computer | [Download and setup](#download-and-run-locally) |
| Understand the implementation | [Code and evidence](#inspect-the-code-and-evidence) |
| Check what a capability actually supports | [Repo Explorer](docs/repo-explorer.md) |
| Understand the private dashboard | [Dashboard guide](docs/ai-performance-dashboard.md) |
| Understand the private Life OS app | [Life OS guide](docs/life-os.md) |
| Work on the repository with an agent | [AGENTS.md](AGENTS.md) |

## AI Workflows

Explore AI workflows from source evidence to finished outputs. Review a release announcement, a remediation plan, a security response, a SOC 2 evidence pack or the records created from a transcript. Each workflow includes model routes, editable cost estimates, source checks and a review decision.

<p>
  <a href="https://meridian-ai-workflows-oli.misty-moon-5776.chatgpt.site/"><img src="assets/open-ai-workflows.svg" alt="Open AI Workflows online" width="214" height="48"></a>
  <a href="https://github.com/olilifts88/meridian-labs/releases/download/ai-workflows-v1.2.1/meridian-ai-workflows.zip"><img src="assets/download-ai-workflows.svg" alt="Download AI Workflows ZIP" width="282" height="48"></a>
  <a href="#download-and-run-locally"><img src="assets/setup-instructions.svg" alt="Setup instructions" width="214" height="48"></a>
</p>

[Explore the code and evidence](#inspect-the-code-and-evidence)

**Online:** open the public site in your browser. No download, Python or installation is needed.

**Local download:** the ZIP contains just the demo. **Python 3.9+ and a desktop browser are all you need.** No package installation, AI account or API key. The scenarios use recorded answers and prepared business outputs; trying them makes no new AI calls.

![The Meridian Labs AI Workflows, using the Studio interface](assets/studio-applied-home.png)

## Start the demo

### Open online

[Open Meridian Labs AI Workflows](https://meridian-ai-workflows-oli.misty-moon-5776.chatgpt.site/), choose a workflow and click **Run workflow**. You can review the outputs and approved artefact pages in your browser.

### Download and run locally

1. **Download** `meridian-ai-workflows.zip` using the link above. On the release page, choose that file under **Assets**, not GitHub's automatic “Source code” downloads.
2. **Extract the ZIP** and open the `meridian-workflow-showcase` folder.
3. **Open a terminal in that folder** and start it:

   **Mac / Linux**

   ```sh
   python3 showcase_demo.py
   ```

   **Windows**

   ```powershell
   py showcase_demo.py
   ```

4. **Open [http://127.0.0.1:8766](http://127.0.0.1:8766)** in your browser. Keep the terminal open while you explore. Press **Ctrl+C** in the terminal to stop it.

If Python is not installed, install it from [python.org](https://www.python.org/downloads/) first. If you get stuck opening the folder or starting Python, use the [step-by-step setup and troubleshooting guide](docs/showcase-quickstart.md#setup-help).

## What to explore

Choose a workflow, inspect its sources and route, then click **Run workflow**. The output evaluation and artefact appear automatically beneath the run controls. **Quality and evidence** lets you compare answers, inspect changes, test a source conflict and follow each step to its output records. Review the source-linked checks and approve the output pages. **Request changes** offers a supported revision or lets you save a reviewer note. **Saved results** keeps the route, evidence and decision together.

The release workflow includes four scenarios and a branded release-note page. Transcript to action includes BD, customer-success and internal-meeting scenarios; its output hub opens CRM updates, engineering signals, pricing follow-ups, a company post and a searchable call library. Vulnerability review covers 40 asset findings, the security questionnaire has 20 questions, and SOC 2 covers 16 controls.

The main navigation focuses on workflows and saved results. The review-method page links to the original forty model answers as supporting evidence.

The [delivery walkthrough](docs/delivery-walkthrough.md) adds a focused transcript-to-action sandbox: source-linked proposals, persona/action boundaries, a persisted account update, commit/readback and safe retry. It supports a portable browser mode and an optional local Node.js writer. The local enhancements do not establish a hosted release; no model calls or external business writes are made.

## The six workflows

| Workflow | What it demonstrates |
| --- | --- |
| **[Release notes](docs/workflow-guidance/pilot-release-notes.md)** | Turn confirmed product facts into a draft while respecting pilot and rollout limits. |
| **[Vulnerability review](docs/workflow-guidance/pilot-vulnerabilities.md)** | Match installed versions to supplied advisories and organise supported findings. |
| **[Security questionnaires](docs/workflow-guidance/pilot-questionnaire.md)** | Answer from policy evidence and hold unsupported claims. |
| **[SOC 2 evidence review](docs/workflow-guidance/pilot-soc2.md)** | Check evidence dates, ownership and approval; identify follow-up work. |
| **[Bounceback](docs/customer-recovery.md)** | Play through customer recovery, a technical exception and automatic reuse of a checked fix. |
| **[Transcript to action](docs/call-crm.md)** | Turn a transcript into CRM updates, issue records, commercial follow-ups, team posts and searchable call knowledge. |

Bounceback adds three fictional login-support cases with a conversation view, recovery checks and versioned learning. Run it locally at `/scenarios.html?workflow=customer-recovery`; the public site changes only after deployment.

All data is fictional. Approvals affect the local simulation; they do not send messages or update external services. Saved results stay in the browser and address you used. The public site, a local copy, another browser and private browsing each have separate histories. They do not sync with one another or add results to the original benchmark.

## Model routing and costs

Each workflow has a recommended model route. Expand a step for its model, effort, quality check and cost. Compare lower-cost or deeper-review presets, or customise the route. The calculator supports GPT-6 Luna, GPT-6 Sol, GPT-6.1 Sol, GPT-6.1 Terra and GPT-6 Astra, with an official pricing check and saved rate snapshots. [How routing and costs work](docs/workflow-stage-routing.md).

## What the evaluation shows

After **Run workflow**, each scenario shows source checks beside its output. **Quality and evidence** lets you:

- **Compare answers:** inspect recorded model answers against the same source case, including their checks, tokens, generation time and dated cost estimates.
- **See what changed:** compare wording or output records and the checks affected by those changes.
- **Check a change:** try a specific source conflict and see why the checks flag it.
- **Inspect a step:** follow the evidence, required checks and output records for the selected model route.

Expanded scenarios use their own source checks. The model-comparison selector names the original source case being compared. A reviewer still judges clarity and usefulness before approving the finished artefact. Route costs use editable token estimates.

[Review method](https://meridian-ai-workflows-oli.misty-moon-5776.chatgpt.site/evaluation.html) · [Latest verification](docs/verification-quality-review-2026-11-02.md)

<details>
<summary>Original model pilot and supporting evidence</summary>

The original pilot contains **10 source cases × 2 models × 2 instruction styles = 40 recorded answers**. These remain available in the [supporting model library](https://meridian-ai-workflows-oli.misty-moon-5776.chatgpt.site/runs.html), through the review-method page and in matching answer comparisons. They are separate from the expanded business scenarios.

The original checks passed 31/40 answers; a versioned checker correction passed 33/40. Nine answers have owner-review labels. Recorded tokens and generation times belong to those original answers. Cost estimates use a dated rate card and remain separate from subscription bills. The pilot does not establish the measured performance of every configurable model route.

[Original recorded data](examples/recorded-runs/pilot-2026-10-28.json) · [Experiment and checker implementation](src/workflow_portfolio/ai_pilot.py) · [Pilot routing and cost method](docs/showcase-routing-and-costs.md)

</details>

[![Ask DeepWiki](https://deepwiki.com/badge.svg)](https://deepwiki.com/olilifts88/meridian-labs)

## Inspect the code and evidence

Start with the files behind the current hosted and downloadable demo:

| Follow this part | Source |
| --- | --- |
| Workflow pages and user actions | [demo-web/](demo-web/), [release workbench](demo-web/assets/release-workbench.mjs) and [business workbench](demo-web/assets/business-workbench.mjs) |
| Scenario data, output records and approvals | [Business data](demo-web/assets/business-data.mjs), [business engine](demo-web/assets/business-engine.mjs) and [release publication](demo-web/assets/release-publication.mjs) |
| Source checks and quality review | [Release checks](demo-web/assets/release-quality.mjs), [business checks](demo-web/assets/business-engine.mjs), [quality review](demo-web/assets/quality-review.mjs) and [comparison/change checks](demo-web/assets/quality-core.mjs) |
| Model routes and token cost estimates | [Workflow routes](demo-web/assets/workflow-routing.mjs), [pricing calculator](demo-web/assets/pricing.mjs) and [route settings](demo-web/assets/route-settings.mjs) |
| Saved results and completed artefacts | [Browser history](demo-web/assets/visitor-results.mjs), [release-note page](demo-web/assets/release-note.mjs) and [business output pages](demo-web/assets/company-workspace.mjs) |
| Local startup and downloadable package | [Launcher](showcase_demo.py), [local server](src/workflow_portfolio/web_demo.py) and [ZIP builder](scripts/build-workflow-showcase.py) |
| Automated checks | [Workflow regression checks](tests/quality-rollout.test.mjs), [all tests](tests/) and [download verification](scripts/verify-showcase-download.py) |

<details>
<summary>Original Python workflow engines and recorded-run tooling</summary>

The wider repository also retains the [recorded scenario engine](src/workflow_portfolio/recorded_showcase.py), [original routing measurements](src/workflow_portfolio/showcase_measurement.py), [Python router](src/workflow_portfolio/routing/router.py), [token calculator](src/workflow_portfolio/usage/token_cost.py), [assurance checks](src/workflow_portfolio/showcase_assurance.py) and [CRM simulation](src/workflow_portfolio/call_crm.py). These support the original developer journeys and recorded evidence; the current visitor interface uses the browser modules above.

</details>

## Working from the full repository

If you already have the source checkout, run `python3 showcase_demo.py` from its root and open the printed address. This starts the same browser interface as the download, without installing the project. Python 3.9+ is required. Use `--offline` to keep the saved pricing snapshot without a web check.

To rebuild the ZIP, run `python3 scripts/build-workflow-showcase.py`. The [release guide](docs/showcase-release.md) covers packaging, checksums and the online/local visitor paths. The package allowlist excludes private records, credentials and unrelated projects.

<details>
<summary>Original developer server</summary>

`python3 demo.py serve --port 8766` starts the older developer demos and local owner-review screen. Stop another server using that port first. Live model reviews require their explicit configuration and call budget; they are disabled by default.

</details>

<a id="inspect-the-engineering"></a>

## Engineering guides

- **[Evaluation and source checks](docs/evaluation-framework.md):** criteria, matched source cases and the boundary between automated checks and reviewer judgment. [Current verification](docs/verification-quality-review-2026-11-02.md) records the UI and artefact checks.
- **[Workflow routing and costs](docs/workflow-stage-routing.md):** model choices, effort, token budgets, comparison estimates and pricing refresh.
- **[Online and local delivery](docs/showcase-release.md):** the public site, download build, asset alignment and release checks. [Setup help](docs/showcase-quickstart.md#setup-help) covers local startup problems.
- **[Repo Explorer](docs/repo-explorer.md):** how to trace a claim to its entry point, implementation, tests and known limits.

<details>
<summary>Other projects and additional implementation references</summary>

- **[AI Performance Dashboard](docs/ai-performance-dashboard.md)** and its [dataflows](docs/dashboard-dataflows.md): public documentation for the separate private app.
- **[Life OS](docs/life-os.md)** and its [dataflows](docs/life-os-dataflows.md): the separate private front end and source-update paths.
- **[Workflow guide](docs/recorded-workflows.md):** current visitor paths and original recorded-run tooling.
- **[Release engineering](docs/release-workflows.md)** and **[architecture](docs/architecture.md):** domain contracts, the older SQLite service and separate n8n stages.
- **[Local subscription routing](docs/model-routing.md):** the separate policy compiler and execution pilot.
- **[Usage measurement](docs/usage-and-evaluation.md):** supplied-log measurement, token calculations and feedback modules.
- **[Supporting workflow guides](docs/workflow-guidance/README.md):** two scoped reference guides used by the wider implementation.
- **[Repository security](docs/security.md)** and **[n8n deployment](docs/n8n-deployment.md):** operational controls and optional integrations.
- **[Earlier Studio verification](docs/verification-studio-routing-costs-2026-10-28.md)** and **[call/benchmark verification](docs/verification-call-crm-2026-10-27.md):** dated records for earlier implementations.
- **[Portfolio map](docs/portfolio-map.md)** and **[implementation plan](docs/rebuild-plan.md):** historical context and proposed work.

</details>

<a id="repeat-the-checks"></a>

## Developer checks

These commands check the software when someone changes it. Visitors can use the online site or download without running them. Node 24+ and Python 3.9+ are needed for these commands.

| Command | What it checks |
| --- | --- |
| `npm run test:web` | JavaScript checks, including source conflicts, route accounting, approvals and saved results |
| `npm run test:download` | Builds and extracts the ZIP, verifies its file hashes, starts it offline and checks pages, pricing fallback and blocked server writes |
| `python3 scripts/capability_check.py` | Confirms that mapped code and test references exist; it does not run the feature tests |

The [GitHub checks](.github/workflows/ci.yml) run the automated suites on pushes and pull requests.

<details>
<summary>Original evaluation and benchmark commands</summary>

`python3 demo.py evaluate` runs the original shared workflow scenarios and deliberately corrupted outputs. `python3 demo.py benchmark` compares saved reference and corrupted outputs on matched cases. These check the original evaluators; they do not generate a live model leaderboard.

For a broader offline capability check, use the capability checker's `--verify` option as described in the [guide](docs/repo-explorer.md).

</details>

## Folder guide

| Folder | What is in it |
| --- | --- |
| [`src/workflow_portfolio/`](src/workflow_portfolio/) | Python workflow code, browser demo, routing, evaluation and usage modules |
| [`tests/`](tests/) | Python and JavaScript checks, including failure and duplicate-run cases |
| [`examples/`](examples/) | Fictional inputs, example policies and dated model-review summaries |
| [`docs/`](docs/) | Setup, architecture, verification and operating guidance; `workflow-guidance/` holds the two scoped guides |
| [`demo-web/`](demo-web/) | Canonical browser pages, workflow data and shared controls used by the download and hosted export |
| [`assets/`](assets/) | Meridian Labs banner and dashboard preview image |
| [`.n8n/`](.n8n/) | Editable n8n workflow sources with separate Code-node files |
| [`exports/n8n/`](exports/n8n/) | Generated workflows for import; change `.n8n/` sources first |
| [`scripts/`](scripts/) | Capability checks and n8n build, validation, deploy and mirror tools |
| [`.github/workflows/`](.github/workflows/) | Automated checks and the manual code-only example |
| [`workflow_portfolio/`](workflow_portfolio/) | Small source-checkout launcher for the older module commands; implementation remains in `src/` |

`showcase_demo.py` starts the current visitor interface. `demo.py` retains the original developer journeys, including `/calls`. `capabilities.json` maps claims to their supporting files. Private receipts, workspace identifiers and local release records are ignored by Git and are not part of the shared repository.
