# Model route and Run breakdown

The existing Model route & cost area and settings dialog have two views:

- Model route edits the intended models, effort and token budgets. Cancel discards edits; Use this route applies them.
- Run breakdown inspects the selected original generation's recorded input, cached input and output tokens, model basis, dated estimate and source. It has no route-apply action.

Recorded result pages open Run breakdown by default. Scenario setup starts on Model route; completing or reopening a prepared scenario selects Run breakdown when its disclosure is opened.

Original generations retain their own recorded USD estimate. The view checks token categories, price components and model basis before showing a cost. Missing or mismatched cost evidence stays unavailable. Cached input and reasoning retain their existing subset semantics.

The forty pilot records are individual model trials over fictional inputs. They are not a single multi-model execution. A captured generation has Partial task coverage until the complete coordinator/worker/retry/verification inventory is established. Prepared business and release outputs cannot inherit copied model telemetry; saved replay results distinguish their original source generation from the local replay. Related model trials are linked separately.

This UI change does not dispatch models, install automatic Chat capture, create measurements or change prior outcomes. It adds no paid service or permission.
