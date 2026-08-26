---
name: Agent Asset Governance
description: Rules unique to repository AI instructions, agents, skills, prompts, extensions, memory, and Copilot configuration.
applyTo: ".github/**/*.md,.github/extensions/**/*.mjs,.github/memory/**/*.json,.github/mcp.json"
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
