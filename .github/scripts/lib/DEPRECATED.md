# Legacy lib/ Directory - Deprecation Status

This directory contains legacy helper utilities from before the refactoring to use @actions/toolkit.

## ✅ Deprecated - Use New Helpers Instead

These files have been replaced by the new `helpers/` directory:

- **env-helper.ts** → Use `helpers/environment/`
- **file-system-helper.ts** → Use `helpers/filesystem/`  
- **git-helper.ts** → Use `helpers/git/`
- **pr-helper.ts** → Use `helpers/github/`

## 🔄 Still In Use - Domain-Specific

These files contain domain-specific logic and are still used:

- **bundle-size-helper.ts** - Bundle analysis logic
- **vitest-helper.ts** - Vitest report parsing
- **playwright-helper.ts** - Playwright report parsing
- **newman-parser.ts** - Newman/Postman report parsing
- **markdown-builder.ts** - Complex markdown generation
- **issue-creator.ts** - GitHub issue creation with templates
- **pr-comment-builder.ts** - PR comment templates
- **status-helper.ts** - Status emoji and formatting
- **constants.ts** - Shared constants

## Migration Plan

The deprecated files (env, file-system, git, pr) should be removed after validating all workflows work correctly with the new helpers. The domain-specific helpers can be migrated gradually as time permits, or kept if they provide value.

## New Architecture

All new code should use:
```typescript
import { env, fs, git, createGitHubHelper } from "../helpers/index.ts";
```

Instead of:
```typescript
import { getEnvVar } from "../lib/env-helper.ts";
import type { ScriptParams } from "../types/index.ts";
```
