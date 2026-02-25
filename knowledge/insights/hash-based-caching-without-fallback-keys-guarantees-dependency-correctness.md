---
description: "Cache keys use exact SHA-256 hashes of lock files with NO restore-keys fallback, trading occasional cache misses for guaranteed correctness"
type: decision
source: "docs/rfc/0001-github-actions-workflows.md"
status: current
created: 2026-02-25
---

# Hash-based caching without fallback keys guarantees dependency correctness

The CI/CD caching strategy deliberately omits `restore-keys` (fallback patterns) from all GitHub Actions cache steps. Each cache key is an exact hash of the relevant lock files: `{os}-node-{workflow}-{hash(package-lock.json)}` for Node.js and `{os}-dotnet-{workflow}-{hash(*.csproj, *.slnx, packages.lock.json)}` for .NET. Either the hash matches exactly and the cache is used, or a complete fresh installation runs.

The rationale centers on a specific failure scenario: when `restore-keys` like `linux-node-website-` are present, a developer who bumps `package.json` versions without regenerating `package-lock.json` can trigger a fallback to a stale cache. The build then runs with incompatible cached dependencies, producing mysterious failures that are difficult to diagnose because the cache hit appears successful.

By removing fallback keys entirely, the system makes cache behavior binary and predictable. A cache hit means an exact dependency match. A cache miss means a clean install. There is no ambiguous middle state where partially-matching cached dependencies produce subtle runtime errors.

The trade-off is explicit: more frequent cache misses (every dependency change triggers a full install) in exchange for guaranteed correctness. The RFC frames this as "correctness over speed" and notes that the slightly longer execution time on dependency updates is preferable to debugging cache-induced failures.

---

Related Insights:
- [[composite-setup-workspace-action-centralizes-all-ci-environment-configuration]] -- foundation: the composite action implements this caching strategy
- [[cache-keys-include-workflow-specific-prefixes-to-prevent-cross-workflow-pollution]] -- extends: workflow prefixes add another isolation dimension beyond hash exactness

Domains:
- [[infrastructure]]
