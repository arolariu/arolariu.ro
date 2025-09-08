# Monorepo CLI Guide

This repository now uses [Nx](https://nx.dev) as a monorepo tool to manage all projects from a single location. This provides a unified CLI interface for all build, test, and development commands across the entire codebase.

## Quick Start

```bash
# Install dependencies at root level
npm install

# Build all projects
npm run build

# Build a specific project
npm run build:website
npm run build:components
npm run build:api
npm run build:cv
npm run build:docs

# Run development servers
npm run dev:website    # Start website dev server
npm run dev:components # Start component storybook
npm run dev:api        # Start API dev server
npm run dev:cv         # Start CV dev server

# Test all projects
npm run test

# Test specific projects
npm run test:website
npm run test:components
npm run test:api

# Lint all projects
npm run lint

# Format all projects
npm run format
```

## Project Structure

```
arolariu.ro/
├── packages/
│   └── components/          # React component library
├── sites/
│   ├── arolariu.ro/        # Main website (Next.js)
│   ├── api.arolariu.ro/    # Backend API (.NET)
│   ├── cv.arolariu.ro/     # CV site (SvelteKit)
│   └── docs.arolariu.ro/   # Documentation (DocFX)
├── package.json            # Root workspace configuration
├── nx.json                 # Nx workspace configuration
└── README-MONOREPO.md      # This file
```

## Available Commands

### Root Level Commands

All these commands can be run from the repository root:

#### Build Commands
- `npm run build` - Build all projects
- `npm run build:components` - Build component library
- `npm run build:website` - Build main website
- `npm run build:api` - Build API projects
- `npm run build:cv` - Build CV site
- `npm run build:docs` - Build documentation

#### Development Commands
- `npm run dev` - Start all development servers (parallel)
- `npm run dev:components` - Start component storybook
- `npm run dev:website` - Start website development server
- `npm run dev:api` - Start API development server
- `npm run dev:cv` - Start CV development server
- `npm run dev:docs` - Start documentation development server

#### Test Commands
- `npm run test` - Run all tests
- `npm run test:components` - Run component tests
- `npm run test:website` - Run website tests
- `npm run test:api` - Run API tests
- `npm run test:cv` - Run CV tests

#### Maintenance Commands
- `npm run clean` - Clean all build artifacts
- `npm run lint` - Lint all projects
- `npm run format` - Format all projects

### Advanced Nx Commands

You can also use Nx directly for more advanced operations:

```bash
# Show project dependency graph
npx nx graph

# Show all projects
npx nx show projects

# Run specific target for specific project
npx nx run website:build
npx nx run components:storybook

# Run commands on multiple projects
npx nx run-many --target=build --projects=website,components

# Run commands only on affected projects (useful in CI)
npx nx affected --target=build
npx nx affected --target=test
npx nx affected --target=lint

# Show what would be affected by your changes
npx nx show projects --affected

# Analyze project structure
npx nx show project website
npx nx show project components
```

## Project Dependencies

The workspace automatically manages dependencies between projects:

- **Website** depends on **Components** - when you build the website, components are built first
- **Docs** depends on **API** - documentation generation requires API to be built first
- All other projects are independent

## Benefits

### 🚀 **Unified Development Experience**
- Single command to build, test, or develop all projects
- No more navigating between directories
- Consistent tooling across all projects

### ⚡ **Smart Caching**
- Nx only rebuilds what has changed
- Shares build cache across team members
- Dramatically faster CI/CD pipelines

### 🔍 **Dependency Analysis**
- Visualize relationships between projects
- Understand impact of changes
- Only test/build what's affected

### 🛠️ **Enhanced Tooling**
- Rich CLI with autocompletion
- Plugin ecosystem for additional languages/frameworks
- Integrated with popular IDEs

## Backward Compatibility

**Important**: All existing workflows and commands continue to work exactly as before:

- Individual `package.json` files are unchanged
- CI/CD workflows continue to work with their existing `working-directory` settings
- Developers can still navigate to individual project directories and run commands locally
- No breaking changes to existing development processes

The monorepo CLI is additive - it provides new capabilities while preserving all existing functionality.

## Migration Strategy

### Phase 1: Additive (Current)
- ✅ Root-level CLI commands available
- ✅ Individual project commands still work
- ✅ CI/CD workflows unchanged
- ✅ Zero breaking changes

### Phase 2: Enhanced CI/CD (Future)
- 🔄 Update workflows to use `nx affected` for faster builds
- 🔄 Implement shared caching in CI
- 🔄 Add cross-project testing strategies

### Phase 3: Advanced Features (Future)
- 🔄 Code generation and scaffolding
- 🔄 Advanced dependency analysis
- 🔄 Automated refactoring tools

## Troubleshooting

### "Command not found" errors
If you get "command not found" errors, make sure you've installed dependencies:
```bash
npm install
```

### Nx commands failing
Ensure you're running commands from the repository root directory.

### Individual project builds failing
Navigate to the specific project directory and install its dependencies:
```bash
cd sites/arolariu.ro
npm install
```

### Performance issues
Nx includes caching by default. If you need to reset the cache:
```bash
npx nx reset
```

## Getting Help

- [Nx Documentation](https://nx.dev)
- [Nx Community](https://github.com/nrwl/nx/discussions)
- Project-specific READMEs in individual directories
- Issues and questions in the repository issue tracker

## Contributing

When adding new projects or modifying build processes:

1. Add appropriate `project.json` configuration for new projects
2. Update root `package.json` scripts if needed
3. Ensure individual project functionality is preserved
4. Test both root-level and project-level commands
5. Update this documentation as needed