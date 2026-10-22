# Portfolio map

This repository is being rebuilt from a September 2026 snapshot of a larger internal automation system. It is an independent implementation with fictional organisations, customers and data. The snapshot informs the architecture; it is not imported here. The current repository is an early, runnable slice, **not** a complete port of that system.

## What the original system contained

The reviewed snapshot has 49 current n8n workflow folders and 22 archived ones. It also has separate Code-node files, workflow split and deployment tools, a read-only nightly mirror of running workflows, saved evaluation cases, a Python legal engine, two web apps, knowledge material and design notes. A production workflow existing in the snapshot does not by itself prove that it is active today.

Those pieces fall into six useful families:

| Family | Representative path | Portfolio treatment |
| --- | --- | --- |
| Documentation and releases | Product changes and questions become release candidates, review records, published notes and documentation fixes | Build the first complete end-to-end example in both n8n and code-only form |
| Knowledge and AI operations | Route questions, retrieve evidence, evaluate outputs, spot recurring failures | Add saved cases, model comparisons and an inspectable operating view |
| Calls and CRM | Turn meeting evidence into reports and proposed CRM changes with review | Build a second complete example after the release path |
| Security and trust | Prepare cited questionnaire answers and harvest approved answers for reuse | Build a third example with strict source and approval boundaries |
| Legal and contracts | Intake, extraction, document preparation and review | Show the architecture and a bounded fictional example; the original Python engine is a separate substantial product |
| Platform operations | Validate, deploy and mirror n8n workflows; monitor failures | Rebuild reusable tools with deployment and mirror disabled until configured |

The internal web apps and company knowledge corpus are context for that system, not ready-to-share portfolio files. They should only appear if independently rebuilt with fictional content and a clear purpose.

The source distinguishes **announcement candidates**, **release-note broadcast**, and **documentation maintenance** as separate workflows. Some source notes describe trials or proposals rather than a single live, connected publishing path. The portfolio can connect these stages into one understandable example, but that connection is a new design choice and must be labelled as such. It should not be presented as an exact copy of one existing workflow.

## Where the first portfolio slice diverged

| Capability | Earlier system | In this repository now | Required change |
| --- | --- | --- | --- |
| n8n source layout | Each workflow has `workflow.json`, separate `code/*.js`, and an in-file `_code` map; split, hydrate and round-trip validation are general tools | The first example now uses that source layout, general split/build tools and a generated importable export | Apply the same validation path to each new workflow; deployment and mirror still need their own guarded tools |
| Product-change intake | An upstream GitHub Action examines changes and sends a structured candidate to an n8n webhook | Manual trigger loads fictional cases | Rebuild the same input contract using a fictional product repository; keep the Action and relay separate |
| Release relay | A short webhook workflow formats candidates, deduplicates changes, links a review record and notifies the relevant engineer | A separate two-node webhook relay now validates a fictional report, groups PRs, skips repeated candidates and prepares a review card | Add durable state, a review record, engineer notification and the callback; the current preview makes no external write |
| Decision callback | A separate webhook handles a review action and updates the record | Missing | Add the callback with a saved decision and duplicate-action test |
| Documentation feedback | Questions and product evidence feed a scheduled proposal flow; applying a proposed fix is a separate step | A written knowledge-gap skill only | Build capture, proposal, review and apply as executable paths |
| Broadcast | A separate workflow prepares and posts release notes | Missing | Show a distinct publishing boundary and save delivery receipts |
| Mirror and deployment | General GitHub-to-n8n deployment plus a read-only n8n-to-GitHub mirror | Offline deployment preview, guarded inactive-workflow create/update, and read-only single-workflow mirror preview are implemented but have not been tried against n8n Cloud | Add a reviewed GitHub mirror and hosted tests; never activate a workflow by adding files alone |
| Code-only version | The source system mixed GitHub Actions, n8n and a separate Python legal engine | Python release-note policy demo with a database and saved cases; a manual GitHub Action runs one fictional case without n8n | Run the **same complete release journey** without n8n using GitHub Actions and code, with the same contracts and expected decisions |
| Model and skills | Older workflows used a different model provider and task guidance in several places | No live model; two new example skills | Add an OpenAI adapter and public-safe, versioned skills with saved cases, while keeping deterministic checks outside the model |

The current n8n and Python examples agree on two narrow audience-check cases. They do **not** yet have the same triggers, side effects, review callbacks or failure handling. That distinction stays visible until end-to-end parity tests pass.

## Target GitHub layout

```text
.github/workflows/        CI; opt-in n8n deploy/mirror; code-only jobs
.n8n/<workflow>/          n8n canvas plus separate, reviewable Code-node files
contracts/                versioned inputs, outputs and decision schemas
src/                      code-only orchestration and shared policy modules
adapters/                 OpenAI, GitHub, Notion and notification boundaries
skills/                   public-safe task guidance and versions
evals/                    fictional saved cases and expected outcomes
examples/                 fictional inputs and walkthroughs
scripts/                  split, hydrate, validate, dry-run deploy/mirror tools
docs/                     architecture, source-to-portfolio map and operator guide
```

The n8n path and code-only path will consume the same contracts and saved cases. Where an n8n Code node cannot directly import a shared module, the build will generate its contents from a versioned source module. Parity tests will then compare decisions and side effects across both paths. GitHub Actions will provide schedules and manual runs for the code-only path; it will not depend on n8n Cloud.

OpenAI will provide model-backed drafting and evaluation through a replaceable adapter. A separate deterministic layer will check identity, audience, source links, duplicate changes and review requirements. The model can suggest content; it cannot set its own permission or approval policy. Saved examples will show useful output, wrong audience, missing evidence, duplicate delivery, review rejection and a correction that does not break earlier good cases.

Changing the old provider to OpenAI is a real integration change, not a word replacement. Prompts, response parsing, error handling and evaluation cases must be checked against the new adapter before any model-backed path is treated as working. Personal Notion skills can inform public-safe skill files, but private Notion URLs are not a substitute for files an interviewer can read.

## Build order and proof

1. **Preserve the shape.** Generalise the n8n split/hydrate/validate tooling and make the current example use it. Show that the exported workflow round-trips without loss.
2. **Complete the release journey.** Add change discovery, candidate relay, review callback, documentation proposal and publication boundaries. Use a fictional repository and local adapter fakes. Verify normal, duplicate, wrong-audience and failed-delivery paths.
3. **Match the GitHub-only path.** Run the same contracts and cases through GitHub Actions and code without n8n. Compare records, decisions and retries, not just a single check result.
4. **Add model operations.** Integrate OpenAI behind a testable adapter, keep offline CI deterministic, and version prompts, skills, rubrics and comparison cases. Show what changed after a failed example.
5. **Add two more journeys.** Use the same platform for a call-to-CRM review and a security-answer approval example. Each gets a five-minute walkthrough and explicit user outcome.
6. **Make sharing safe and useful.** Review all files and Git history, ensure demo data is fictional, provide a setup guide, run the offline suite, and leave external deploy/mirror jobs opt-in.

The upstream change-analysis Action lives in a different source repository. The reviewed snapshot documents its payload and behaviour but does not contain that Action's code. Its portfolio equivalent must be built and verified from that contract; it cannot be described as a line-for-line port.
