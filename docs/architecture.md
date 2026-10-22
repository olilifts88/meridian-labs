# Architecture and decisions

The reference uses four boundaries:

1. **Evidence:** a product change has a stable ID, content kind, PR links, release stage and exact permitted audiences. The evidence adapter would fetch this from trusted systems in a real deployment. The draft cannot define its own review policy.
2. **Draft:** a generator can propose text and structured claims. The example loads the proposal from JSON so it runs offline.
3. **Policy:** deterministic checks compare structured claims with the evidence. These checks do not depend on model wording or confidence. A failed claim blocks publication.
4. **Decision store:** SQLite saves one record per product change and indexes its PR links. Adding a PR updates that record; using a PR for a different change is rejected. It appends an event for each submission, correction or engineer decision.

The saved-case benchmark applies the same evidence and standards to each model. It rejects unmatched case sets, reports each case's result, and totals illustrative tokens only when usage is present for every case. Comparing models without matched tasks would mix model behaviour with task difficulty.

For routine content, successful checks reach `ready_to_publish`. A new guide pauses for an engineer and reaches that state only after approval. Nothing leaves this demo. The example does not attempt to prove prose quality with string matching; the phrase checks are explicitly an offline stand-in for human-approved examples. A real evaluation layer would test factuality, usefulness and source grounding on a maintained set of cases, then send selected failures for human review.

The public API would need authenticated, tenant-scoped adapters before real customer data could enter this flow. The test suite covers the important state transitions and rollout mismatch. It does not establish readiness for a defence or regulated deployment.
