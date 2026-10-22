import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { hydrateWorkflow } from './n8n-lib.mjs';
import { deployWorkflow, planDeployment } from './n8n-deploy-lib.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const option = (name) => {
  const index = args.indexOf(name);
  return index < 0 ? undefined : args[index + 1];
};
const slug = option('--workflow');
const apply = args.includes('--apply');
if (!slug || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
  throw new Error('Choose one safe workflow folder with --workflow <name>');
}
const folder = resolve(root, '.n8n', slug);
const source = hydrateWorkflow(JSON.parse(readFileSync(resolve(folder, 'workflow.json'), 'utf8')), folder);
if (!apply) {
  const snapshotPath = option('--remote-snapshot');
  const remote = snapshotPath ? JSON.parse(readFileSync(resolve(snapshotPath), 'utf8')) : [];
  const plan = planDeployment(source, remote);
  console.log(JSON.stringify({
    mode: 'offline preview', action: plan.action, name: plan.name,
    expected_remote_id: plan.expectedId, node_count: plan.payload.nodes.length,
    writes_made: false
  }, null, 2));
} else {
  if (option('--remote-snapshot')) throw new Error('Cannot apply from a saved remote snapshot');
  const expectation = option('--expect');
  const baseUrl = option('--base-url');
  const result = await deployWorkflow(source, {
    baseUrl, apiKey: process.env.N8N_API_KEY, expectation
  });
  console.log(JSON.stringify({ ...result, verified: true }, null, 2));
}
