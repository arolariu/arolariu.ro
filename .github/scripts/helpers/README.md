# GitHub Actions Helpers

Type-safe, clean architecture helpers for GitHub Actions workflows using @actions/toolkit.

## Overview

This directory contains modular, well-tested helpers that wrap the @actions/toolkit ecosystem with clean interfaces following SOLID principles. Each helper focuses on a single responsibility and provides a type-safe, easy-to-use API.

## Architecture

```
helpers/
├── environment/    # Environment variable management
├── filesystem/     # File system operations (@actions/io + Node.js fs)
├── git/           # Git operations (@actions/exec)
├── github/        # GitHub API operations (@actions/github)
├── artifacts/     # Artifact management (@actions/artifact)
├── cache/         # Cache operations (@actions/cache)
├── comments/      # PR comment builders (markdown)
├── http/          # HTTP client (@actions/http-client)
└── index.ts       # Main entry point
```

## Design Principles

### SOLID Principles

- **Single Responsibility**: Each helper has one clear purpose
- **Open/Closed**: Extensible through interfaces without modification
- **Liskov Substitution**: All implementations are substitutable
- **Interface Segregation**: Clean, focused interfaces
- **Dependency Inversion**: Depend on abstractions, not implementations

### Clean Code Practices

- Comprehensive JSDoc documentation
- Type-safe with TypeScript strict mode
- Consistent error handling
- Factory pattern for easy instantiation
- Default exports for convenience

## Usage

### Quick Start

```typescript
// Import default instances (ready to use)
import { env, fs, git, artifacts, cache, http } from './helpers';

// Or import factory functions
import { createGitHubHelper, createCommentBuilder } from './helpers';

// Or import specific modules
import { env } from './helpers/environment';
import { fs } from './helpers/filesystem';
```

### Environment Helper

Manage environment variables with type safety:

```typescript
import { env } from './helpers';

// Get optional variable
const apiUrl = env.get('API_URL', 'http://localhost:3000');

// Get required variable (fails workflow if missing)
const commitSha = env.getRequired('GITHUB_SHA');

// Get multiple required variables
const vars = env.getRequiredBatch(['COMMIT_SHA', 'RUN_ID']);

// Check if variable exists
if (env.has('DEBUG_MODE')) {
  console.log('Debug mode enabled');
}

// Get typed values
const isProduction = env.getBoolean('IS_PRODUCTION', false);
const timeout = env.getInt('TIMEOUT_SECONDS', 30);

// Get GitHub context
const context = env.getGitHubContext();
console.log(`Running on ${context.ref} by ${context.actor}`);
```

### File System Helper

Cross-platform file operations:

```typescript
import { fs } from './helpers';

// Check file existence
if (await fs.exists('./config.json')) {
  const config = await fs.readJson<Config>('./config.json');
}

// Read/write text files
const content = await fs.readText('./README.md');
await fs.writeText('./output.txt', 'Hello World', { recursive: true });

// Read/write JSON
const data = await fs.readJson<Data>('./data.json');
await fs.writeJson('./output.json', { key: 'value' });

// Copy/move/remove files
await fs.copy('./source', './dest', { recursive: true });
await fs.move('./old', './new');
await fs.remove('./temp', { recursive: true });

// Find files matching pattern
const logs = await fs.find('./logs', /\.log$/);

// Read last N lines (tail)
const recentErrors = await fs.readTail('./error.log', 100);
```

### Git Helper

Type-safe Git operations:

```typescript
import { git } from './helpers';

// Fetch branch
await git.fetchBranch('main', 'origin', 50);

// Get diff statistics
const stats = await git.getDiffStats('origin/main', 'HEAD');
console.log(`${stats.filesChanged} files, +${stats.linesAdded} -${stats.linesDeleted}`);

// Get changed files
const files = await git.getChangedFiles('HEAD~1', 'HEAD');

// Get commit info
const commit = await git.getCommit('HEAD');
console.log(`${commit.shortSha}: ${commit.message}`);

// Get file sizes from Git tree
const sizes = await git.getFileSizes('origin/main', ['dist/', 'build/']);

// Check if reference exists
if (await git.refExists('origin/develop')) {
  console.log('Develop branch exists');
}

// List branches
const branches = await git.listBranches('origin');
```

### GitHub Helper

GitHub API operations:

```typescript
import { createGitHubHelper } from './helpers';

const gh = createGitHubHelper(process.env.GITHUB_TOKEN!);

// Get repository info
const repo = gh.getRepository();
console.log(`Working on ${repo.fullName}`);

// Get PR context
const pr = gh.getPullRequest();
if (pr) {
  console.log(`PR #${pr.number}: ${pr.title}`);
}

// Post PR comment
await gh.postPullRequestComment(123, '## Build Results\n\n✅ Success');

// Find and update comment
const existingComment = await gh.findComment(123, 'build-results-marker');
if (existingComment) {
  await gh.updateComment(existingComment.id, 'Updated content');
}

// Upsert comment (create or update)
await gh.upsertComment(123, '## Status\n\nUpdated', 'status-marker');

// Create issue
await gh.createIssue(
  'Bug Report',
  'Description',
  ['bug', 'high-priority'],
  ['username']
);

// Manage labels
await gh.addLabels(123, ['ready-for-review']);
await gh.removeLabels(123, ['wip']);
```

### Artifacts Helper

Upload and download artifacts:

```typescript
import { artifacts } from './helpers';

// Upload directory as artifact
await artifacts.uploadDirectory('test-results', './test-output', 30);

// Upload specific files
await artifacts.uploadFiles(
  'logs',
  ['app.log', 'error.log'],
  './',
  7
);

// Download artifact
await artifacts.download({
  name: 'build-output',
  destination: './download'
});

// List available artifacts
const available = await artifacts.list();
console.log(`Found ${available.length} artifacts`);
```

### Cache Helper

Efficient caching with automatic key generation:

```typescript
import { cache, CacheConfigs } from './helpers';

// Auto-cache with common configurations
await cache.autoCache(
  CacheConfigs.npm.prefix,
  CacheConfigs.npm.paths,
  CacheConfigs.npm.lockFiles
);

// Manual cache operations
const result = await cache.restore({
  key: 'npm-cache-v1-abc123',
  paths: ['node_modules'],
  restoreKeys: ['npm-cache-v1-', 'npm-cache-']
});

if (!result.hit) {
  // Install dependencies
  // ...
  
  await cache.save({
    key: 'npm-cache-v1-abc123',
    paths: ['node_modules']
  });
}

// Generate cache key from files
const key = await cache.generateKey('npm', ['package-lock.json']);

// Create restore keys
const restoreKeys = cache.createRestoreKeys(key, 3);
```

### Comments Builder

Build structured PR comments:

```typescript
import { createCommentBuilder, MarkdownUtils } from './helpers';

const comment = createCommentBuilder()
  .addHeading('Build Results', 2)
  .addBadge('Success', 'success')
  .addParagraph('All checks passed!')
  .addTable(
    [
      { header: 'File', align: 'left' },
      { header: 'Size', align: 'right' },
      { header: 'Change', align: 'right' }
    ],
    [
      ['app.js', '125 KB', '+5 KB'],
      ['styles.css', '45 KB', '-2 KB']
    ]
  )
  .addCollapsible('Details', 'Detailed information...', true)
  .addIdentifier('build-comment-v1')
  .build();

// Use markdown utilities
const link = MarkdownUtils.link('View PR', 'https://github.com/...');
const bold = MarkdownUtils.bold('Important');
const size = MarkdownUtils.formatBytes(1024000);
```

### HTTP Helper

Make HTTP requests:

```typescript
import { http } from './helpers';

// GET request
const response = await http.get<ApiResponse>('https://api.example.com/data');
if (response.success) {
  console.log(response.body);
}

// POST with JSON body
await http.post('https://api.example.com/create', {
  name: 'test',
  value: 123
});

// Download file
await http.download(
  'https://example.com/file.zip',
  './downloads/file.zip'
);

// Custom request
const result = await http.request(
  'PATCH',
  'https://api.example.com/update',
  { status: 'completed' }
);
```

## Common Patterns

### Script Entry Point

```typescript
import * as core from '@actions/core';
import * as github from '@actions/github';
import { env, fs, git, createGitHubHelper, createCommentBuilder } from './helpers';

export default async function main() {
  try {
    // Get GitHub token
    const token = env.getRequired('GITHUB_TOKEN');
    const gh = createGitHubHelper(token);
    
    // Get PR context
    const pr = gh.getPullRequest();
    if (!pr) {
      core.info('Not a PR context, skipping');
      return;
    }
    
    // Perform operations
    await git.fetchBranch('main');
    const stats = await git.getDiffStats('origin/main', 'HEAD');
    
    // Build and post comment
    const comment = createCommentBuilder()
      .addHeading('Code Changes')
      .addParagraph(`${stats.filesChanged} files changed`)
      .build();
    
    await gh.postPullRequestComment(pr.number, comment);
    
    core.info('✅ Complete');
  } catch (error) {
    const err = error as Error;
    core.setFailed(err.message);
  }
}
```

### Workflow Script Pattern

```typescript
// For use with actions/github-script@v8
const script = async ({ github, context, core, exec }) => {
  // Import helpers
  const { env, fs, git } = await import('./helpers');
  
  // Use helpers with provided context
  const commitSha = env.get('GITHUB_SHA');
  const files = await fs.find('./src', /\.ts$/);
  const stats = await git.getDiffStats('origin/main', 'HEAD');
  
  // Perform workflow logic
  console.log(`Found ${files.length} TypeScript files`);
  console.log(`${stats.filesChanged} files changed`);
};

export default script;
```

## Testing

Each helper includes interfaces that can be easily mocked for testing:

```typescript
import type { IEnvironmentHelper } from './helpers/environment';

// Create mock
const mockEnv: IEnvironmentHelper = {
  get: (key: string) => 'mock-value',
  getRequired: (key: string) => 'mock-value',
  // ... other methods
};

// Use in tests
const value = mockEnv.get('TEST_VAR');
```

## Best Practices

1. **Use default instances** for simple use cases: `env.get()`, `fs.readText()`
2. **Create specific instances** when you need custom configuration
3. **Handle errors** appropriately - helpers throw descriptive errors
4. **Use type parameters** for JSON operations: `fs.readJson<ConfigType>()`
5. **Leverage factory functions** for dependency injection in tests
6. **Document your scripts** using JSDoc comments
7. **Follow the helper patterns** when extending functionality

## Contributing

When adding new helpers:

1. Create a new directory under `helpers/`
2. Implement an interface following the `I*Helper` pattern
3. Provide a concrete implementation class
4. Export a factory function: `create*Helper()`
5. Export a default instance for convenience
6. Add comprehensive JSDoc documentation
7. Export types and interfaces
8. Update this README

## Migration Guide

Migrating from old helper pattern:

**Before:**
```typescript
import { getEnvVar, getRequiredEnvVar } from '../lib/env-helper';

const value = getEnvVar('KEY', 'default');
const required = getRequiredEnvVar(core, 'REQUIRED_KEY');
```

**After:**
```typescript
import { env } from './helpers';

const value = env.get('KEY', 'default');
const required = env.getRequired('REQUIRED_KEY');
```

Key differences:
- No need to pass `core` parameter (handled internally)
- Cleaner API with object-oriented approach
- Better type safety
- More consistent error handling

## License

Part of the arolariu.ro monorepo. See root LICENSE file.
