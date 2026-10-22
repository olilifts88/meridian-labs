import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { hydrateWorkflow, stringifyWorkflow } from './n8n-lib.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const workflowRoot = join(root, '.n8n');
const outputRoot = join(root, 'exports', 'n8n');
const check = process.argv.includes('--check');
let count = 0;

for (const entry of readdirSync(workflowRoot, { withFileTypes: true })) {
  if (!entry.isDirectory()) continue;
  const folder = join(workflowRoot, entry.name);
  const source = JSON.parse(readFileSync(join(folder, 'workflow.json'), 'utf8'));
  const built = stringifyWorkflow(hydrateWorkflow(source, folder));
  const output = join(outputRoot, `${entry.name}.json`);
  if (check) {
    if (readFileSync(output, 'utf8') !== built) {
      throw new Error(`n8n export is stale: ${entry.name}. Run npm run n8n:build`);
    }
  } else {
    mkdirSync(outputRoot, { recursive: true });
    writeFileSync(output, built);
  }
  count++;
}
if (!count) throw new Error('No n8n workflows found');
console.log(check ? `Checked ${count} n8n exports` : `Built ${count} importable n8n exports`);
