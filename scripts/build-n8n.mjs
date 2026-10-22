import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const folder = join(root, '.n8n', 'release-note-review');
const template = JSON.parse(readFileSync(join(folder, 'workflow.template.json'), 'utf8'));
const mapping = JSON.parse(readFileSync(join(folder, 'code-map.json'), 'utf8'));
const codeNodes = template.nodes.filter((node) => node.type === 'n8n-nodes-base.code');

if (codeNodes.length !== Object.keys(mapping).length ||
    codeNodes.some((node) => !Object.hasOwn(mapping, node.name))) {
  throw new Error('Every Code node must have exactly one mapped source file');
}

for (const node of codeNodes) {
  const relative = mapping[node.name];
  if (!/^code\/[a-z0-9-]+\.js$/.test(relative)) throw new Error('Invalid Code-node path');
  const code = readFileSync(join(folder, relative), 'utf8');
  if (!code.trim()) throw new Error(`Empty Code node: ${node.name}`);
  node.parameters.jsCode = code;
}

const built = JSON.stringify(template, null, 2) + '\n';
const output = join(folder, 'workflow.json');
if (process.argv.includes('--check')) {
  if (readFileSync(output, 'utf8') !== built) {
    throw new Error('n8n export is stale. Run npm run n8n:build');
  }
  console.log('n8n export matches its Code-node sources');
} else {
  writeFileSync(output, built);
  console.log('Built importable n8n workflow');
}
