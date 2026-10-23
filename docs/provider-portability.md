# Provider portability: implemented OpenAI, planned Claude

The core is reusable, not a claim that every provider integration works.

| Layer | Shared contract | OpenAI implementation | Claude mapping (not implemented) |
| --- | --- | --- | --- |
| Policy | Skill, version, task tier, model/effort recommendation | Notion connector export compiler | Export to Claude-compatible skills and agent configuration |
| Entry instructions | Short pointer to canonical policy | AGENTS.md plus optional local prompt hook | CLAUDE.md and skills |
| Execution | Explicit requested settings, action scope, result | Subscription-only local Codex summary runner | Claude Code CLI or Agent SDK adapter |
| Delegation | Bounded context, one worker, no repeated actions | Native worker procedure; automatic adoption unverified | Custom subagents with model and tool restrictions |
| Lifecycle | Runtime-specific events, thin handlers | UserPromptSubmit pointer handler | Claude Code hooks; validate event shape and trust separately |
| Usage | Qualified response IDs, parent/subset semantics, coverage | Read-only Codex plain/Zstandard log adapter | New Claude event/token normaliser; do not parse Claude data as Codex logs |
| Evaluation | Fixed checks, saved evidence, human calibration | Python/JavaScript fixtures and feedback guard | Reuse rubric and dataset; independently calibrate Claude judgments |
| Cost | Versioned rates and units, no missing-as-zero | Configurable rate-card arithmetic | Separate verified Claude rates and cache accounting |

The shared interface is policy -> execution plan -> provider adapter -> result/evidence -> evaluation. Authentication, supported model identifiers, effort controls, hooks, permissions and token semantics belong to each adapter. Renaming models does not implement portability.

## Proposed Claude acceptance

1. Confirm account access, permitted authentication and charging mode before any live call.
2. Implement a bounded adapter and synthetic event fixtures. Keep output identities and token subsets faithful to that provider.
3. Test identical frozen tasks against the same quality checks; record candidate and shared overhead separately.
4. Label Claude support tested only after actual execution, permission and usage checks pass. No Claude installation or live test is included in this release.

## Sources

- [Claude configuration methods](https://claude.com/resources/articles/steering-claude-code-skills-hooks-rules-subagents-and-more)
- [Claude Code subagents](https://code.claude.com/docs/en/sub-agents)
- [Claude Code hooks](https://code.claude.com/docs/en/hooks)
- [Programmatic Claude Code](https://code.claude.com/docs/en/headless)
- [Codex subagents](https://learn.chatgpt.com/docs/agent-configuration/subagents)
- [Codex hooks and cloud limits](https://learn.chatgpt.com/docs/hooks)

These documents establish supported building blocks, not successful integration in this repository.
