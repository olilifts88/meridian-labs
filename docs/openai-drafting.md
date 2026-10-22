# Optional OpenAI drafting

The offline journey uses saved, fictional drafts so tests are repeatable. [`openai_adapter.py`](../src/workflow_portfolio/openai_adapter.py) adds a separate, optional live drafting boundary. It takes the confirmed audience and linked evidence from the product report, applies the [release-note skill](../skills/release-note-drafting.md), and asks the OpenAI Responses API for a structured draft. The draft still goes through the independent deterministic checks. It cannot decide who has access or publish anything.

The adapter is restricted to `example.invalid` source links. It refuses unresolved source questions instead of filling the gap from memory. The key must be in `OPENAI_API_KEY`, and the model must be chosen explicitly. Only use this command when you intend to make a billable API request with fictional inputs:

```bash
python3 -m workflow_portfolio draft-openai examples/release_journey.json --model YOUR_SUPPORTED_MODEL
```

The command prints the draft and its local check result, then discards its temporary database. Ordinary CI replaces the HTTP call with a fake and tests the request shape, source restriction and unresolved-question path. A live API call has **not** been run or verified in this repo, so the current claim is an implemented adapter, not a working hosted integration.

The adapter follows the official [Responses API](https://developers.openai.com/api/reference/resources/responses/methods/create), [Structured Outputs guide](https://developers.openai.com/api/docs/guides/structured-outputs), and [API authentication guidance](https://developers.openai.com/api/reference/overview). The source check remains separate because structured output controls format, not the truth of a release claim.
