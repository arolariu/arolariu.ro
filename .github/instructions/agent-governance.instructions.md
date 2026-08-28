---
name: Agent Asset Governance
description: Rules unique to repository AI instructions, agents, skills, prompts, extensions, memory, and Copilot configuration.
applyTo: "**/AGENTS.md,CLAUDE.md,.github/CODEOWNERS,.github/copilot-instructions.md,.github/agent-governance/**/*.md,.github/agents/*.agent.md,.github/docs/ai-customization-guide.md,.github/extensions/**/*.mjs,.github/instructions/**/*.md,.github/memory/**/*.json,.github/mcp.json,.github/prompts/*.prompt.md,.github/skills/**/*.md"
---

# Agent Asset Governance

## Scope

Applies only to repository AI customization and its security-sensitive
configuration.

## Required Inputs

- Root `AGENTS.md`
- `.github/agent-governance/operating-protocol.md`
- `.github/agent-governance/threat-model.md`
- Live source/configuration behind every encoded fact
- Current product documentation for changed Copilot metadata or SDK APIs

## Execution Constraints

- Give each fact, rule, workflow, and tool one owning asset.
- Reference root versions, commands, architecture, and risk rules instead of
  copying them.
- Keep agents focused on role and routing.
- Keep skills focused on one repeatable workflow.
- Keep prompts as thin local shortcuts.
- Keep extensions optional to static safety and correctness.
- Keep memory free of versions, commands, counts, architecture snapshots,
  discoverable paths, secrets, and task state.
- Do not use stale model pins, arbitrary shell tools, `approveAll`, implicit
  unmatched permission approval, or success-shaped failures.
- Do not add `version`, `lastUpdated`, or `lastReviewed` metadata to AI assets.

## Reference Catalog

Open `references/agent-governance.md` only when the task needs one of:

- deciding which owning asset type (instruction, agent, skill, prompt,
  extension, or memory) owns a concern, or whether it belongs in a subordinate
  instruction catalog or MCP client configuration;
- a frontmatter shape question for an instruction, agent, skill, or prompt;
- confirming a one-owner placement, or correcting an asset that duplicates
  another asset's owned fact;
- writing or reviewing a progressive-disclosure trigger for a skill resource
  or instruction catalog;
- an extension/MCP threat-boundary question (read-only tools, bounded context
  injection, native permissions/sandboxing, allowlist scope);
- a memory-policy question about whether a proposed entry is source-derived;
- a prompt-versus-skill boundary question;
- verifying runtime health evidence for an extension beyond source presence.

The catalog does not redefine these rules, the operating protocol, or the
threat model; it only adds repository-specific examples and corrections.

## Validation

- Check frontmatter shape and referenced paths.
- Search for copied volatile facts and inherited governance blocks.
- Run Node tests for extension behavior.
- Verify extension runtime health separately from source presence.
- Run `git --no-pager diff --check` and inspect the scoped diff.

## Escalation

Stop for dependency, security, auth, schema, infrastructure, workflow,
destructive, or unresolved behavior decisions. Follow the operating protocol
for source/RFC drift and material uncertainty.
