'use strict';
const LABELS = new Set(['Pass', 'Needs improvement', 'Unverified']);
function applyCalibrationFeedback(sample, feedback) {
 if (!feedback || feedback.revision !== sample.revision || !feedback.id || !Array.isArray(feedback.decisions) || !feedback.decisions.length) return {status:'Pending', reason:'Missing or stale feedback', sample};
 const previous = (sample.calibration_receipts || []).find(r=>r.id === feedback.id);
 if (previous) {
  const same = previous.revision === feedback.revision && JSON.stringify(previous.decisions) === JSON.stringify(feedback.decisions);
  return same ? {status:'Already recorded', sample} : {status:'Pending', reason:'Receipt ID reused with changed decisions', sample};
 }
 const ids = new Set();
 for (const d of feedback.decisions) {
  const c = sample.cases.find(c=>c.id === d.case_id);
  if (!c || ids.has(d.case_id) || typeof d.statement !== 'string' || !d.statement.trim() || !['label','qualitative'].includes(d.kind) || (d.kind === 'label' && !LABELS.has(d.label)) || (d.kind === 'qualitative' && d.label != null) || (c.human_label != null && c.human_label !== d.label)) return {status:'Pending', reason:'Invalid or conflicting feedback', sample};
  if (c.human_feedback && (c.human_feedback.statement !== d.statement || c.human_feedback.kind !== d.kind) && feedback.explicit_correction !== true) return {status:'Pending', reason:'Existing feedback needs explicit correction', sample};
  ids.add(d.case_id);
 }
 const next = JSON.parse(JSON.stringify(sample));
 for (const d of feedback.decisions) {
  const c = next.cases.find(c=>c.id === d.case_id);
  if (d.kind === 'label') c.human_label = d.label;
  c.human_decision = d.statement;
  c.human_feedback = {kind:d.kind, statement:d.statement, feedback_id:feedback.id, revision:feedback.revision};
 }
 next.calibration_receipts = [...(next.calibration_receipts || []), feedback];
 return {status:'Recorded', sample:next};
}
module.exports={applyCalibrationFeedback};
