// A read-only export boundary. The saved copy still needs human source review.
export async function readWorkflow({ baseUrl, apiKey, id, fetchImpl = fetch }) {
  if (!baseUrl || !/^https:\/\//.test(baseUrl)) throw new Error('An HTTPS n8n base URL is required');
  if (!apiKey) throw new Error('N8N_API_KEY is required');
  if (!id || !/^[A-Za-z0-9_-]+$/.test(id)) throw new Error('A safe workflow ID is required');
  const origin = new URL(baseUrl);
  if (origin.pathname !== '/' || origin.search || origin.hash || origin.username || origin.password) {
    throw new Error('Base URL must be an HTTPS origin without a path or user info');
  }
  const response = await fetchImpl(new URL(`/api/v1/workflows/${encodeURIComponent(id)}`, origin), {
    method: 'GET',
    headers: { 'X-N8N-API-KEY': apiKey }
  });
  if (!response.ok) throw new Error(`n8n workflow read returned HTTP ${response.status}`);
  const workflow = await response.json();
  if (workflow.id !== id || !workflow.name || !Array.isArray(workflow.nodes)) {
    throw new Error('n8n returned an unexpected workflow');
  }
  return workflow;
}

export function mirrorPreview(workflow) {
  // Remove obvious live-state and credential fields. Code and node parameters can
  // still carry sensitive values, so this result must never auto-commit to GitHub.
  return {
    name: workflow.name,
    active: false,
    nodes: workflow.nodes.map(({ credentials, ...node }) => node),
    connections: workflow.connections ?? {},
    settings: workflow.settings ?? {}
  };
}
