"""Provider-independent direct-first planning. This module never starts a model."""
from dataclasses import dataclass
from .router import RoutingError

@dataclass(frozen=True)
class ExecutionPlan:
    method: str
    reason: str
    actual_model: object = None
    actual_effort: object = None

def plan_execution(*, bounded, worker_available, worker_reason=None, prohibit_workers=False,
                   inherit_current=False, observed_model=None, observed_effort=None):
    """The coordinator supplies assessed task facts; text is not a permission grant."""
    for value in (bounded, worker_available, prohibit_workers, inherit_current):
        if type(value) is not bool:
            raise RoutingError('Explicit boolean capability and scope facts required')
    allowed = {'capability_needed', 'diagnosed_quality_gap', 'bounded_delegation_benefit'}
    if worker_reason is not None and worker_reason not in allowed:
        raise RoutingError('A concrete delegation reason is required')
    evidence = {'actual_model': observed_model, 'actual_effort': observed_effort}
    if prohibit_workers or inherit_current:
        return ExecutionPlan('direct', 'no_worker_scope' if prohibit_workers else 'inherited_route', **evidence)
    if worker_reason and worker_available:
        return ExecutionPlan('delegate', worker_reason, **evidence)
    if worker_reason == 'capability_needed' and not worker_available:
        return ExecutionPlan('blocked', 'required_worker_capability_unavailable', **evidence)
    return ExecutionPlan('direct', 'bounded_task' if bounded else 'current_execution_suitable', **evidence)
