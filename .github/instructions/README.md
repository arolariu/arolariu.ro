# Copilot Instructions Directory

> **Quick Start**: Copilot automatically loads relevant instructions based on the file you're editing. No action needed.

## Quick Reference Table

| File | Name | Applies To | Use When |
|------|------|-----------|----------|
| `frontend.instructions.md` | Frontend Development | `sites/arolariu.ro/**` | Working on Next.js website |
| `backend.instructions.md` | Backend Architecture | `**/*.cs, **/*.csproj` | Writing .NET backend code |
| `react.instructions.md` | React Patterns | `**/*.tsx, **/*.jsx` | React component development |
| `typescript.instructions.md` | TypeScript Standards | `**/*.ts` | TypeScript utility/type code |
| `csharp.instructions.md` | C# Coding Standards | `**/*.cs` | C# language patterns |
| `components.instructions.md` | Component Library | `packages/components/**` | Shared UI component work |
| `bicep.instructions.md` | Azure Bicep IaC | `**/*.bicep` | Azure infrastructure code |
| `workflows.instructions.md` | GitHub Actions Workflows | `.github/workflows/*.yml` | CI/CD pipeline changes |
| `code-review.instructions.md` | Code Review Guidelines | `**` | All code reviews |

## How Instructions Work

Each file has YAML frontmatter with `applyTo` patterns. Copilot auto-loads matching instructions when you edit files.

```yaml
---
version: "1.1.0"
lastUpdated: "2026-02-09"
name: 'Display Name'
description: 'Brief description of what these instructions cover'
applyTo: 'pattern/**/*.ext'
---
```

### Frontmatter Properties

| Property | Required | Purpose |
|----------|----------|---------|
| `description` | Yes | Brief explanation (shown in UI) |
| `applyTo` | Yes | Glob pattern for file matching |
| `name` | No | Display name (defaults to filename) |
| `version` | No | Semantic version for tracking changes |
| `lastUpdated` | No | Date of last update |

## Related Resources

### AI Customization Files

| Type | Location | Purpose |
|------|----------|---------|
| **Instructions** | `.github/instructions/*.instructions.md` | Auto-loaded by file pattern (this directory) |
| **Agents** | `.github/agents/*.agent.md` | Specialized AI personas |
| **Prompts** | `.github/prompts/*.prompt.md` | Reusable task templates |
| **Skills** | `.github/skills/*/SKILL.md` | Scaffolding with bundled templates |
| **Root Guide** | `AGENTS.md` / `CLAUDE.md` | Global project guidance |
| **Copilot Root** | `.github/copilot-instructions.md` | Monorepo-wide Copilot context |

### Architecture References

| Resource | Purpose | When to Consult |
|----------|---------|-----------------|
| `docs/rfc/1xxx-*.md` | Frontend architecture decisions | Frontend features |
| `docs/rfc/2xxx-*.md` | Backend architecture decisions | Backend features |
| `docs/frontend/README.md` | Frontend implementation details | Component patterns |
| `docs/backend/README.md` | Backend implementation details | Domain modeling |

## Adding New Instructions

1. Create `<topic>.instructions.md` in this directory (lowercase with hyphens)
2. Add YAML frontmatter with required fields: `description`, `applyTo`
3. Add recommended fields: `name`, `version`, `lastUpdated`
4. Document key patterns with actionable DO/DON'T code examples
5. Update this README with the new file entry

## File Naming

Pattern: `<topic>.instructions.md` (e.g., `backend.instructions.md`)

Best practices:
- **Be specific**: Focus on patterns unique to that domain
- **Cross-reference**: Link to main instructions and RFCs for broader context
- **Include examples**: Provide code samples showing correct patterns
- **Add DO/DON'T pairs**: Side-by-side good vs bad examples are most effective
- **Document rationale**: Explain why certain approaches are preferred
- **Keep updated**: Maintain instructions as the codebase evolves

## Resources

- [GitHub Copilot Instructions Documentation](https://docs.github.com/en/copilot/customizing-copilot/adding-custom-instructions-for-github-copilot)
- [How to Write a Great AGENTS.md](https://github.blog/ai-and-ml/github-copilot/how-to-write-a-great-agents-md-lessons-from-over-2500-repositories/)
- [Custom Agents Configuration Reference](https://docs.github.com/en/copilot/reference/custom-agents-configuration)
- [Agent Skills Specification](https://code.visualstudio.com/docs/copilot/customization/agent-skills)
- [Prompt Files Guide](https://code.visualstudio.com/docs/copilot/customization/prompt-files)
