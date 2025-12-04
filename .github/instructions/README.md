# Copilot Instructions Directory

> **Quick Start**: Copilot automatically loads relevant instructions based on the file you're editing. No action needed.

## Quick Reference Table

| File | Applies To | Use When |
|------|-----------|----------|
| `frontend.instructions.md` | `sites/arolariu.ro/**` | Working on Next.js website |
| `backend.instructions.md` | `**/*.cs, **/*.csproj` | Writing .NET backend code |
| `react.instructions.md` | `**/*.tsx, **/*.jsx` | React component development |
| `typescript.instructions.md` | `**/*.ts` | TypeScript utility/type code |
| `bicep.instructions.md` | `**/*.bicep` | Azure infrastructure code |
| `workflows.instructions.md` | `.github/workflows/*.yml` | CI/CD pipeline changes |
| `code-review.instructions.md` | `**` | All code reviews |

## How Instructions Work

Each file has YAML frontmatter with `applyTo` patterns. Copilot auto-loads matching instructions when you edit files.

```yaml
---
applyTo: 'pattern/**/*.ext'
description: 'Brief description'
---
```

## Essential Resources

| Resource | Purpose | When to Consult |
|----------|---------|-----------------|
| `.github/copilot-instructions.md` | Monorepo-wide guidelines | Starting any new work |
| `docs/rfc/1xxx-*.md` | Frontend architecture decisions | Frontend features |
| `docs/rfc/2xxx-*.md` | Backend architecture decisions | Backend features |
| `docs/frontend/README.md` | Frontend implementation details | Component patterns |
| `docs/backend/README.md` | Backend implementation details | Domain modeling |

## Adding New Instructions

1. Create `<topic>.instructions.md` in this directory
2. Add frontmatter: `applyTo`, `description`
3. Document key patterns with actionable examples
4. Update this README

## File Naming

Pattern: `<topic>.instructions.md` (e.g., `backend.instructions.md`)

When writing instruction files:

- **Be specific**: Focus on patterns and practices unique to that domain
- **Cross-reference**: Link to main instructions and RFCs for broader context
- **Include examples**: Provide code samples showing correct patterns
- **Document rationale**: Explain why certain approaches are preferred
- **Keep updated**: Maintain instructions as the codebase evolves

## Resources

- [GitHub Copilot Instructions Documentation](https://docs.github.com/en/copilot/customizing-copilot/adding-custom-instructions-for-github-copilot)
- [Best Practices for Copilot Coding Agent](https://gh.io/copilot-coding-agent-tips)
- Main repository guidelines: `.github/copilot-instructions.md`
