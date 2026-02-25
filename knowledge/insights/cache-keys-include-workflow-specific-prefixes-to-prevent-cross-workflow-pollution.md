---
description: "Each workflow passes a unique cache-key-prefix (e.g., 'website', 'api', 'hygiene') that namespaces its cache entries, preventing one workflow from restoring another's cached dependencies"
type: convention
source: "docs/rfc/0001-github-actions-workflows.md"
status: current
created: 2026-02-25
---

# Cache keys include workflow-specific prefixes to prevent cross-workflow pollution

The composite setup-workspace action requires a `cache-key-prefix` input that becomes part of the cache key: `{os}-node-{prefix}-{hash}`. Each workflow provides its own prefix -- `website`, `api`, `hygiene`, `cv`, `docs` -- ensuring that cached `node_modules` or `.nuget` packages from one workflow are never accidentally restored by another.

This isolation matters because different workflows install different dependency subsets. The website workflow installs Playwright browsers and generates GraphQL artifacts; the API workflow restores .NET NuGet packages; the hygiene workflow only needs the base npm dependencies. If these shared a cache namespace, a website cache hit in the API workflow would restore unnecessary browser binaries, wasting disk space and potentially causing path conflicts.

The prefix also combines with the OS identifier (`runner.os`) and the lock file hash, creating a three-dimensional isolation: operating system, workflow purpose, and exact dependency version. This makes cache entries highly specific and eliminates any possibility of cross-contamination, even if two workflows happen to share the same `package-lock.json` hash (which they do, since the monorepo has a single root lock file).

---

Related Insights:
- [[hash-based-caching-without-fallback-keys-guarantees-dependency-correctness]] -- foundation: workflow prefixes complement the no-fallback exactness strategy
- [[composite-setup-workspace-action-centralizes-all-ci-environment-configuration]] -- enables: the composite action accepts and applies the prefix parameter

Domains:
- [[infrastructure]]
