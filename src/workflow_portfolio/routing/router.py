"""Rules first, injected classifier second, validated route last. No network calls."""
import hashlib
import json
from dataclasses import asdict, dataclass
from typing import Callable, Optional

class RoutingError(ValueError):
    pass

@dataclass(frozen=True)
class Decision:
    skill: str
    skill_version: str
    tier: str
    model: str
    effort: str
    reason: str
    policy_digest: str
    execution_status: str = 'not_dispatched'

# The caller supplies a trusted task kind. User text is not a permission grant.
RULES = {'summarise_saved_text': ('summarisation', 'Low'),
         'compare_saved_evidence': ('analysis', 'Medium'),
         'draft_release_output': ('analysis', 'Low'),
         'draft_new_release_output': ('analysis', 'Medium'),
         'review_release_output': ('analysis', 'Low'),
         'review_new_release_output': ('analysis', 'Medium'),
         'review_security_output': ('analysis', 'Medium')}
TIERS = {'Low', 'Medium', 'High'}

def validate_policy(policy, capabilities):
    if policy.get('schema_version') != 1 or not policy.get('revision'):
        raise RoutingError('A versioned policy snapshot is required')
    if not isinstance(policy.get('skills'), dict) or not policy['skills']:
        raise RoutingError('No skill configuration')
    for name, skill in policy['skills'].items():
        if not isinstance(name, str) or not name or not isinstance(skill, dict):
            raise RoutingError('Invalid skill configuration')
        if type(skill.get('active')) is not bool or not skill.get('version'):
            raise RoutingError('Skill status and version required')
        routes = skill.get('routes')
        if not isinstance(routes, dict) or set(routes) != TIERS:
            raise RoutingError('Exactly Low, Medium and High routes required')
        for route in routes.values():
            if not isinstance(route, dict) or type(route.get('enabled')) is not bool:
                raise RoutingError('Explicit route availability required')
            if not route['enabled']:
                continue
            model, effort = route.get('model'), route.get('effort')
            if not isinstance(model, str) or not isinstance(effort, str):
                raise RoutingError('Model and effort required')
            if effort not in capabilities.get(model, []):
                raise RoutingError('Unsupported model/effort pair')
    return hashlib.sha256(json.dumps(policy, sort_keys=True, separators=(',', ':')).encode()).hexdigest()

def select_route(request, policy, capabilities, classifier: Optional[Callable] = None):
    digest = validate_policy(policy, capabilities)
    if not isinstance(request, dict) or not isinstance(request.get('text'), str) or not request['text'].strip():
        raise RoutingError('A nonempty request is required')
    if request.get('requires_write') is not False:
        raise RoutingError('This first pilot accepts explicitly read-only tasks only')
    task_kind = request.get('task_kind')
    if task_kind in RULES:
        skill_name, tier = RULES[task_kind]
        reason = 'fixed_rule:' + task_kind
    else:
        if classifier is None:
            raise RoutingError('Ambiguous task requires a configured classifier or human choice')
        # Only bounded classification data is accepted, not executable instructions.
        choice = classifier({'text': request['text'], 'allowed_skills': sorted(
            k for k, v in policy['skills'].items() if v['active']), 'allowed_tiers': sorted(TIERS)})
        if not isinstance(choice, dict) or set(choice) != {'skill', 'tier'}:
            raise RoutingError('Classifier must return exactly skill and tier')
        skill_name, tier = choice['skill'], choice['tier']
        if not isinstance(skill_name, str) or not isinstance(tier, str):
            raise RoutingError('Classifier values must be strings')
        reason = 'classifier_choice'
    skill = policy['skills'].get(skill_name)
    if not skill or not skill['active'] or tier not in TIERS:
        raise RoutingError('Inactive, unknown or invalid route')
    route = skill['routes'][tier]
    if not route['enabled']:
        raise RoutingError('Selected tier is disabled; do not substitute a model')
    return Decision(skill_name, skill['version'], tier, route['model'], route['effort'], reason, digest)

def retry_plan(decision, attempts, error_kind):
    if type(attempts) is not int or attempts < 1:
        raise RoutingError('Completed attempt count must be a positive integer')
    # No retry of permission denials, invalid input or uncertain side effects.
    if attempts >= 2 or error_kind not in {'timeout_before_dispatch', 'temporary_unavailable'}:
        return {'action': 'stop', 'reason': 'limit_or_nonretryable_failure'}
    return {'action': 'retry_same_route', 'next_attempt': 2, 'model': decision.model, 'effort': decision.effort}

def trace(decision):
    # No prompt, answer, account ID, secret or claimed runtime identity.
    return {'schema_version': 1, 'decision': asdict(decision), 'actual_model': None,
            'actual_effort': None, 'tokens': None, 'estimated_cost': None}
