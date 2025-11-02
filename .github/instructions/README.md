# Copilot Instructions Directory

This directory contains specialized instruction files that provide context-specific guidance for different parts of the arolariu.ro monorepo. GitHub Copilot automatically applies these instructions when you work on files matching the specified patterns.

## How It Works

Each instruction file includes YAML frontmatter with an `applyTo` field that specifies which files the instructions apply to. When you edit a file matching that pattern, Copilot loads the corresponding instruction file to provide relevant best practices, coding standards, and architectural guidance.

## Available Instruction Files

### Workflow Instructions
- **File**: `workflows.instructions.md`
- **Applies To**: `.github/workflows/*.yml`
- **Description**: Comprehensive guide for GitHub Actions CI/CD pipelines including workflow structure, jobs, steps, caching, and deployment strategies for the monorepo

### TypeScript Instructions
- **File**: `typescript.instructions.md`
- **Applies To**: `**/*.ts`
- **Description**: TypeScript development guidelines with strict typing standards, domain-driven design patterns, and type safety best practices

### React Instructions
- **File**: `react.instructions.md`
- **Applies To**: `**/*.jsx, **/*.tsx, **/*.js, **/*.ts, **/*.css, **/*.scss`
- **Description**: ReactJS development standards including functional components, hooks, state management, and testing practices

### Frontend Instructions
- **File**: `frontend.instructions.md`
- **Applies To**: `sites/arolariu.ro/**/*.tsx, sites/arolariu.ro/**/*.ts, sites/arolariu.ro/**/*.jsx, sites/arolariu.ro/**/*.js, sites/arolariu.ro/**/*.css`
- **Description**: Next.js frontend development with React Server Components, App Router patterns, performance optimization, and observability

### Backend Instructions
- **File**: `backend.instructions.md`
- **Applies To**: `**/*.cs, **/*.csproj, **/Program.cs, **/appsettings.json`
- **Description**: .NET backend development with domain-driven design, SOLID principles, modular monolith architecture, and 85%+ test coverage standards

### Bicep Instructions
- **File**: `bicep.instructions.md`
- **Applies To**: `**/*.bicep`
- **Description**: Azure Bicep infrastructure as code with naming conventions, security best practices, cost optimization, and resource management

### Code Review Instructions
- **File**: `code-review.instructions.md`
- **Applies To**: `**` (all files)
- **Description**: General code review guidelines and quality standards inspired by Gilfoyle's technical supremacy

## Main Instructions

For general repository guidelines, monorepo architecture, technology stack, and cross-cutting concerns, refer to:
- **`.github/copilot-instructions.md`** - Comprehensive monorepo guidelines covering:
  - Monorepo architecture (Nx-based)
  - Documentation & Architecture RFCs
  - Technology stack for all projects
  - Code quality standards (ESLint, TypeScript, Prettier)
  - Frontend development (Next.js, React)
  - Backend development (.NET, DDD)
  - Shared components library
  - Type safety & TypeScript
  - State management
  - Testing practices
  - Infrastructure & deployment
  - Naming conventions
  - Performance considerations
  - Security guidelines

## Architecture Documentation

For detailed architectural decisions and patterns, consult:
- **`docs/rfc/`** - Request for Comments documenting architectural decisions:
  - **RFC 1000-1999**: Frontend architecture (OpenTelemetry, metadata system, documentation standards)
  - **RFC 2000-2999**: Backend architecture (Domain-Driven Design, modular monolith)
- **`docs/frontend/README.md`** - Frontend-specific implementation details
- **`docs/backend/README.md`** - Backend-specific implementation details

## Adding New Instructions

To add new instruction files:

1. **Create a new instruction file** in this directory with `.instructions.md` suffix
2. **Add YAML frontmatter** at the top of the file:
   ```yaml
   ---
   applyTo: 'pattern/**/*.ext'
   description: 'Brief description of what this instruction covers'
   ---
   ```
3. **Write comprehensive guidelines** for the specific domain
4. **Update this README** to document the new instruction file
5. **Test the instructions** by editing files matching the pattern

## File Naming Convention

All instruction files follow the pattern: `<topic>.instructions.md`

Examples:
- `workflows.instructions.md`
- `typescript.instructions.md`
- `backend.instructions.md`

## Best Practices

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
