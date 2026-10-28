# AI Workflows v1.0.0

Explore five practical AI workflows through a Meridian Labs interface: release notes, vulnerability review, security questionnaires, SOC 2 evidence review, and calls to Notion CRM.

**Download `meridian-ai-workflows.zip` under Assets.** GitHub's “Source code” downloads contain the full repository; the named ZIP contains just the demo.

## Start

1. Extract the ZIP and open the `meridian-workflow-showcase` folder.
2. Open a terminal in that folder.
3. Run `python3 showcase_demo.py` on Mac/Linux, or `py showcase_demo.py` on Windows.
4. Open **http://127.0.0.1:8766**. Keep the terminal open; press Ctrl+C there to stop.

Requires Python 3.9+ and a desktop browser. No package installation, AI account or API key is needed. The included README provides setup help.

## Explore

- **Try a workflow:** choose a prepared case, inspect the evidence, run the local checks and explore a simulated approval. Save or download your result.
- **Real AI runs:** inspect 40 genuine recorded model answers, including mistakes, original/revised checks and recorded human reviews.
- **Evaluation:** compare the same examples across models and instructions, with measured tokens/time and estimated API cost per check-passing answer.
- **Routing:** inspect explicit rules that choose a model, use code or hold for evidence. These rules can select matching saved answers.

Visitor scenarios replay existing AI answers and make no new model calls. Business actions use fictional data and local simulations. Saved scenarios stay in the visitor's browser. API-equivalent estimates are not subscription charges; post-pilot routing replay is not a fresh routing-effectiveness study.

The release also includes `meridian-ai-workflows.zip.sha256` for checking the ZIP's SHA-256 checksum. The full source, tests and method are in the repository.
