// Shape check only. A real Slack callback also needs signature verification
// before n8n receives it. This workflow never writes a decision or publishes.
const items = $input.all();
if (items.length !== 1) throw new Error('Expected one review callback');
const envelope = items[0].json.body ?? items[0].json;
let payload = envelope.payload ?? envelope;
if (typeof payload === 'string') {
  if (payload.length > 10000) throw new Error('Review payload is too large');
  try { payload = JSON.parse(payload); } catch { throw new Error('Invalid review payload'); }
}
if (!payload || payload.type !== 'block_actions' || !Array.isArray(payload.actions) || payload.actions.length !== 1) {
  throw new Error('Expected one button action');
}
const action = payload.actions[0];
const decisions = {
  candidate_announced: 'announced',
  candidate_deferred: 'deferred',
  candidate_declined: 'declined'
};
if (!Object.hasOwn(decisions, action.action_id)) throw new Error('Unknown review action');
if (typeof action.value !== 'string' || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(action.value)) {
  throw new Error('Invalid candidate key');
}
if (typeof payload.user?.id !== 'string' || !/^[A-Z0-9_]{2,40}$/.test(payload.user.id)) {
  throw new Error('Invalid reviewer');
}
if (typeof action.action_ts !== 'string' || !/^[0-9]{10,16}\.[0-9]{1,8}$/.test(action.action_ts)) {
  throw new Error('Invalid action timestamp');
}
return [{ json: {
  event_id: `${payload.user.id}:${action.action_ts}`,
  feature_key: action.value,
  decision: decisions[action.action_id],
  reviewer: payload.user.id,
  applied: false
} }];
