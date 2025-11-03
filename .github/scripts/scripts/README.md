# GitHub Actions Scripts

Modern, clean architecture scripts using the @actions/toolkit helpers.

## Overview

This directory contains workflow scripts that leverage the new helper architecture for maintainable, type-safe GitHub Actions automation.

## Architecture Pattern

### New Pattern (Recommended)

Scripts in this directory use the new helper architecture:

```typescript
import * as core from "@actions/core";
import { env, fs, git, createGitHubHelper, createCommentBuilder } from "../helpers/index.ts";

export default async function myScript(): Promise<void> {
  try {
    // Get environment variables
    const token = env.getRequired("GITHUB_TOKEN");
    
    // Create GitHub helper
    const gh = createGitHubHelper(token);
    
    // Use helpers
    const files = await fs.find("./src", /\.ts$/);
    const stats = await git.getDiffStats("origin/main", "HEAD");
    
    // Build comment
    const comment = createCommentBuilder()
      .addHeading("Results")
      .addParagraph(`Found ${files.length} TypeScript files`)
      .build();
    
    // Post to PR
    const pr = gh.getPullRequest();
    if (pr) {
      await gh.postPullRequestComment(pr.number, comment);
    }
    
    core.info("✅ Complete");
  } catch (error) {
    core.setFailed((error as Error).message);
  }
}
```

### Key Advantages

1. **No Parameter Passing**: Helpers use default instances internally
2. **Type Safety**: Full TypeScript with strict mode
3. **Clean Code**: Readable, maintainable, follows SOLID
4. **Error Handling**: Consistent error patterns
5. **Testability**: Easy to mock interfaces
6. **Documentation**: Comprehensive JSDoc

### Usage in Workflows

With `actions/github-script@v8`:

```yaml
- name: Run script
  uses: actions/github-script@v8
  with:
    script: |
      const { default: myScript } = await import('${{ github.workspace }}/.github/scripts/scripts/my-script.ts');
      await myScript();
```

## Available Scripts

### bundle-size-report.ts

Generates comprehensive bundle size reports with:
- Size comparison vs main branch
- Top file changes
- Formatted markdown tables
- Collapsible detailed view
- Auto-updating PR comments

**Usage:**
```yaml
- name: Generate bundle size report
  uses: actions/github-script@v8
  env:
    GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
    BASE_REF: origin/main
    HEAD_REF: ${{ github.sha }}
  with:
    script: |
      const { default: report } = await import('${{ github.workspace }}/.github/scripts/scripts/bundle-size-report.ts');
      await report();
```

## Creating New Scripts

### Step 1: Import Helpers

```typescript
import * as core from "@actions/core";
import {
  env,           // Environment variables
  fs,            // File system operations
  git,           // Git operations
  artifacts,     // Artifact management
  cache,         // Cache operations
  http,          // HTTP client
  createGitHubHelper,     // GitHub API
  createCommentBuilder,   // Comment builder
  MarkdownUtils,          // Markdown utilities
} from "../helpers/index.ts";
```

### Step 2: Define Types

```typescript
/**
 * Result data structure
 */
interface MyResult {
  /** Success flag */
  success: boolean;
  /** Result data */
  data: unknown;
  /** Error message if failed */
  error?: string;
}
```

### Step 3: Implement Main Function

```typescript
/**
 * Main script function
 * @description What this script does
 */
export default async function myScript(): Promise<void> {
  try {
    // Your logic here
    core.info("✅ Success");
  } catch (error) {
    const err = error as Error;
    core.error(`❌ Failed: ${err.message}`);
    core.setFailed(err.message);
  }
}
```

### Step 4: Add Direct Execution Support (Optional)

```typescript
// Allow direct execution for testing
if (import.meta.url === `file://${process.argv[1]}`) {
  myScript();
}
```

Then run directly:
```bash
node --experimental-strip-types my-script.ts
```

## Best Practices

### 1. Error Handling

Always wrap in try-catch and use core.setFailed:

```typescript
export default async function myScript(): Promise<void> {
  try {
    // Script logic
  } catch (error) {
    const err = error as Error;
    core.error(`❌ Error: ${err.message}`);
    core.setFailed(err.message);
  }
}
```

### 2. Environment Variables

Use env helper with validation:

```typescript
// Optional with default
const apiUrl = env.get("API_URL", "http://localhost:3000");

// Required (fails workflow if missing)
const token = env.getRequired("GITHUB_TOKEN");

// Typed values
const isProduction = env.getBoolean("IS_PRODUCTION");
const timeout = env.getInt("TIMEOUT_SECONDS", 30);
```

### 3. PR Context

Always check if in PR context:

```typescript
const gh = createGitHubHelper(token);
const pr = gh.getPullRequest();

if (!pr) {
  core.info("Not a PR context, skipping");
  return;
}

// Now safe to use pr.number, pr.title, etc.
```

### 4. Comment Management

Use upsert for idempotent comments:

```typescript
const comment = createCommentBuilder()
  .addHeading("Results")
  .addIdentifier("my-unique-id")  // Important for upsert!
  .build();

// Creates or updates existing comment
await gh.upsertComment(pr.number, comment, "my-unique-id");
```

### 5. Workflow Outputs

Set outputs for downstream steps:

```typescript
core.setOutput("result", "success");
core.setOutput("file-count", files.length.toString());
core.setOutput("data", JSON.stringify(data));
```

### 6. Logging

Use structured logging:

```typescript
core.info("📊 Starting analysis");
core.debug("Processing file: index.ts");
core.warning("⚠️ Large bundle detected");
core.error("❌ Failed to fetch data");
core.notice("ℹ️ Results: https://github.com/...");
```

### 7. Git Operations

Fetch branches before diff:

```typescript
// Ensure base branch exists
await git.fetchBranch("main", "origin");

// Now safe to diff
const stats = await git.getDiffStats("origin/main", "HEAD");
```

## Testing Scripts

### Manual Testing

```bash
cd .github/scripts

# Set environment variables
export GITHUB_TOKEN="your-token"
export GITHUB_REPOSITORY="owner/repo"
export BASE_REF="origin/main"
export HEAD_REF="HEAD"

# Run script
node --experimental-strip-types scripts/my-script.ts
```

### With Mock Data

Create a test wrapper:

```typescript
// scripts/my-script.test.ts
import { myScript } from "./my-script.ts";

// Set up test environment
process.env.GITHUB_TOKEN = "test-token";
process.env.TEST_MODE = "true";

// Run script
await myScript();
```

## Migration from Old Scripts

### Before (src/ directory)

```typescript
import { getEnvVar, getRequiredEnvVar } from "../lib/env-helper.ts";
import { getPRNumber, postPRComment } from "../lib/pr-helper.ts";
import type { ScriptParams } from "../types/index.ts";

export default async function oldScript(params: ScriptParams): Promise<void> {
  const { core, github, context } = params;
  const value = getEnvVar("KEY", "default");
  const required = getRequiredEnvVar(core, "REQUIRED");
  const prNumber = getPRNumber(core);
  // ...
}
```

### After (scripts/ directory)

```typescript
import * as core from "@actions/core";
import { env, createGitHubHelper } from "../helpers/index.ts";

export default async function newScript(): Promise<void> {
  const value = env.get("KEY", "default");
  const required = env.getRequired("REQUIRED");
  
  const token = env.getRequired("GITHUB_TOKEN");
  const gh = createGitHubHelper(token);
  const pr = gh.getPullRequest();
  // ...
}
```

### Key Differences

- ❌ No `ScriptParams` parameter
- ❌ No `core` passed to helpers
- ✅ Import helpers directly
- ✅ Use default instances
- ✅ Cleaner, more readable code

## Common Patterns

### File Processing

```typescript
// Find files
const tsFiles = await fs.find("./src", /\.ts$/);

// Process each file
for (const file of tsFiles) {
  const content = await fs.readText(file);
  // Process content
}
```

### Git Diff Analysis

```typescript
// Fetch and compare
await git.fetchBranch("main");
const stats = await git.getDiffStats("origin/main", "HEAD");
const files = await git.getChangedFiles("origin/main", "HEAD");

console.log(`${stats.filesChanged} files, +${stats.linesAdded} -${stats.linesDeleted}`);
```

### Building Comments

```typescript
const builder = createCommentBuilder()
  .addHeading("Report", 2)
  .addBadge("Success", "success")
  .addTable(
    [{ header: "File" }, { header: "Status" }],
    [["app.ts", "✅"], ["test.ts", "❌"]]
  )
  .addCollapsible("Details", "More info...", true)
  .addIdentifier("report-v1");

const comment = builder.build();
```

### Cache Management

```typescript
import { cache, CacheConfigs } from "../helpers/index.ts";

// Auto-cache npm
await cache.autoCache(
  CacheConfigs.npm.prefix,
  CacheConfigs.npm.paths,
  CacheConfigs.npm.lockFiles
);

// Or manual control
const result = await cache.restore({
  key: "my-cache-key",
  paths: ["node_modules"],
  restoreKeys: ["my-cache-"]
});

if (!result.hit) {
  // Build/install
  await cache.save({
    key: "my-cache-key",
    paths: ["node_modules"]
  });
}
```

## Troubleshooting

### Script Not Found

Ensure the script is in the `scripts/` directory and has a `.ts` extension.

### Import Errors

Check that you're importing from the correct helper path:
```typescript
import { env } from "../helpers/index.ts";  // ✅ Correct
import { env } from "../helpers/environment/index.ts";  // ✅ Also works
import { env } from "./helpers/index.ts";  // ❌ Wrong (missing ../)
```

### GitHub Token Missing

Ensure `GITHUB_TOKEN` is passed in workflow:
```yaml
env:
  GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

### TypeScript Errors

Run TypeScript compiler to check for errors:
```bash
npx tsc --noEmit
```

## Resources

- [Helpers Documentation](../helpers/README.md)
- [Actions Toolkit](https://github.com/actions/toolkit)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/intro.html)
