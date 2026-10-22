import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { runInNewContext } from 'node:vm';

const folder = join(process.cwd(), '.n8n', 'release-note-review');
const readCode = (name) => readFileSync(join(folder, 'code', name), 'utf8');
const execute = (name, input = []) => runInNewContext(`(() => { ${readCode(name)} })()`, {
  $input: { all: () => input }
});

test('the exported workflow embeds every mapped Code-node file', () => {
  const workflow = JSON.parse(readFileSync(join(folder, 'workflow.json'), 'utf8'));
  const mapping = JSON.parse(readFileSync(join(folder, 'code-map.json'), 'utf8'));
  assert.equal(workflow.active, false);
  for (const node of workflow.nodes.filter((item) => item.type === 'n8n-nodes-base.code')) {
    assert.equal(node.parameters.jsCode, readCode(mapping[node.name].slice(5)));
  }
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
