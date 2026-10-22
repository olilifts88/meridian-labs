# Security and sharing checklist

- Synthetic fixture data only. `example.invalid` cannot resolve to a production service.
- Do not add credentials, webhook payloads, personal data, customer names or internal source documents.
- Keep `.env`, local databases, build output and virtual environments out of Git.
- Review every new fixture and screenshot before publishing a public remote.
- Authenticate every connector and verify tenant permissions **before** retrieving model context or showing output.
- Validate signed webhooks, apply least-privilege scopes, and keep an audit record of review and publication decisions.
- Add rate limiting, queueing, retries and dead-letter handling to any live integration.
- Redact payloads from error logs and set a retention window for source evidence and model output.

This repo is safe to inspect and run locally as a reference. It intentionally does not include a live model key, publish action, or connection to an employer system.
