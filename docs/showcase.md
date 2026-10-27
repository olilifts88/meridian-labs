# Try the four workflows

Requirements: Python 3.9 or newer and a browser. No dependencies, accounts, API keys, Notion, Slack or n8n are needed. Download the whole repository and extract it first.

Open a terminal in the repository folder and run:

```sh
python3 demo.py
```

On Windows, use `py demo.py`. Open http://127.0.0.1:8765/ and keep the terminal open. Press Ctrl+C in that terminal to stop.

## Five-minute walkthrough

### Release-note comparison

For the release-note comparison, use the **01 · Release notes** tab. The left card is **Release note inputs**; the right card is **Workflow output**. Leave **Change type** on **Routine update**, **Draft wording** empty and the product-change knowledge source checked. This offline page starts from a source-based template. It does not show the model-written draft from the separate [integrated release agent](release-agent.md).

1. Set **Proposed audience** to **Confirmed pilot groups** and click **Run release note flow**. On the right, expect **awaiting model review** and a CSV export draft naming the pilot groups. Under **Journey taken**, step 4 shows the rule checks and step 5 says the model was **not called**. Step 6 says local delivery is paused. That is the safe offline baseline, not a failed run.
2. Change only **Proposed audience** to **All customers · test an incorrect claim** and click the same button again. On the right, expect **blocked**, **Draft blocked: audience exceeds confirmed availability**, **Proposed audience: all_customers**, and **Checks raised: audience_mismatch**. Step 6 now says the source check blocked the draft. Nothing enters the local release feed.
3. You may still see **5/5 automated checks passed** under **Output evaluation**. That means the *safety behaviour* passed: the workflow recognised the wrong audience and held it back. It does not mean the proposed draft was acceptable. Open **Inspect complete result** if you want to compare `status`, `findings`, `output_gate` and the approved `evidence_snapshot`.

To see an actual model-written draft and model verdict, use the [integrated agent command](release-agent.md#run-it-yourself). The offline browser page is a separate way to demonstrate the source and policy gates.

### Other workflows

1. Choose **Vulnerability review** and run the sample. Expect two fictional findings, owners, remediation deadlines and available fix information. Enable the unavailable-feed option and run again: the result should be incomplete, rather than report a clean scan.
2. Choose **Security questionnaire** and run the sample. Expect four cited answer drafts and one evidence gap for SOC 2. Disable a policy source and rerun to see which answers lose support.
3. Choose **SOC 2 evidence review** and run the sample. Expect one control ready for a reviewer and four needing follow-up. Disable the evidence register to see all five lose their evidence. In the sample input, change evidence references or remove an owner to explore other gaps. These are demonstration controls, not a SOC 2 criteria mapping or audit verdict.
4. Expand the knowledge sources and decision trail to inspect which evidence each result used. Download the result JSON if useful.

All sources and advisories are fictional local fixtures. Source-system labels illustrate potential connections; no live GitHub, Notion or Drive adapters are used here. Vulnerability review matches exact versions against supplied advisories, rather than scanning a repository or querying a live feed. Questionnaire answers use explicit control keys. Release drafting uses deterministic templates and checks. In default offline mode no live language model is called. No external publication or customer submission occurs. Routine release notes can be delivered to a durable local demo release feed after checks and model review; new features, new documents and security outputs require human review.

## Automatic routing and output evaluation

The workflow button executes the source filters, workflow, output evaluator and policy router. **Journey taken** shows those stages alongside the decision trail. The evaluator checks emitted records against eligible source facts: citation provenance, audience scope, questionnaire coverage and grounded answers, advisory coverage and remediation metadata, and control evidence readiness. A failed check sets `output_gate: held_by_evaluation`. A passing check advances to the configured release policy: routine updates await a model review; new features, new documents and security outputs retain human review. An appropriately blocked output can pass safety checks because it correctly withheld an unsupported claim.

The default model route uses the repository's explicitly synthetic example policy. Routine release checks select Low analysis; new release material and security evidence review select Medium analysis. This selection executes in Python but does not dispatch a model. The UI identifies it as a preview. Neither model access nor comparative model quality is inferred from the example configuration.

Run the repeatable evaluation suite:

```sh
python3 demo.py evaluate
```

It executes 11 workflow scenarios and 10 deliberately corrupted outputs. Success means each scenario meets its expected state and each corruption is detected. These are local regression checks, not held-out model benchmarks or evidence of semantic quality. The evaluator explicitly leaves language quality, general factual entailment and real-world completeness unassessed. A stable run fingerprint binds source facts, inputs, output checks and policy trace; it is not a durable run database.

## Optional automatic live model review

The server can run one model review automatically after local checks on each eligible workflow click. This requires installed Codex, the reviewer's own existing ChatGPT sign-in and access to the configured models. No Notion account, source connector or API key is required. The repository includes a sanitized snapshot of the author's Notion routing settings and a capability snapshot; neither guarantees model availability in another account. Change the provided configuration explicitly if your runtime differs; the runner does not silently substitute a model.

Sign in using the normal Codex login flow, then run from the repository folder:

```sh
codex login
python3 demo.py serve --review-policy examples/showcase/review-policy.json --review-capabilities examples/showcase/review-capabilities.json --review-receipts private-data/reviewer-receipts --model-reviews 4
```

The receipt directory is created automatically and ignored by Git. Stop the earlier offline server before starting live mode on the same port. Each eligible new review consumes your signed-in subscription allowance. The four-call budget is per server session; it is not a provider account-wide spending limit. For compiling your own Notion source snapshot, see [Model routing](model-routing.md).

This explicitly enables up to four subscription model-call attempts for that server session. It sends the fictional result and eligible evidence snapshot to the configured subscription model. Results expose selected settings, accepted completion, validated pass/hold assessment and available usage separately from independent backend identity. `model_called_this_run` distinguishes a new invocation from a cached completed review; `cached` makes reuse explicit. The model must return validated pass/hold JSON. It cannot override a deterministic hold or grant human approval. A pass allows the configured routine-release policy to deliver once to the private local release feed. Other outputs remain for human review. Identical runs reuse the in-memory review receipt; existing on-disk receipts prevent redispatch after restart. Failed or uncertain execution is not retried. Blocked, incomplete and evidence-missing outputs do not dispatch. There is no API-key fallback.

The standalone `python3 demo.py review --result result.json --policy policy.json --capabilities capabilities.json` previews a route. Add `--live --receipt /private/unique-receipt.json` only for an explicit subscription execution. In-process tests cover failures and duplicate handling. On 26 October 2026, all four corrected default workflows completed real subscription model reviews using a current connector-exported skill-model-evaluation v3.6 policy: Luna/Low for routine release checks and Sol/Medium for security evidence reviews. The runtime accepted those requested settings; independent backend identity is not exposed. Earlier held outputs are preserved in private receipts. The corrected evidence bundle includes relevant approved sources and the original workflow inputs. Repeated runs reuse completed receipts without another model call. The evaluator model validates source-supported outputs; it does not produce the initial template-based draft.

## Handover status

The local implementation passed 153 Python tests, 24 JavaScript tests, 21 workflow/output evaluation cases and consistency checks for three n8n exports on 26 October 2026. The launcher was checked without a preinstalled project package. The author reviewed the demo and accepted its behavior. Repository checks and dated evidence are recorded in the [verification record](verification-2026-10-26.md). The local demo URL is only available on the machine running the launcher.
