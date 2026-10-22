import { readFileSync } from 'node:fs';
import { resolve, sep } from 'node:path';

const CODE_TYPE = 'n8n-nodes-base.code';
const SAFE_CODE_PATH = /^code\/[a-z0-9-]+\.js$/;

function codeNodes(workflow) {
  return (workflow.nodes ?? []).filter((node) => node.type === CODE_TYPE);
}

function validateMapping(workflow) {
  const mapping = workflow._code;
  if (!mapping || typeof mapping !== 'object' || Array.isArray(mapping)) {
    throw new Error('Workflow needs an in-file _code map');
  }
  const nodes = codeNodes(workflow);
  const names = nodes.map((node) => node.name);
  if (new Set(names).size !== names.length) throw new Error('Duplicate Code-node name');
  if (names.length !== Object.keys(mapping).length || names.some((name) => !Object.hasOwn(mapping, name))) {
    throw new Error('Every Code node must have exactly one mapped source file');
  }
  if (Object.values(mapping).some((path) => typeof path !== 'string' || !SAFE_CODE_PATH.test(path))) {
    throw new Error('Code-node source path must be code/<safe-name>.js');
  }
  if (new Set(Object.values(mapping)).size !== names.length) throw new Error('Code-node sources must be unique');
  for (const node of nodes) {
    if (node.parameters?.jsCode !== '') throw new Error(`Source Code node must have blank jsCode: ${node.name}`);
  }
  return mapping;
}

export function hydrateWorkflow(source, folder, loadCode = (file) => readFileSync(file, 'utf8')) {
  const mapping = validateMapping(source);
  const hydrated = structuredClone(source);
  delete hydrated._code;
  for (const node of codeNodes(hydrated)) {
    const file = resolve(folder, mapping[node.name]);
    if (!file.startsWith(resolve(folder) + sep)) throw new Error('Code path escapes workflow folder');
    const code = loadCode(file);
    if (!code.trim()) throw new Error(`Empty Code node: ${node.name}`);
    node.parameters.jsCode = code;
  }
  return hydrated;
}

export function splitWorkflow(exported) {
  if (exported._code) throw new Error('Expected an n8n export without _code');
  const source = structuredClone(exported);
  const mapping = {};
  const files = {};
  for (const node of codeNodes(source)) {
    const code = node.parameters?.jsCode;
    if (typeof code !== 'string' || !code.trim()) throw new Error(`Missing code in ${node.name}`);
    const slug = node.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    if (!slug) throw new Error('Code node needs a safe name');
    const path = `code/${slug}.js`;
    if (Object.values(mapping).includes(path)) throw new Error(`Duplicate Code-node slug: ${slug}`);
    mapping[node.name] = path;
    files[path] = code;
    node.parameters.jsCode = '';
  }
  source._code = mapping;
  validateMapping(source);
  return { source, files };
}

export function stringifyWorkflow(workflow) {
  return `${JSON.stringify(workflow, null, 2)}\n`;
}
