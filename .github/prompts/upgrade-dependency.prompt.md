---
mode: 'agent'
description: 'Safe dependency upgrade workflow with compatibility checks and rollback strategy'
---

# Dependency Upgrade Workflow

Safely upgrade npm or NuGet dependencies with compatibility validation.

## Pre-flight

1. **Check current version**: `npm ls <package>` or check Directory.Packages.props
2. **Read changelog**: Check for breaking changes between current and target version
3. **Check peer dependencies**: Ensure compatibility with React 19.2.4, Next.js 16.1.6, TypeScript 5.9.3

## Steps

### 1. Create Branch
```bash
git checkout -b chore/upgrade-<package>-<version>
```

### 2. Upgrade
```bash
# npm (frontend)
npm install <package>@<version>

# NuGet (.NET)
dotnet add <project> package <package> --version <version>
```

### 3. Build
```bash
# Frontend
npm run build:website

# Backend
dotnet build sites/api.arolariu.ro/src/Core
```

### 4. Test
```bash
# Frontend
npm run test:website
npm run lint

# Backend
dotnet test sites/api.arolariu.ro/tests
```

### 5. Update Documentation
- Update version references in `.github/agents/frontend-expert.agent.md` or `backend-expert.agent.md`
- Update version in `.github/instructions/frontend.instructions.md` if applicable
- Update AGENTS.md/CLAUDE.md if major version change

### 6. Rollback Plan
```bash
# If upgrade fails:
git checkout -- package.json package-lock.json
npm ci
```

## Checklist
- [ ] Breaking changes reviewed
- [ ] Peer dependency compatibility verified
- [ ] Build passes
- [ ] All tests pass
- [ ] No new lint errors
- [ ] Version references updated in AI instruction files
- [ ] Commit with `chore: upgrade <package> to <version>`
