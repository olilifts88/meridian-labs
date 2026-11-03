# Transcript to action: delivery walkthrough

This is a fictional internal-workflow sandbox. It extends the existing transcript demo with source-linked proposals, explicit persona/action checks, exact-proposal approvals, persisted destination records, commit receipts and safe retry. It does not call a model or write to a real CRM, Finance system or issue tracker.

## Run it

**Server sandbox (recommended for the infrastructure walkthrough):** Node.js 24+ is required. From the repository or extracted showcase folder:

```sh
node scripts/delivery-sandbox.mjs --port 8770
```

Open `http://127.0.0.1:8770/delivery.html`. The writer binds to loopback only. The default state file is `meridian-delivery-8770.json` in the operating system's temporary directory. Use `--state-file /path/to/your/fictional-workspace.json` for a separate workspace. Never put customer information in this sandbox.

**Browser sandbox:** start `python3 showcase_demo.py --offline` and open `/delivery.html` on the printed address. It uses the same policy engine, but saves in that origin's localStorage. Browser checks are demonstrative and are not a trusted security boundary. The original Python-only workflows are unchanged.

Local completion does not establish a hosted deployment. The existing hosted demo will gain this page only after its normal release process.

## Three-minute route

1. **Conversation → Northstar Analytics → Prepare proposals.** Compare agreed pilot, requested seats, tentative budget and product problem with their source quotes.
2. **Check permission → Demo persona → Casey · Engineering → Approve this proposal.** The local writer denies the action. Return to Alex · business owner. This deliberately selectable persona is not enterprise sign-in.
3. **Approve this proposal → Apply to sandbox.** Use **Write and read back** to inspect the actual sandbox account, the pending Finance request and one Engineering signal.
4. **Retry / confirm saved write.** The existing receipt prevents a duplicate commit. The trace names what was checked and saved.
5. **Inspect run → Observed execution receipts / Model adapter contract.** Code compute timings are real observations from the selected surface. The active adapter uses prepared fixtures. There is no live provider, observed model latency or model token usage for this run.
6. **Where does it run? → Runtime and policy status** (server mode). Show browser, loopback Node writer and local state file. **Model route & cost** retains the existing editable planning controls; route changes do not dispatch a model.

Use **Try a boundary or failure** for wrong-account evidence, an unsupported approved-budget claim, changing a proposal after approval, interruption before commit or a lost acknowledgement after commit. These are explicitly triggered fault simulations. Prepare a new proposal to return to the canonical source-supported example. Existing records remain saved; new runs do not reset the workspace.

## Infrastructure

- The browser calls same-origin sandbox endpoints. The loopback service validates Host and mutation Origin, applies a body-size limit, and resolves the selected demo persona through an HttpOnly SameSite=Strict cookie. A request cannot choose a more privileged actor in its command body.
- The shared engine checks account scope, action permission, source-supported values, approval fingerprint and account revision. Only the business-owner persona can approve and apply account changes. Engineering and Finance are read-only through this particular workflow.
- Actor views exclude other accounts and their run/receipt data. The local service still deliberately permits switching demo personas. It is not a verified identity provider, multi-user production system or full access-management solution.
- Commands serialize through one writer. It persists account changes, related records and the commit receipt in one atomic file replacement, then reads the saved state back. A stale workspace revision is rejected. Retry after a lost acknowledgement returns the original receipt without another write.
- The model adapter is an explicit prepared-response boundary. A future live provider requires separate credentials, timeout/retry limits, budget controls and usage receipts. None is silently installed by this demo.
- Saved runs include policy version, source case, actor, review binding, adapter identity, measured reducer compute and the commit/readback trace. Reducer compute is not network, persistence, model or whole-workflow duration. Sandbox counters are not actual adoption or savings.

The existing 40 recorded model answers, owner labels and benchmark totals are not modified or extended by these sandbox runs.

## Verification

Run `node --test tests/delivery-sandbox.test.mjs` for normal delivery, uncommitted interest, account/role denials, stale approvals, duplicate/lost-ack recovery, storage readback and the actual loopback HTTP writer. Run `npm run test:web` and `npm run test:download` for regression and portable-delivery coverage. The server test needs permission to bind to loopback.

No automated test establishes enterprise authentication, hosted availability or measured AI quality. A change in generated text cannot be demonstrated here because this path uses authored scenario outputs.
