# AI Asset Operating Protocol

This protocol applies when creating or changing repository instructions,
agents, skills, prompts, extensions, memory, or Copilot configuration.

## Evidence

- Read live source before encoding a repository fact or executable rule.
- Cite the file or command outcome behind behavior claims.
- Do not treat an asset file as proof that a surface loaded it.

## RFC Grounding

- Use accepted RFCs for architectural intent.
- Use live source and configuration for current behavior.
- Report material drift with file evidence.
- Ask only when resolving drift changes behavior or crosses a risk boundary.

## Risk Escalation

Root `AGENTS.md` owns the repository-wide risk boundaries. Apply them to AI
assets without copying the list here. In particular, an extension or MCP
change does not bypass the dependency, security, infrastructure, destructive,
or public-behavior checkpoint merely because the changed file is
configuration or documentation.

## Completion

- Use the smallest existing check that proves the changed behavior.
- Do not claim success without command or file evidence.
- Disclose only material assumptions, residual risk, incomplete validation, or
  blockers.
- Return explicit failures rather than success-shaped fallbacks.

## Event-Driven Updates

The change that invalidates guidance updates the one owning layer:

| Trigger | Owner |
| --- | --- |
| Runtime/framework version | Root `AGENTS.md` version table |
| Build/test command | Root command contract and the one invoking skill |
| Architecture/RFC | Owning RFC and affected path instruction |
| Copilot schema/capability | Affected agent, skill, prompt, or extension |
| Recurring agent mistake | Source pattern or one narrow owning rule |
| Extension failure | That extension and troubleshooting guidance |
| First-class surface change | Customization guide and that surface adapter |

Do not add calendar review metadata or copy a correction across unrelated
assets. Git history records when an asset changed.

## Asset Ownership

- Instructions own constraints.
- Agents own domain routing.
- Skills own repeatable workflows.
- Prompts own local shortcuts.
- Extensions own optional CLI acceleration.
- Memory owns durable context that is not derivable from source.

One fact or workflow has one owner.
