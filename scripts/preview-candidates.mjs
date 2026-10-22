import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { runInNewContext } from 'node:vm';

const inputPath = resolve(process.argv[2] ?? 'examples/release_candidates.json');
const codePath = join(process.cwd(), '.n8n', 'release-candidate-relay', 'code', 'prepare-candidate-review.js');
const input = JSON.parse(readFileSync(inputPath, 'utf8'));
const report = input.report ?? input;
const code = readFileSync(codePath, 'utf8');
const result = runInNewContext(`(() => { ${code} })()`, { $input: { all: () => [{ json: report }] } });
console.log(JSON.stringify(result[0].json, null, 2));
