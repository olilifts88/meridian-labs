// Pure, offline preparation. No Slack, Notion, GitHub or model calls occur here.
const items = $input.all();
if (items.length !== 1) throw new Error('Expected one release report');
const report = items[0].json.body ?? items[0].json;
if (report.source !== 'meridian-labs-example') throw new Error('Unexpected report source');
if (!Array.isArray(report.candidates) || report.candidates.length > 20) {
  throw new Error('Expected up to 20 candidates');
}
if (!Array.isArray(report.seen_keys) || report.seen_keys.length > 500 || report.seen_keys.some((key) => typeof key !== 'string')) {
  throw new Error('Expected bounded seen_keys array');
}

const seen = new Set(report.seen_keys);
const accepted = [];
const repeated = [];
const changeKey = (featureKey) => `feature:${featureKey}`;
const prKey = (url) => `pr:${url}`;
const isExamplePr = (url) => /^https:\/\/example\.invalid\/prs\/[1-9][0-9]*$/.test(url);
const escapeSlack = (text) => String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

for (const candidate of report.candidates) {
  if (typeof candidate.feature_key !== 'string' || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(candidate.feature_key)) {
    throw new Error('Candidate needs a stable feature_key');
  }
  if (typeof candidate.title !== 'string' || !candidate.title.trim() || candidate.title.length > 150) throw new Error('Candidate needs a short title');
  if (typeof candidate.summary !== 'string' || !candidate.summary.trim() || candidate.summary.length > 500) throw new Error('Candidate needs a short summary');
  if (!Array.isArray(candidate.prs) || !candidate.prs.length || candidate.prs.length > 5 || candidate.prs.some((url) => !isExamplePr(url))) {
    throw new Error('Candidate needs fictional PR evidence');
  }
  if (!candidate.availability || !['beta', 'ga'].includes(candidate.availability.stage)) {
    throw new Error('Candidate needs confirmed availability');
  }
  const cohorts = candidate.availability.cohorts;
  if (!Array.isArray(cohorts) || cohorts.length > 5 || cohorts.some((name) => typeof name !== 'string' || !name.trim() || name.length > 60) || (candidate.availability.stage === 'beta' && !cohorts.length) || (candidate.availability.stage === 'ga' && cohorts.length)) {
    throw new Error('Beta availability needs named cohorts');
  }
  const prs = [...new Set(candidate.prs)];
  const keys = [changeKey(candidate.feature_key), ...prs.map(prKey)];
  if (keys.some((key) => seen.has(key))) {
    repeated.push(candidate.feature_key);
    continue;
  }
  for (const key of keys) seen.add(key);
  accepted.push({
    feature_key: candidate.feature_key,
    title: candidate.title.trim(),
    summary: candidate.summary.trim(),
    prs,
    availability: { stage: candidate.availability.stage, cohorts },
    engineer: typeof candidate.engineer === 'string' && candidate.engineer.trim()
      ? candidate.engineer.trim().slice(0, 100)
      : 'Unassigned'
  });
}

const blocks = [{ type: 'header', text: { type: 'plain_text', text: 'Release candidates · preview' } }];
for (const candidate of accepted) {
  const audience = candidate.availability.stage === 'ga'
    ? 'All customers'
    : `Beta: ${candidate.availability.cohorts.join(', ')}`;
  blocks.push({
    type: 'section',
    text: { type: 'mrkdwn', text: `*${escapeSlack(candidate.title)}*\n${escapeSlack(candidate.summary)}\n*Availability:* ${escapeSlack(audience)}\n*Engineer:* ${escapeSlack(candidate.engineer)}\n*PRs:* ${candidate.prs.join(' · ')}` }
  });
  blocks.push({
    type: 'actions',
    elements: [
      ['Mark announced', 'announced'],
      ['Do later', 'deferred'],
      ['Not suitable', 'declined']
    ].map(([label, decision]) => ({
      type: 'button',
      text: { type: 'plain_text', text: label },
      action_id: `candidate_${decision}`,
      value: candidate.feature_key
    }))
  });
}
if (!accepted.length) {
  blocks.push({ type: 'section', text: { type: 'mrkdwn', text: 'No new candidates in this report.' } });
}

return [{ json: {
  accepted,
  repeated,
  next_seen_keys: [...seen].sort(),
  review_card_preview: { blocks },
  delivery_enabled: false
} }];
