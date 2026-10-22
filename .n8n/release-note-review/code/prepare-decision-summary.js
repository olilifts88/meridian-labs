// A compact output for an operator. This demo deliberately sends no messages.
return $input.all().map(({ json }) => ({
  json: {
    case_id: json.case_id,
    change_id: json.change_id,
    decision: json.decision,
    reason: json.findings.length ? json.findings.join(', ') : 'source checks passed',
    audience: json.confirmed_audiences,
    review_owner: json.decision === 'engineer_review' ? 'configured_engineer' : null,
    delivery_enabled: false
  }
}));
