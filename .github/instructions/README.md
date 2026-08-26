# Copilot Path Instructions

Copilot loads matching `*.instructions.md` files by `applyTo` path. Each file
owns one narrow concern and inherits root `AGENTS.md` plus
`.github/copilot-instructions.md`.

## Ownership

| File | Owns |
| --- | --- |
| `typescript.instructions.md` | TypeScript language and type-system rules |
| `react.instructions.md` | React component, hook, and state-lifetime semantics |
| `frontend.instructions.md` | Next.js website architecture |
| `csharp.instructions.md` | C# language, nullable, docs, and async rules |
| `backend.instructions.md` | API DDD and The Standard |
| `components.instructions.md` | Shared component-library constraints |
| `bicep.instructions.md` | Azure Bicep conventions |
| `workflows.instructions.md` | GitHub Actions conventions |
| `python.instructions.md` | Experimental-service Python rules |
| `svelte.instructions.md` | CV Svelte rules |
| `agent-governance.instructions.md` | AI asset rules |

Review behavior belongs to `.github/agents/code-reviewer.agent.md`; it is not a
globally applied instruction.

## Required Frontmatter

```yaml
---
name: Narrow Display Name
description: What this file uniquely governs.
applyTo: "path/**/*.ext"
---
```

Do not add version or review-date metadata.

## Authoring Rules

- Keep only rules unique to the matched files.
- Reference root or local guides for facts and commands.
- Reference accepted RFCs rather than reproducing them.
- Prefer concise invariants over tutorials and static implementation
  templates.
- Follow `.github/agent-governance/operating-protocol.md`.

## Product References

- [GitHub custom instructions](https://docs.github.com/en/copilot/customizing-copilot/adding-custom-instructions-for-github-copilot)
- [Custom agents](https://docs.github.com/en/copilot/reference/custom-agents-configuration)
- [Agent Skills](https://code.visualstudio.com/docs/agent-customization/agent-skills)
- [Prompt files](https://code.visualstudio.com/docs/agent-customization/prompt-files)
