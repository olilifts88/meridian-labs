import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mirrorPreview, readWorkflow } from '../scripts/n8n-mirror-lib.mjs';

test('mirror calls only a read endpoint and leaves live state out of the preview', async () => {
  const calls = [];
  const original = {
    id: 'wf-1', name: 'Fictional workflow', active: true,
    staticData: { cursor: 'private' },
    nodes: [{ name: 'Read', credentials: { token: { id: 'private' } }, parameters: {} }],
    connections: {}, settings: {}
  };
  const workflow = await readWorkflow({
    baseUrl: 'https://example.invalid', apiKey: 'fake', id: 'wf-1',
    fetchImpl: async (url, init) => {
      calls.push({ path: new URL(url).pathname, method: init.method });
      return { ok: true, json: async () => original };
    }
  });
  assert.deepEqual(calls, [{ path: '/api/v1/workflows/wf-1', method: 'GET' }]);
  const preview = mirrorPreview(workflow);
  assert.equal(preview.active, false);
  assert.equal(Object.hasOwn(preview, 'staticData'), false);
  assert.equal(Object.hasOwn(preview.nodes[0], 'credentials'), false);
});

test('mirror rejects an unexpected ID and unsafe ID characters', async () => {
  await assert.rejects(readWorkflow({
    baseUrl: 'https://example.invalid', apiKey: 'fake', id: '../other'
  }), /safe workflow ID/);
  await assert.rejects(readWorkflow({
    baseUrl: 'https://example.invalid', apiKey: 'fake', id: 'wf-1',
    fetchImpl: async () => ({ ok: true, json: async () => ({ id: 'other', name: 'Wrong', nodes: [] }) })
  }), /unexpected workflow/);
});
