import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { runInNewContext } from 'node:vm';
import { hydrateWorkflow, splitWorkflow } from '../scripts/n8n-lib.mjs';

const folder = join(process.cwd(), '.n8n', 'release-note-review');
const readCode = (name) => readFileSync(join(folder, 'code', name), 'utf8');
const execute = (name, input = []) => runInNewContext(`(() => { ${readCode(name)} })()`, {
  $input: { all: () => input }
});
const candidateCode = readFileSync(join(process.cwd(), '.n8n', 'release-candidate-relay', 'code', 'prepare-candidate-review.js'), 'utf8');
const prepareCandidates = (report) => JSON.parse(JSON.stringify(runInNewContext(
  `(() => { ${candidateCode} })()`,
  { $input: { all: () => [{ json: report }] } }
)[0].json));
const reviewCode = readFileSync(join(process.cwd(), '.n8n', 'candidate-review-callback', 'code', 'normalize-review-action.js'), 'utf8');
const normalizeReview = (payload) => JSON.parse(JSON.stringify(runInNewContext(
  `(() => { ${reviewCode} })()`,
  { $input: { all: () => [{ json: payload }] } }
)[0].json));

test('the exported workflow embeds every mapped Code-node file', () => {
  const source = JSON.parse(readFileSync(join(folder, 'workflow.json'), 'utf8'));
  const exported = JSON.parse(readFileSync(join(process.cwd(), 'exports', 'n8n', 'release-note-review.json'), 'utf8'));
  assert.equal(source.active, false);
  assert.deepEqual(exported, hydrateWorkflow(source, folder));
  assert.equal(Object.hasOwn(exported, '_code'), false);
  for (const node of exported.nodes.filter((item) => item.type === 'n8n-nodes-base.code')) {
    assert.equal(node.parameters.jsCode, readCode(source._code[node.name].slice(5)));
  }
});

test('a flat n8n export splits and hydrates without changing its content', () => {
  const exported = JSON.parse(readFileSync(join(process.cwd(), 'exports', 'n8n', 'release-note-review.json'), 'utf8'));
  const { source, files } = splitWorkflow(exported);
  const hydrated = hydrateWorkflow(source, folder, (file) => files[`code/${file.split('/').at(-1)}`]);
  assert.deepEqual(hydrated, exported);
});

test('the wrong audience is blocked and the accurate beta note can proceed', () => {
  const cases = execute('load-synthetic-cases.js');
  for (const item of cases) {
    const expected = JSON.parse(readFileSync(join(process.cwd(), 'examples', `${item.json.case_id}.json`), 'utf8'));
    assert.deepEqual(JSON.parse(JSON.stringify(item.json.evidence)), expected.evidence);
    assert.deepEqual(JSON.parse(JSON.stringify(item.json.draft)), expected.draft);
  }
  const checked = execute('check-against-evidence.js', cases);
  const decisions = execute('prepare-decision-summary.js', checked);
  assert.equal(decisions.length, 2);
  assert.equal(decisions[0].json.decision, 'blocked');
  assert.equal(decisions[0].json.reason, 'audience_mismatch');
  assert.equal(decisions[1].json.decision, 'ready_for_delivery');
  assert.equal(decisions[1].json.delivery_enabled, false);
});

test('a new guide requires engineer review, even when its checks pass', () => {
  const fixture = JSON.parse(readFileSync(join(process.cwd(), 'examples', 'new_guide.json'), 'utf8'));
  const candidate = { json: { case_id: 'new_guide', ...fixture } };
  const checked = execute('check-against-evidence.js', [candidate]);
  assert.equal(checked[0].json.decision, 'engineer_review');
});

test('an unknown citation fails closed', () => {
  const candidate = execute('load-synthetic-cases.js')[1];
  candidate.json.draft.citations = ['https://example.invalid/unverified'];
  const checked = execute('check-against-evidence.js', [candidate]);
  assert.deepEqual(Array.from(checked[0].json.findings), ['unsupported_citation', 'missing_pr_evidence']);
});

test('candidate relay groups PRs, previews review actions and skips a repeated feature', () => {
  const report = JSON.parse(readFileSync(join(process.cwd(), 'examples', 'release_candidates.json'), 'utf8'));
  const first = prepareCandidates(report);
  assert.equal(first.delivery_enabled, false);
  assert.deepEqual(first.accepted.map((item) => item.feature_key), ['csv-export-pilot']);
  assert.deepEqual(first.accepted[0].prs, ['https://example.invalid/prs/41', 'https://example.invalid/prs/42']);
  assert.deepEqual(first.repeated, ['old-report']);
  assert.deepEqual(first.review_card_preview.blocks[2].elements.map((button) => button.action_id), [
    'candidate_announced', 'candidate_deferred', 'candidate_declined'
  ]);
  const second = prepareCandidates({ ...report, seen_keys: first.next_seen_keys });
  assert.equal(second.accepted.length, 0);
  assert.deepEqual(second.repeated, ['csv-export-pilot', 'old-report']);
});

test('candidate relay rejects an untrusted source and escapes message text', () => {
  const report = JSON.parse(readFileSync(join(process.cwd(), 'examples', 'release_candidates.json'), 'utf8'));
  assert.throws(() => prepareCandidates({ ...report, source: 'other-system' }), /Unexpected report source/);
  report.candidates[0].summary = 'Avoid <@someone> & verify the audience';
  const result = prepareCandidates(report);
  assert.match(result.review_card_preview.blocks[1].text.text, /&lt;@someone&gt; &amp; verify/);
});

test('the connected journey gives the relay the same two PRs and pilot scope used by the draft checks', () => {
  const journey = JSON.parse(readFileSync(join(process.cwd(), 'examples', 'release_journey.json'), 'utf8'));
  const preview = prepareCandidates(journey.report);
  assert.equal(preview.accepted.length, 1);
  const candidate = journey.report.candidates[0];
  assert.deepEqual(preview.accepted[0].prs, candidate.prs);
  assert.deepEqual(preview.accepted[0].availability.cohorts, candidate.availability.cohorts);
  assert.deepEqual(journey.drafts[0].citations, [candidate.prs[0]]);
});

test('review callback converts the fictional button into the saved command', () => {
  const payload = JSON.parse(readFileSync(join(process.cwd(), 'examples', 'candidate_review_action.json'), 'utf8'));
  const expected = JSON.parse(readFileSync(join(process.cwd(), 'examples', 'candidate_review_command.json'), 'utf8'));
  assert.deepEqual(normalizeReview(payload), expected);
});

test('review callback rejects unknown buttons and malformed reviewer identity', () => {
  const payload = JSON.parse(readFileSync(join(process.cwd(), 'examples', 'candidate_review_action.json'), 'utf8'));
  payload.body.payload.actions[0].action_id = 'candidate_publish';
  assert.throws(() => normalizeReview(payload), /Unknown review action/);
  payload.body.payload.actions[0].action_id = 'candidate_announced';
  payload.body.payload.user.id = '<@someone>';
  assert.throws(() => normalizeReview(payload), /Invalid reviewer/);
});
