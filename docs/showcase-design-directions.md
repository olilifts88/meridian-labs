# Five Meridian AI Workflows design directions

Oli selected **Option 1 · Studio** on 28 October 2026. This direction is now applied to the functional five-AI workflows, shared results and standalone download. Keep the other studies as design references.

Design previews,28October2026. Open `/design-options`. Each option has six navigable pages: home, prepared scenario, real AI runs, shared result, evaluation/comparison and saved scenarios. This is30 preview states, separate from the working implementation. Studio 1 is now applied; the studies remain separate references. Model evidence in the previews comes from the actual40-answer snapshot; example saved-history cards are explicitly illustrative and never write real reviews or scenario history.

## Brand source

Read [Meridian · Visual Brand Guide v1.0](https://app.notion.com/p/3f51d10df33181f7b918c72cee71b59f): approved black globe/red meridian, matte black, graphite, warm off-white, narrow red accents and precise construction lines. The Notion page is a visual baseline, not a final production-asset specification; typeface and exact palette remain open refinements. This work read that page, not the separately linked ten-image PDF.

All options reuse the existing banner identity. `meridian-labs-lockup.svg` is a compact viewBox crop of the existing SVG for a readable navigation lockup; the approved banner is unchanged. Serif typography in option5 and the other UI typography/layout choices are proposals, not claimed brand requirements. No raster image generation or paid design service is used.

## Options

| Option | Approach | Best fit | Trade-off |
| --- | --- | --- | --- |
| 1 · Studio | Light editorial front door, two clear paths, generous space and evidence on demand | Sharing the work with a new professional contact | Deeper operational detail needs a click |
| 2 · Workbench | Dark surfaces, persistent workspace navigation, compact tables and inspection | Technical reviewers | Higher information density |
| 3 · Guided | Paced scenario selection and a focused result with progressive detail | First-time visitors | Less immediate side-by-side density |
| 4 · Evidence ledger | Warm white workspace, case rail, precise table rows and evidence/answer split | Verification and detailed review | More analytical than narrative |
| 5 · Field notes | Narrative chapters, serif editorial headings, clear source-to-decision story | Portfolio/case-study reading | Less like an operational dashboard |

For this audience, Studio is the strongest general entry point and Guided offers the clearest scenario flow. This is a design recommendation, not a user-tested finding. A final direction can combine a chosen entry style with the same accessible shared result components.

## Research and how it shaped the design

- [Langfuse experiment comparison](https://langfuse.com/docs/evaluation/experiments/compare-experiments): summary-to-case investigation, source traces, evaluator-vs-application failures and retained versions. Applied to the result evidence path and original/revised scores.
- [LangSmith compare results](https://docs.langchain.com/langsmith/compare-experiment-results): comparable cases, filters, compact/full/diff views and expandable detail. Applied to the run library, evidence split and setup comparison.
- [NN/g progressive disclosure](https://www.nngroup.com/articles/progressive-disclosure/): lead with important choices and make advanced detail easy to reach. Applied to two home actions and result tabs, rather than large permanent technical panels.
- [shadcn/ui dashboard blocks](https://ui.shadcn.com/blocks?category=dashboard): available open-source dashboard/sidebar/table patterns. Used as structural reference only; these previews have no React or third-party runtime dependency, and no template code was copied.

These sources support interface patterns, not claims that a template will improve evaluation quality. The working demo still distinguishes recorded generation, fresh local checks, simulated approval, private answer-quality review and visitor-local storage. No new model runs, model winner, cash-cost estimate or savings claim is introduced by a visual redesign.

## Verification

Browser visited all30 option/page combinations. Each rendered a heading and branding, with no broken images or page-level horizontal overflow at the inspected viewport. Original model data and owner reviews were not mutated. Design screenshots are in `assets/design-options/`. Narrow-screen layout is implemented in CSS; this record does not claim a full device/accessibility audit.

The preview page has optional browser-local favourites for design selection only; it does not apply a theme to the working app. The standalone ZIP excludes the design-study selector and includes the applied Studio assets. Cloudflare hosting remains deferred.
