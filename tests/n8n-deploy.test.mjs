import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { deploymentPayload, planDeployment, deployWorkflow } from '../scripts/n8n-deploy-lib.mjs';

const source = JSON.parse(readFileSync('exports/n8n/release-candidate-relay.json', 'utf8'));

test('deployment plan strips export-only fields and never activates a workflow', () => {
  const plan = planDeployment(source, []);
  assert.equal(plan.action, 'create_inactive');
  assert.deepEqual(Object.keys(plan.payload), ['name', 'nodes', 'connections', 'settings']);
  assert.equal(Object.hasOwn(plan.payload, 'active'), false);
  assert.equal(Object.hasOwn(plan.payload, 'pinData'), false);
});

test('deployment refuses ambiguous, archived and active remote matches', () => {
  const match = { id: 'wf-1', name: source.name, active: false };
  assert.throws(() => planDeployment(source, [match, match]), /More than one/);
  assert.throws(() => planDeployment(source, [{ ...match, isArchived: true }]), /archived/);
  assert.throws(() => planDeployment(source, [{ ...match, active: true }]), /active/);
  assert.throws(() => deploymentPayload({ ...source, active: true }), /inactive/);
});

test('deployment needs an exact expectation and makes no write when it differs', async () => {
  const calls = [];
  const fakeFetch = async (url, init) => {
    calls.push({ url: String(url), method: init.method });
    return { ok: true, json: async () => ({ data: [] }) };
  };
  await assert.rejects(deployWorkflow(source, {
    baseUrl: 'https://example.invalid', apiKey: 'fake', expectation: 'wf-1', fetchImpl: fakeFetch
  }), /no write made/);
  assert.deepEqual(calls.map((call) => call.method), ['GET']);
});

test('create remains inactive and is read back before success is returned', async () => {
  const calls = [];
  const fakeFetch = async (url, init) => {
    const path = new URL(url).pathname;
    calls.push({ path, method: init.method });
    const body = init.method === 'POST'
      ? { id: 'wf-1', name: source.name, active: false }
      : path.endsWith('/wf-1')
        ? { id: 'wf-1', name: source.name, active: false }
        : { data: [] };
    return { ok: true, json: async () => body };
  };
  const result = await deployWorkflow(source, {
    baseUrl: 'https://example.invalid', apiKey: 'fake', expectation: 'create', fetchImpl: fakeFetch
  });
  assert.equal(result.active, false);
  assert.deepEqual(calls.map((call) => call.method), ['GET', 'POST', 'GET']);
});

test('an update refuses remote credentials before replacing anything', async () => {
  const calls = [];
  const fakeFetch = async (url, init) => {
    calls.push(init.method);
    const body = new URL(url).pathname.endsWith('/wf-1')
      ? { id: 'wf-1', name: source.name, active: false, nodes: [{ credentials: { slackApi: { id: 'a' } } }] }
      : { data: [{ id: 'wf-1', name: source.name, active: false }] };
    return { ok: true, json: async () => body };
  };
  await assert.rejects(deployWorkflow(source, {
    baseUrl: 'https://example.invalid', apiKey: 'fake', expectation: 'wf-1', fetchImpl: fakeFetch
  }), /state or credentials/);
  assert.deepEqual(calls, ['GET', 'GET']);
});
