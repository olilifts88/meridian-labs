import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { mirrorPreview, readWorkflow } from './n8n-mirror-lib.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const option = (name) => {
  const index = args.indexOf(name);
  return index < 0 ? undefined : args[index + 1];
};
const id = option('--workflow-id');
const workflow = await readWorkflow({
  baseUrl: option('--base-url'), apiKey: process.env.N8N_API_KEY, id
});
const preview = mirrorPreview(workflow);
const outputDir = join(root, 'local-mirror');
mkdirSync(outputDir, { recursive: true });
const file = join(outputDir, `${id}.json`);
writeFileSync(file, `${JSON.stringify(preview, null, 2)}\n`, { flag: 'w', mode: 0o600 });
console.log(JSON.stringify({
  source_id: id, name: preview.name, node_count: preview.nodes.length,
  saved_to: file, read_only_api: true, committed_to_github: false,
  warning: 'Review Code-node text and parameters before copying anything into Git'
}, null, 2));
