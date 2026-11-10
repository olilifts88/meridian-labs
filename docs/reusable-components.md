# Reusable app components

This catalogue maps implemented components and identifies patterns seen in the hosted apps that are not yet portable repository components. It is a source map, not a claim that every private app is included.

## Implemented in this repository

| Resource | Source | Use and boundary |
| --- | --- | --- |
| Meridian toolbar and appearance | `demo-web/assets/app-theme.js`, `app-ui.css` | Shared app identity, Light/Dark preference and refresh control. Current public hosted shell reconciled into canonical source during the Bounceback refresh. |
| Live-content modal | `demo-web/assets/app-dialog.mjs`, `app-dialog.css` | Native dialog, keyboard close, backdrop close, focus return and optional full-page link. Moves live content instead of cloning interactive controls. Use `onClose` to restore moved content. |
| Workflow preview launcher | `demo-web/assets/workflow-launcher.mjs` | Opens the public directory workflows in an embedded workspace, without navigating the directory. An explicit full-page link remains. Opening does not run the workflow. |
| Embedded workflow shell | `demo-web/scenarios.html?embed=1` | Hides duplicate global navigation while keeping the same workbench and state rules. This is presentation, not an authentication boundary. |
| Source inspector and output views | `demo-web/assets/app-ui.mjs` | Existing read-only source clones, output tabs and searchable record queue/detail views. Use the live-content modal for controls that need their event handlers. |
| Output evaluation | `demo-web/assets/output-evaluation.mjs` | Fixed criterion counts, failed criteria and source links. Never treat a passing source check as a human review or model-quality score. |
| Quality review and comparisons | `demo-web/assets/quality-review.mjs`, `quality-core.mjs`, `word-diff.mjs` | Matched recorded answers, source-bound changes, word differences and step detail. Preserve exact case/evidence identity; prepared outputs cannot inherit recorded model scores. |
| Routing and estimated run breakdown | `demo-web/assets/workflow-routing.mjs`, `run-breakdown.mjs` | Editable model/effort/token plans and illustrative stage costs. Estimates are separate from actual source-run usage. |
| Checked browser history | `demo-web/assets/visitor-results.mjs` | Immutable saved-result snapshots with readback and collision checks. Browser storage is not a security boundary. |
| Recovery examples | `demo-web/assets/recovery-examples.mjs` | Seven prepared follow-along states and same-case evidence comparisons using the real recovery engine. No fresh inference, fabricated model scores or cross-account data. |

## Patterns flagged across apps

| Observed pattern | Current source ownership | Portable status / what remains |
| --- | --- | --- |
| Soundcheck evidence drawer, review trail and version-bound retest | Hosted owner-only Soundcheck source | UX reference only. Server storage, voice provider, allowance and private access are not in the public demo. Reuse the interaction through the shared modal; do not copy private routes, credentials or records. |
| Soundcheck worked-case entry and context bar | Hosted Soundcheck | Bounceback now has its own explicit Load example entry. The public example module supplies authored states; it does not import Soundcheck's private review state. |
| Soundcheck role workspaces and meeting-to-delivery panels | Separate hosted presentation/operating-workspace project | Not a reusable public component. Extract only after defining a neutral data contract, removing private content and testing navigation/keyboard behaviour. |
| Performance/LifeOS inbox, agenda and source-state views | Separate private app | Not included here. Do not advertise those app implementations as part of a public download. Their state/revision concepts can inform future components. |

## Source drift found and reconciled

The published public Site had a newer toolbar/theme, expanded fictional transcript examples, workspace controls and page asset references than the public repository. These existing public assets were reconciled before applying the new Bounceback changes. Private Soundcheck assets remain hosted-only. Future exports should use `sync_public.py --check` against this canonical `demo-web/` tree instead of editing its hosted copy independently.

## Using the modal

```js
import {openAppDialog} from './app-dialog.mjs';
openAppDialog({
  title: 'Case details',
  trigger: clickedButton,
  content: liveDetailElement,
  href: '/scenarios.html?workflow=customer-recovery',
  onClose: () => originalHost.append(liveDetailElement)
});
```

Keep the title specific, provide an explicit link when a full page is useful, preserve controls on close, and never make the dialog itself an implicit approval or execution step.
