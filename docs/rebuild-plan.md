# Rebuild plan

The goal is one GitHub repo containing two inspectable versions of the same workflow: the n8n orchestration and a code-only implementation. The current code is an offline reference. Each stage below has a visible proof before the next one begins.

## 1. Make the core decisions honest

The source record determines the change ID, content kind and audience. The draft proposes wording; it cannot lower a review requirement. A growing group of PRs still belongs to one change. Passing checks means **ready for delivery**, not published. The unit tests and demo cover this stage.

## 2. Rebuild the n8n version in this repo

The first importable n8n workflow, readable Code-node files and export check are now in the repo. They use only synthetic cases and make no external calls. Next, add optional GitHub-to-n8n deployment and allowlisted nightly n8n-to-GitHub mirror tooling. Both must remain disabled until deliberately configured.

## 3. Add the relevant skills

Two public-safe, self-contained portfolio skills now show drafting and knowledge-gap triage. Expand these with versioned cases and tests where useful. Private Notion pages are optional references because an interviewer may not have access. Use OpenAI for any new model integration; do not carry over older provider-specific instructions.

## 4. Put identity before tools

Add an authenticated actor and a scoped evidence reader. A caller must be allowed to read a source before it can enter model context, and a delivery adapter must check the audience again before writing. Test cross-tenant reads, missing scopes and revoked access. The current JSON fixtures are not an authentication system.

## 5. Add a real generation boundary

Create an OpenAI model adapter that returns a structured draft with source references. Keep prompts and model settings versioned. Save the source snapshot and output so a failed case can be replayed. Use a fake adapter in CI; run a live API test only with explicit credentials and a cost limit.

## 6. Deliver reliably

Put approved content in a transactional outbox, then let a separate worker send it to a configured destination. Save the provider receipt, retry transient failures, and use the stable change ID as the idempotency key. Test failed delivery and a retry that does not publish twice.

## 7. Evaluate and operate it

Grow the saved-case set to cover correctness, audience, source grounding and useful task completion. Compare model candidates on the same cases and source snapshots. Missing token usage must stay unknown, not zero. Add logs, alerts, retention rules and a runbook before calling the service production-ready.

## 8. Prepare a public release

The first clean commit is in a private GitHub repository. Before making it public, review every file and Git commit for company material and secrets, choose the public name and license, run the tests and inspect the packaged artifact. No source code or internal data from an employer belongs here.
