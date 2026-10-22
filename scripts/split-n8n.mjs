import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { hydrateWorkflow, splitWorkflow, stringifyWorkflow } from './n8n-lib.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const slugAt = args.indexOf('--slug');
const slug = slugAt >= 0 ? args[slugAt + 1] : undefined;
const input = args.find((arg, i) => !arg.startsWith('--') && i !== slugAt + 1);
if (!input || !slug || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
  throw new Error('Usage: node scripts/split-n8n.mjs <flat-export.json> --slug <safe-slug> [--dry-run]');
}
const exported = JSON.parse(readFileSync(resolve(input), 'utf8'));
const { source, files } = splitWorkflow(exported);
const folder = join(root, '.n8n', slug);
const roundTrip = hydrateWorkflow(source, folder, (file) => {
  const path = relative(folder, file);
  if (!Object.hasOwn(files, path)) throw new Error(`Missing generated Code file: ${path}`);
  return files[path];
});
if (JSON.stringify(roundTrip) !== JSON.stringify(exported)) {
  throw new Error('Split did not round-trip to the original n8n export');
}
if (dryRun) {
  console.log(`Verified split for ${slug}: ${Object.keys(files).length} Code-node files`);
} else {
  if (existsSync(folder)) throw new Error(`Workflow folder already exists: ${slug}`);
  mkdirSync(join(folder, 'code'), { recursive: true });
  writeFileSync(join(folder, 'workflow.json'), stringifyWorkflow(source));
  for (const [path, code] of Object.entries(files)) writeFileSync(join(folder, path), code);
  console.log(`Split ${slug}: ${Object.keys(files).length} Code-node files`);
}
