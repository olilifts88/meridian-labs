import {calculatePlan, renderPlanner} from './workflow-routing.mjs?v=branch-folds-20261102';

const money = value => value == null ? 'Unavailable' : '$' + value.toFixed(5);

// All workflows share the same draft, validation and apply/cancel behaviour.
export function attachRouteSettings(parent, trigger, {getContext, onApply}) {
  const dialog = document.createElement('dialog');
  dialog.className = 'rw-settings-dialog';
  dialog.setAttribute('aria-label', 'Route & token budgets');
  dialog.innerHTML = `<div class="rw-dialog-header"><h2>Route & token budgets</h2><button type="button" aria-label="Close route settings">×</button></div>
    <div class="rw-dialog-body"><p class="muted">Choose a route, then open a step to edit its model, effort and token estimates.</p><div class="planner-host"></div><p class="error" role="alert"></p></div>
    <div class="rw-dialog-footer"><button type="button">Cancel</button><button type="button" class="primary">Use this route</button></div>`;
  parent.append(dialog);
  const host = dialog.querySelector('.planner-host');
  const error = dialog.querySelector('[role="alert"]');
  const [close, cancel, apply] = dialog.querySelectorAll('button');
  let planner;

  function refreshEstimate() {
    if (!planner) return;
    const plan = planner.snapshot();
    const estimate = calculatePlan(plan);
    host.querySelectorAll('.route-stage-content>details').forEach(node => { node.open = true; });
    host.querySelectorAll('.route-stage-head>strong').forEach((node, index) => {
      node.textContent = money(estimate.rows[index]?.estimate.amount);
    });
    const cells = host.querySelectorAll('.routing-summary>div');
    if (cells.length !== 3) return;
    const delta = estimate.amount == null || estimate.baseline == null ? null : estimate.amount - estimate.baseline;
    const values = [money(estimate.amount), money(estimate.baseline), delta == null ? 'Unavailable' : (delta < 0 ? '−' : delta > 0 ? '+' : '') + money(Math.abs(delta))];
    const labels = ['Selected route estimate', 'All steps: ' + plan.rate_card.models[plan.baseline_model].label, 'Estimated difference'];
    cells.forEach((cell, index) => {
      cell.querySelector('strong').textContent = values[index];
      cell.querySelector('span').textContent = labels[index];
    });
  }

  trigger.onclick = () => {
    error.textContent = '';
    host.replaceChildren();
    const {workflow, record, card, plan, records = []} = getContext();
    planner = renderPlanner(host, workflow, record, card, {savedPlan: plan, records, onChange: refreshEstimate});
    refreshEstimate();
    dialog.showModal();
  };
  cancel.onclick = close.onclick = () => dialog.close();
  dialog.onclose = () => trigger.focus();
  apply.onclick = () => {
    const next = planner.snapshot();
    if (calculatePlan(next).amount == null) {
      error.textContent = 'Check the token values and processing options before applying this route.';
      return;
    }
    onApply(next);
    dialog.close();
  };
  return dialog;
}
