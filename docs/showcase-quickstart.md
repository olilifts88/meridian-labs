# Meridian Labs · AI Workflows

Explore the workflow routes, compare model choices and review saved answers. This is AI Workflows v1.1.0, with the same routes and interface as the hosted demo. This package is a small runnable part of the [full GitHub repository](https://github.com/olilifts88/meridian-labs).

## Start here

1. Unzip `meridian-ai-workflows.zip`.
2. Open the extracted `meridian-workflow-showcase` folder, then open a terminal in that folder. See [Setup help](#setup-help) below if this is new to you.
3. Start the demo:

   **Mac / Linux**

   ```sh
   python3 showcase_demo.py
   ```

   **Windows**

   ```powershell
   py showcase_demo.py
   ```

4. Open **http://127.0.0.1:8766** in your browser. Leave the terminal open while using it. Press Ctrl+C there to stop.

Requires **Python 3.9 or newer** and a modern desktop browser. No packages to install, Node, AI sign-in, API key or paid service are needed for these paths. If port 8766 is busy, run `python3 showcase_demo.py --port 8768`, then open http://127.0.0.1:8768. Python must already be installed; this ZIP is not an installer or mobile app.

## What to click

- **Workflows:** choose a scenario and start with its recommended model route. Open a step for the model choice, effort, quality check and cost.
- **Customise & compare:** choose a lower-cost or deeper-review route, compare one model throughout, or change a stage's model and token budget.
- **Real AI runs:** inspect the original saved answers, their instructions, checks and owner feedback. “Task instructions only” and “With workflow guide” describe the instructions given to the model.
- **Evaluation & benchmarking:** inspect the quality checks, compare the same source cases and explore the cost of different routes.
- **Saved scenarios:** reopen the route and review choice you saved. Its original prices are preserved; Compare with current prices shows a separate calculation.

The calculator supports GPT-6 Luna, GPT-6 Sol, GPT-6.1 Sol, GPT-6.1 Terra and GPT-6 Astra. It handles cached reads and writes, processing tiers, context length, region and retry budgets. [How model routing and costs work](workflow-stage-routing.md).

## Pricing checks

The launcher checks OpenAI's public documentation before opening the demo. A scenario save also checks prices. If the web check fails, the last verified rate card is retained. Sources & calculation shows its date and basis.

To start without a web check, use `python3 showcase_demo.py --offline` (or `py showcase_demo.py --offline` on Windows). No model calls or API keys are needed. The hosted version uses the same calculator and a server-side pricing check.

## Source answers and scenario routes

The original forty AI answers and evaluation records remain available. Choosing a different stage route changes the plan and cost estimate; it does not generate a new AI answer or alter a review. Quality evidence stays linked to the answer and setup it assessed. Costs are token estimates, separate from tool fees and subscription charges.

Workflow decisions operate on sample business data. Approval does not update an external CRM or send a message. Missing evidence and failed checks still hold the relevant action.

## Where your results are saved

Visitor results use this browser's local storage for this localhost address. They are not uploaded or written to the repo's model results. Another browser or port has a separate history. Clearing browser data removes them, so download JSON results you want to keep. Up to 50 results are retained; nothing is silently evicted. If saving is unavailable or storage is full, you can still download the completed result.

The private owner-review queue and its write endpoint are disabled in this launcher. Owner review labels shown in the recorded library are a snapshot; private review comments and raw execution receipts are not included.

## Inspect the code and method

- [Source snapshot and scenario runner](../src/workflow_portfolio/recorded_showcase.py): real recorded answers, receipt provenance, re-evaluation and approval gates.
- [Shared results viewer](../src/workflow_portfolio/run_explorer.mjs): both public paths use the same display.
- [Routing and estimated costs](../src/workflow_portfolio/showcase_measurement.py): versioned rules and an adapter to the reusable token calculator.
- [Visitor storage](../src/workflow_portfolio/visitor_results.mjs): browser-owned results, validation and downloads.
- [Domain evaluators](../src/workflow_portfolio/showcase_assurance.py) and [call/CRM engine](../src/workflow_portfolio/call_crm.py): workflow rules and evidence/approval checks.
- [Experiment and checker revisions](../src/workflow_portfolio/ai_pilot.py): frozen cases, original checks and separate recheck. Its model adapter is included for code inspection; this launcher does not use it to generate answers.
- [Recorded-versus-scenario guide](recorded-workflows.md): scope, safeguards and current limits.

The full repository contains the wider implementation, tests and supporting guides. This ZIP includes only the demo's required source, examples, browser assets and instructions. The hosted demo is available separately; no hosting account is needed to use this download.


## Setup help

**Opening a terminal in the right folder**

- **Windows:** open the extracted folder in File Explorer. Click its address bar, type `powershell`, and press Enter. Run `py showcase_demo.py` in the window that opens.
- **Mac:** open Terminal. Type `cd ` with a space after it, drag the extracted folder from Finder into Terminal, then press Return. Run `python3 showcase_demo.py`.
- **Linux:** open the extracted folder in your file manager and choose **Open in Terminal**, if available. Run `python3 showcase_demo.py`.

**Python is missing or too old**

Check with `python3 --version` on Mac/Linux or `py --version` on Windows. You need Python 3.9 or newer. Install it from [python.org](https://www.python.org/downloads/), reopen the terminal, and try again. There is no separate package-install step.

**“Can't open file” or “No such file”**

Make sure the ZIP is extracted and you are in the folder containing `showcase_demo.py` and this README. Do not run the file from inside a ZIP preview or copy only the launcher out of its folder.

**The address is already in use**

Another copy may already be running. Use its existing browser address, stop it with Ctrl+C, or start on another port:

```sh
python3 showcase_demo.py --port 8768
```

On Windows, replace `python3` with `py`. Then open **http://127.0.0.1:8768**. A different port has separate browser history.

**The browser page will not open**

Keep the terminal running and use the exact address printed there. This is a local desktop app: opening the address on another device will not connect to it.
