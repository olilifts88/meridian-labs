// A deliberately narrow deployment boundary for the two fictional workflows.
// Nothing in this module contacts n8n unless deployWorkflow is explicitly called.
const SETTINGS = new Set([
  'executionOrder', 'saveManualExecutions', 'callerPolicy', 'errorWorkflow',
  'timezone', 'saveExecutionProgress', 'saveDataSuccessExecution',
  'saveDataErrorExecution'
]);

export function deploymentPayload(workflow) {
  if (!workflow || typeof workflow.name !== 'string' || !workflow.name.trim()) {
    throw new Error('Workflow needs a name');
  }
  if (workflow.active) throw new Error('Source workflow must be inactive');
  if (!Array.isArray(workflow.nodes) || !workflow.nodes.length) {
    throw new Error('Workflow needs nodes');
  }
  if (workflow.nodes.some((node) => node.credentials && Object.keys(node.credentials).length)) {
    throw new Error('Credential references must be configured in n8n, not deployed from this repo');
  }
  const settings = {};
  for (const [key, value] of Object.entries(workflow.settings ?? {})) {
    if (SETTINGS.has(key)) settings[key] = value;
  }
  return {
    name: workflow.name,
    nodes: workflow.nodes.map((node) => ({
      ...node,
      position: (node.position ?? [0, 0]).map((value) =>
        typeof value === 'number' && Number.isFinite(value) ? value : 0)
    })),
    connections: workflow.connections ?? {},
    settings
  };
}

export function planDeployment(source, remoteWorkflows) {
  const payload = deploymentPayload(source);
  if (!Array.isArray(remoteWorkflows)) throw new Error('Remote workflows must be an array');
  const matches = remoteWorkflows.filter((workflow) => workflow.name === payload.name);
  if (matches.length > 1) throw new Error('More than one remote workflow has this name');
  const existing = matches[0];
  if (!existing) return { action: 'create_inactive', name: payload.name, expectedId: null, payload };
  if (existing.isArchived) throw new Error('Matching remote workflow is archived');
  if (existing.active) throw new Error('Matching remote workflow is active; refusing to change a running workflow');
  if (typeof existing.id !== 'string' || !existing.id) throw new Error('Remote workflow has no ID');
  return { action: 'update_inactive', name: payload.name, expectedId: existing.id, payload };
}

export async function deployWorkflow(source, { baseUrl, apiKey, expectation, fetchImpl = fetch }) {
  if (!baseUrl || !/^https:\/\//.test(baseUrl)) throw new Error('An HTTPS n8n base URL is required');
  if (!apiKey) throw new Error('N8N_API_KEY is required');
  if (!expectation) throw new Error('Explicit create or remote workflow ID expectation is required');
  const origin = new URL(baseUrl);
  if (origin.pathname !== '/' || origin.search || origin.hash || origin.username || origin.password) {
    throw new Error('Base URL must be an HTTPS origin without a path or user info');
  }
  const request = async (method, path, body) => {
    const response = await fetchImpl(new URL(`/api/v1${path}`, origin), {
      method,
      headers: { 'X-N8N-API-KEY': apiKey, 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body)
    });
    if (!response.ok) throw new Error(`n8n ${method} ${path} returned HTTP ${response.status}`);
    return response.json();
  };
  const remote = [];
  let cursor;
  for (let page = 0; page < 20; page++) {
    const path = `/workflows?limit=250${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ''}`;
    const listing = await request('GET', path);
    if (!Array.isArray(listing.data)) throw new Error('Unexpected n8n workflow list response');
    remote.push(...listing.data);
    cursor = listing.nextCursor;
    if (!cursor) break;
    if (page === 19) throw new Error('n8n workflow list exceeded 20 pages');
  }
  const plan = planDeployment(source, remote);
  if (expectation !== (plan.expectedId ?? 'create')) {
    throw new Error('Remote state changed or expected workflow ID does not match; no write made');
  }
  if (plan.action === 'update_inactive') {
    const current = await request('GET', `/workflows/${encodeURIComponent(plan.expectedId)}`);
    if (current.id !== plan.expectedId || current.name !== plan.name || current.active || current.isArchived) {
      throw new Error('Remote workflow changed before update; no write made');
    }
    if (current.staticData || current.nodes?.some((node) => node.credentials && Object.keys(node.credentials).length)) {
      throw new Error('Remote workflow has state or credentials; inspect it before replacing');
    }
  }
  const result = plan.action === 'create_inactive'
    ? await request('POST', '/workflows', plan.payload)
    : await request('PUT', `/workflows/${encodeURIComponent(plan.expectedId)}`, plan.payload);
  if (!result?.id || result.name !== plan.name || result.active) {
    throw new Error('n8n write returned an unexpected workflow state; inspect it before retrying');
  }
  const saved = await request('GET', `/workflows/${encodeURIComponent(result.id)}`);
  if (saved.name !== plan.name || saved.active || saved.id !== result.id) {
    throw new Error('n8n verification failed; inspect the workflow before retrying');
  }
  return { action: plan.action, id: result.id, name: plan.name, active: false };
}
