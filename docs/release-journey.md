# One change, two paths to inspect

The fictional CSV export change is the first connected walkthrough. The product report says the feature is in beta for two pilot groups, with two PRs behind it. The n8n-shaped relay groups those PRs into one candidate and prepares a review card. The code-only policy then checks two proposed release-note drafts against the same report: the first wrongly says every customer can use the feature, and the corrected one names the pilot audience.

```bash
node scripts/preview-candidates.mjs examples/release_journey.json
python3 -m workflow_portfolio journey examples/release_journey.json
```

The first command runs the [relay's actual Code-node file](../.n8n/release-candidate-relay/code/prepare-candidate-review.js) outside n8n. It shows one candidate with two PRs and a preview of the review buttons. The second derives trusted evidence from that product report, checks each draft, and saves both decisions under one change ID. It reports **blocked** for the wrong audience, then **ready to publish** for the correction, with two audit events. “Ready” is a local decision; nothing is published.

This is a **new portfolio connection** between stages the earlier system kept separate. It makes the operating idea inspectable without claiming the original announcement relay directly published release notes. The two commands share one fictional input file, but they are not yet one automatic production pipeline. A separate [candidate-review example](candidate-review.md) now shows an inactive callback parser and local durable decision store. Those two pieces are not wired together in n8n, and there is still no publication adapter. The GitHub-only option runs these commands in the [manual offline Action](../.github/workflows/code-only-review.yml) under `release_journey`, with no n8n account or external write.
