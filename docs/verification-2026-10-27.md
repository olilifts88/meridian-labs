# Integrated release-agent verification · 27 October 2026

The fictional routine CSV-export case completed the integrated path using the existing ChatGPT sign-in: approved source → model-written draft → deterministic evaluation → second model review → private local release feed. The saved draft kept the beta availability limited to the confirmed pilot groups. The review verdict was pass. The requested route was `gpt-6-luna` at low effort for both calls; independent backend identity was not exposed.

The first run made two subscription-call attempts. The CLI exposed 15,578 input and 38 output tokens for drafting, and 14,222 input and 34 output tokens for review. These are per-call CLI usage fields, including cached input tokens, not a monetary cost. A repeated run with the same approved source and policy made **zero new calls**, reused the completed receipts and reported duplicate local delivery rather than adding a second note. Private full receipts and run JSON are under ignored `private-data/` and are not committed.

Verification completed after the code changes:

- Python: 157 tests passed, including bad-draft hold, full path, one-call budget and repeated-run behavior.
- JavaScript: 24 tests passed, including n8n export, relay, deployment and mirror checks.
- Demo evaluation: 21 of 21 fictional scenarios and deliberate corruptions passed.
- `scripts/capability_check.py --verify`: mapped offline checks passed.

The new integrated path is a CLI workflow, while the browser demo retains its template-first route. The source is fictional and local. Delivery is only to a private local demo file. There is no live source connector, external publication, account-wide spend cap, measured cash cost or held-out multi-model benchmark in this verification.
