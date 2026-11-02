# Bounceback: customer recovery

Bounceback is an interactive customer-support story inside AI Workflows. It uses the existing Meridian layout, theme, source inspector, route planner and saved-result history. Open `/scenarios.html?workflow=customer-recovery` after starting `python3 showcase_demo.py --offline`.

The demo is self-contained: fictional cases, prepared responses, local browser state, no new model calls and no external writes. It illustrates an operating model; it is not a connected support service or evidence of model accuracy or churn reduction.

[Three-page annotated quick guide](../demo-web/bounceback-guide.html) is available from the app header. It follows a routine fix, a technical exception and learned reuse.

## Play through the story

1. **REC-101: routine fix.** Run the workflow. Approved guidance addresses an expired session; account, access, task and customer-confirmation checks must all pass before recovery is recorded.
2. **REC-102: exception.** There is no matching approved fix. The case remains open with its evidence. **Apply prepared technical fix** simulates the result of an authorised technical investigation, followed by confirmed customer recovery. It is not a general approval requirement for routine cases.
3. **REC-103: reuse.** The next case retrieves the validated workspace fix. The response cites REC-102; the learning step reuses its knowledge record without duplicating it. Running this case before REC-102 leaves it open.

The journey rail opens evidence for Understand, Resolve, Confirm and Learn. Conversation, Case progress and Learning show the customer experience, decision trail and versioned knowledge. A technical exception stays attached to the case through recovery.

## Checks and learning

Only approved non-privileged actions are allowed: refresh an existing session or select an existing authorised workspace. No membership or permission changes are possible. Source context must be current and belong to the case account.

A successful login alone is insufficient. Recovery requires matching account evidence, authentication, the correct workspace, completion of the blocked task and customer confirmation. **Try a failed check** demonstrates stale context, missing confirmation and wrong-account recovery logs.

Learning is automatic after those checks pass. A record keeps the source case, account and symptom, fix, version and active/withdrawn status. Retrieval derives its index from the current active records, scoped by account and symptom. **Customer still blocked** reopens the case and withdraws the affected learned guidance. Re-running a reopened fixture cannot silently close it. This is an in-browser exact-key index, not a production vector database or trained model.

## State and saved results

Working progress uses `meridian.customer-recovery.v1`. It survives reloads on the same origin and browser. Reset clears only the working recovery story; shared saved result snapshots remain available. Storage failures surface as errors and do not replace the in-memory previous state. Malformed working state is preserved for download before reset.

**Save result** stores an immutable snapshot through the existing scenario history. Opening it is read-only and cannot overwrite working progress. JSON downloads include the source, checks, timeline, knowledge and route plan. Browser data is not an authorisation boundary and never represents live customer records.

## Model routing and costs

The planning route separates small-model classification and knowledge formatting from response reasoning and recovery verification. Existing route controls allow model and token-budget comparisons. These are proposed assignments with editable token assumptions and dated rates, not measured task costs or live inference. Changing a route affects its estimate, not the prepared response.

## Implementation and verification

- `demo-web/assets/recovery-data.mjs`: authored cases, seed guidance and technical outcome.
- `recovery-engine.mjs`: pure transitions, checks, scoped retrieval, learning, withdrawal and storage.
- `recovery-workbench.mjs` and `recovery.css`: interactive workbench.
- `tests/web-recovery.test.mjs`: recovery, exception, reuse, duplicate, source, storage and history checks.

Existing recorded model answers and review gates for other workflows are unchanged. Hosted deployment and live support/model integration are separate work.
