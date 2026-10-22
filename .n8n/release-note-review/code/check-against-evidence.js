// Deterministic checks before anyone treats an AI draft as a publishable note.
const requiredText = (value) => typeof value === 'string' && value.trim().length > 0;
const stringList = (value) => Array.isArray(value) && value.length > 0 && value.every(requiredText);
const sameSet = (a, b) => a.length === b.length && new Set(a).size === new Set(b).size && a.every((x) => b.includes(x));

return $input.all().map((item) => {
  const candidate = item.json || {};
  const evidence = candidate.evidence || {};
  const draft = candidate.draft || {};
  const findings = [];

  if (!requiredText(candidate.case_id) || !requiredText(evidence.change_id) ||
      !requiredText(evidence.feature) || !requiredText(evidence.content_kind) ||
      !requiredText(evidence.stage) || !stringList(evidence.audiences) ||
      !stringList(evidence.pr_urls) || !stringList(evidence.source_urls) ||
      !requiredText(draft.kind) || !requiredText(draft.feature) ||
      !requiredText(draft.stage) || !requiredText(draft.model) ||
      !requiredText(draft.headline) || !requiredText(draft.body) ||
      !stringList(draft.audiences) || !stringList(draft.citations)) {
    findings.push('invalid_input');
  } else {
    if (!['beta', 'ga'].includes(evidence.stage) ||
        !['release_note', 'guide_update', 'new_guide'].includes(evidence.content_kind) ||
        !['release_note', 'guide_update', 'new_guide'].includes(draft.kind)) {
      findings.push('invalid_input');
    }
    if (draft.feature !== evidence.feature) findings.push('feature_mismatch');
    if (draft.kind !== evidence.content_kind) findings.push('content_kind_mismatch');
    if (draft.stage !== evidence.stage) findings.push('stage_mismatch');
    if (!sameSet(draft.audiences, evidence.audiences)) findings.push('audience_mismatch');
    if (evidence.stage === 'beta' && evidence.audiences.includes('all_customers')) findings.push('invalid_beta_scope');
    if (evidence.stage === 'ga' && !sameSet(evidence.audiences, ['all_customers'])) findings.push('invalid_ga_scope');
    const allowed = new Set([...evidence.pr_urls, ...evidence.source_urls]);
    if (draft.citations.some((url) => !allowed.has(url))) findings.push('unsupported_citation');
    if (!draft.citations.some((url) => evidence.pr_urls.includes(url))) findings.push('missing_pr_evidence');
  }

  return {
    json: {
      case_id: candidate.case_id || 'invalid-case',
      change_id: evidence.change_id || null,
      content_kind: evidence.content_kind || null,
      confirmed_audiences: stringList(evidence.audiences) ? evidence.audiences : [],
      draft_audiences: stringList(draft.audiences) ? draft.audiences : [],
      source_prs: stringList(evidence.pr_urls) ? evidence.pr_urls : [],
      findings,
      decision: findings.length ? 'blocked' : (evidence.content_kind === 'new_guide' ? 'engineer_review' : 'ready_for_delivery')
    }
  };
});
