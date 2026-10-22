import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { runInNewContext } from 'node:vm';

const fixture = process.argv[2];
if (!fixture) throw new Error('Usage: node scripts/preview-review-action.mjs examples/candidate_review_action.json');
const input = JSON.parse(readFileSync(resolve(fixture), 'utf8'));
const code = readFileSync(new URL('../.n8n/candidate-review-callback/code/normalize-review-action.js', import.meta.url), 'utf8');
const output = runInNewContext(`(() => { ${code} })()`, { $input: { all: () => [{ json: input }] } });
process.stdout.write(`${JSON.stringify(output[0].json, null, 2)}\n`);
