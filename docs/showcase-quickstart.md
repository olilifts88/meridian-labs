# Meridian Labs · AI Workflows

Explore the workflow routes, compare model choices and review saved answers. This is AI Workflows v1.2.1, with the same routes and interface as the hosted demo. This package is a small runnable part of the [full GitHub repository](https://github.com/olilifts88/meridian-labs).

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

- **Workflows:** choose a task, inspect the source evidence and click **Run workflow**.
- **Adjust route & token budgets:** change the model route or per-step assumptions before running. The comparison names the one-model alternative and shows the signed cost difference.
- **Output evaluation:** after Run workflow, the source checks and artefact appear automatically. Matching recorded model answers are expandable where available. A brief reveal respects reduced-motion preferences.
- **Review decision:** inspect the checks, approve the output pages or request a supported revision. A written note alone is saved as feedback; it does not generate an arbitrary rewrite.
- **Output pages:** release notes open a branded product update. Transcript to action opens CRM, an issue board, a revenue tracker, a team post and a searchable call library. Other workflows open their registers and follow-ups.
- **Saved results:** return to the route, sources, decisions and approved pages stored in this browser.

Try four release examples, four transcript scenarios, 40 vulnerability findings, 20 security questions and 16 SOC 2 controls. Source details link to the supporting evidence and review method.

The calculator supports GPT-6 Luna, GPT-6 Sol, GPT-6.1 Sol, GPT-6.1 Terra and GPT-6 Astra. It handles cached reads and writes, processing tiers, context length, region and retry budgets. [How model routing and costs work](workflow-stage-routing.md).

## Pricing checks

The launcher checks OpenAI's public documentation before opening the demo. A scenario save also checks prices. If the web check fails, the last verified rate card is retained. Sources & calculation shows its date and basis.

To start without a web check, use `python3 showcase_demo.py --offline` (or `py showcase_demo.py --offline` on Windows). No model calls or API keys are needed. The hosted version uses the same calculator and a server-side pricing check.

## Source answers and scenario routes

The original forty AI answers and evaluation records remain available as supporting evidence. New prepared business outputs are separate from that benchmark. Choosing a different stage route changes the plan and cost estimate; it does not generate a new AI answer or alter a review. Quality evidence stays linked to the answer and setup it assessed. Costs are token estimates, separate from tool fees and subscription charges.

Workflow decisions operate on sample business data. Approval does not update an external CRM or send a message. Missing evidence and failed checks still hold the relevant action.

## Where your results are saved

Visitor results use this browser's local storage for this localhost address. They are not uploaded or written to the repo's model results. Another browser or port has a separate history. Clearing browser data removes them, so download JSON results you want to keep. Up to 50 results are retained; nothing is silently evicted. If saving is unavailable or storage is full, you can still download the completed result.

The launcher serves only the bundled public demo and the pricing check. It has no owner-review write endpoint. Owner review labels shown in the recorded library are a snapshot; private review comments and raw execution receipts are not included.

## Inspect the code and method

- [Source snapshot and scenario runner](../src/workflow_portfolio/recorded_showcase.py): real recorded answers, receipt provenance, re-evaluation and approval gates.
- [Current browser interface](../demo-web/assets/run-explorer.mjs): workflow navigation and saved results.
- [Business scenario sources](../demo-web/assets/business-data.mjs): prepared records and source-linked outputs.
- [Local browser server](../src/workflow_portfolio/web_demo.py): loopback assets and pricing checks.
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

Transcript to action branches into five destination paths, each with its own model, effort and token budget. Click a path for its proposed records, source excerpts and checks. The paths join for shared review before output formatting. The calculator includes every branch, the shared steps and any retry budget.
