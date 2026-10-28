# Meridian Labs · AI Workflows

Two ways to explore five AI-powered workflows: try a prepared scenario, or inspect the actual recorded model runs and comparisons. This package is a small runnable part of the [full GitHub repository](https://github.com/olilifts88/meridian-labs).

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

- **Try a workflow:** choose a workflow, one of two prepared cases, and follow the routing rule or choose a fixed recorded AI setup. Choose a simulated approval, then run the scenario. The existing Python evaluators check the recorded answer again and simulate the outcome. The result saves in your browser.
- **See real AI runs:** inspect all 40 genuine model outputs, including failures, their source evidence, original/revised evaluation, time, tokens and a snapshot of the owner's reviews.
- **My saved scenarios:** reopen your own results or download them as JSON. Each links to its original AI answer and opens in the same result view.
- **Evaluation & benchmarking:** see the shared check framework, fixture/regression tests and actual model-setup comparison. Older rule-based demos remain accessible from the five workflow cards.

All examples are fictional. No CRM, Linear, Slack or other external service is changed. An approval in a visitor scenario affects only the local simulation. A scenario approval cannot override a failed answer check or missing evidence.

## What is real, and what is replayed?

The 40 recorded AI answers were generated privately on 28 October 2026: ten cases across two requested models and two instruction styles. They include mistakes. You do not generate fresh AI answers when using this download. The scenario runs the ordinary-code checks and simulator on an existing answer, with zero model calls and zero new model tokens.

Your scenario record is not another independent model test. It is kept separately from the 40-answer benchmark. Original generation tokens/time are labelled separately from your new local evaluation time. Estimated API cost values the recorded tokens using dated published rates; it is not a subscription bill. The shared result shows cost, timing, model settings and why the new routing rules choose a model, ordinary code or a hold. These rules run offline and can select a matching saved answer. They were defined after the fixed-setup pilot, so the replay does not prove future routing quality or savings. Technical provenance is expandable.

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

The full repository contains the wider implementation, tests and supporting guides. This ZIP includes only the demo's required source, examples, browser assets and instructions. Hosting is deferred; no Cloudflare account is needed.


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
