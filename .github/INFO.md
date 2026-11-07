# GitHub Actions Scripts & Workflows

This directory contains all GitHub Actions workflows and their supporting TypeScript scripts for the arolariu.ro monorepo CI/CD pipeline.

## 📁 Directory Structure

```
.github/
├── actions/                          # Reusable composite actions
│   └── setup-workspace/              # Common setup: checkout + Node.js + .NET + deps + caching
│       └── action.yml
├── scripts/                          # TypeScript workflow helper scripts
│   ├── src/                          # Main workflow scripts
│   │   ├── check-code-hygiene.ts     # Code hygiene checks (format, lint, stats)
│   │   ├── check-code-hygiene-wrapper.js
│   │   ├── create-e2e-failure-issue.ts
│   │   ├── create-pr-comment.ts      # Core PR comment creation logic
│   │   ├── create-unit-test-summary-comment.ts  # Unit test summary PR comments
│   │   ├── create-unit-test-summary-comment-wrapper.js
│   │   └── post-hygiene-comment.ts
│   ├── lib/                          # Utility modules
│   │   ├── bundle-size-helper.ts
│   │   ├── constants.ts
│   │   ├── env-helper.ts
│   │   ├── file-system-helper.ts
│   │   ├── git-helper.ts
│   │   ├── issue-creator.ts
│   │   ├── vitest-helper.ts
│   │   ├── markdown-builder.ts
│   │   ├── newman-parser.ts
│   │   ├── playwright-helper.ts
│   │   ├── pr-comment-builder.ts
│   │   ├── pr-helper.ts
│   │   └── status-helper.ts
│   ├── types/                        # TypeScript type definitions
│   │   ├── index.ts
│   │   ├── newman-types.ts
│   │   └── workflow-types.ts
│   ├── package.json
│   ├── tsconfig.json
│   └── README.md                     # This file
└── workflows/                        # GitHub Actions workflow definitions
    ├── official-hygiene-check.yml    # Code hygiene (format/lint/stats)
    ├── official-hygiene-check-v2.yml # Optimized version with caching
    ├── official-website-build.yml    # Website build & test
    ├── official-website-release.yml  # Website deployment
    ├── official-api-trigger.yml      # Backend API deployment
    ├── official-cv-trigger.yml       # CV site deployment
    ├── official-docs-trigger.yml     # Documentation deployment
    ├── official-e2e-action.yml       # E2E testing
    └── official-components-publish.yml # NPM package publishing with OIDC
```

## 🚀 Quick Start

### Running Workflows Locally

Install dependencies in the scripts directory:

```powershell
cd .github/scripts
npm install
```

### Creating a New Workflow Script

1. Create a new TypeScript file in `scripts/src/`:

   ```typescript
   /**
    * @fileoverview Brief description of what this script does
    * @module src/my-new-script
    */

   import type {ScriptParams} from "../types/index.ts";

   export default async function myNewScript(params: ScriptParams): Promise<void> {
     const {github, context, core, exec} = params;

     // Your script logic here
     core.info("✨ Starting my new script...");
   }
   ```

2. Import it in your workflow:
   ```yaml
   - name: Run my script
     uses: actions/github-script@v8
     with:
       script: |
         const {default: myNewScript} = await import('${{ github.workspace }}/.github/scripts/src/my-new-script.ts');
         await myNewScript({github, context, core, exec});
   ```

## 🔧 Composite Actions

### `setup-workspace`

Reusable action that handles:

- Repository checkout with configurable depth
- Node.js setup with version caching
- .NET SDK setup with caching (optional)
- npm dependency installation with aggressive caching
- NuGet package and .NET tools caching
- Cache hit detection and reporting

**Usage:**

```yaml
- name: Setup workspace
  uses: ./.github/actions/setup-workspace
  with:
    node-version: "24" # Default: '24'
    dotnet-version: "10.0.x" # Default: '10.0.x'
    fetch-depth: "1" # Default: '1' (shallow)
    install-node-deps: "true" # Default: 'true'
    setup-dotnet: "false" # Default: 'false'
    working-directory: "." # Default: '.'
```

**When to use shallow vs full checkout:**

- `fetch-depth: 1` (shallow): For format checks, lint checks, builds, deployments
- `fetch-depth: 0` (full): For git diff stats, changelog generation, version tagging

## 📝 TypeScript Scripts

### Core Scripts (src/)

- **check-code-hygiene.ts**: Main hygiene check logic
  - `CHECK_MODE=stats`: Compute code statistics
  - `CHECK_MODE=format`: Check code formatting
  - `CHECK_MODE=lint`: Run linting checks

- **post-hygiene-comment.ts**: Post PR comments for hygiene results
  - `COMMENT_TYPE=stats`: Statistics comment
  - `COMMENT_TYPE=formatting`: Formatting issues
  - `COMMENT_TYPE=linting`: Linting errors
  - `COMMENT_TYPE=summary`: Final summary

- **create-e2e-failure-issue.ts**: Create GitHub issue for E2E test failures
- **create-pr-comment.ts**: Core PR comment posting logic (generic utility)
- **create-unit-test-summary-comment.ts**: Generate and post comprehensive test result comments (Vitest + Playwright + bundle analysis)

### Utility Modules (lib/)

- **git-helper.ts**: Git operations (diff stats, branch fetching)
- **bundle-size-helper.ts**: Bundle size comparison and analysis
- **pr-helper.ts**: Pull request operations
- **pr-comment-builder.ts**: Build formatted PR comments
- **markdown-builder.ts**: Markdown formatting utilities
- **env-helper.ts**: Environment variable access
- **file-system-helper.ts**: File system operations
- **issue-creator.ts**: GitHub issue creation
- **vitest-helper.ts**: Vitest test result parsing and coverage reporting
- **playwright-helper.ts**: Playwright E2E result parsing
- **newman-parser.ts**: Newman API test result parsing
- **status-helper.ts**: GitHub check status management
- **constants.ts**: Shared constants

### Type Definitions (types/)

- **index.ts**: Core types (`ScriptParams`, etc.)
- **workflow-types.ts**: Workflow-specific types
- **newman-types.ts**: Newman test result types

## 🎨 Best Practices

### When Creating Workflows

1. **Use composite actions** for repeated setup steps
2. **Leverage caching** aggressively for dependencies and build outputs
3. **Parallelize** independent jobs with matrix strategies where applicable
4. **Set timeouts** on all jobs to prevent hung workflows
5. **Use shallow checkouts** (`fetch-depth: 1`) unless full history is needed
6. **Set explicit permissions** following principle of least privilege
7. **Use concurrency** to prevent redundant runs
8. **Add conditional execution** with `if` statements to skip unnecessary work

### When Creating Scripts

1. **Use TypeScript** with Node.js 24's native TS support
2. **Export default function** for easy import in workflows
3. **Accept `ScriptParams`** as the function parameter
4. **Use `core.info/warning/error`** for logging
5. **Set outputs** with `core.setOutput()` for inter-job communication
6. **Handle errors gracefully** and provide clear error messages
7. **Document with JSDoc** for maintainability

### Caching Strategy

```yaml
# Good: Specific cache key with fallbacks
key: ${{ runner.os }}-node-${{ hashFiles('**/package-lock.json') }}
restore-keys: |
  ${{ runner.os }}-node-

# Bad: Generic cache key (too many misses)
key: node-modules
```

## 🔐 Security

- All workflows follow **least-privilege permissions**
- Secrets accessed only via `secrets` context
- No hardcoded credentials in code or workflows
- Third-party actions pinned to specific versions (`@v5`, not `@latest`)
- Dependabot enabled for action version updates

## 📚 Additional Resources

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [actions/github-script](https://github.com/actions/github-script)
- [actions/cache](https://github.com/actions/cache)
- [Node.js TypeScript Support](https://nodejs.org/docs/latest/api/typescript.html)

## 🤝 Contributing

When adding new workflows or scripts:

1. Follow the established directory structure
2. Use the composite action for common setup
3. Document all scripts with JSDoc comments
4. Add appropriate error handling
5. Test workflows on a feature branch first
6. Update this README with any new patterns

## 📞 Support

For questions or issues with workflows/scripts:

- Check workflow run logs in GitHub Actions tab
- Review this README for patterns and best practices
- Examine existing scripts for similar functionality
- Create an issue if you discover a bug or need a new feature
