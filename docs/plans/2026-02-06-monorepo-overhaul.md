# Monorepo Overhaul Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Overhaul the arolariu.ro monorepo tooling, configuration, scripts, and standards to eliminate redundancies, harden security, standardize patterns, and improve build performance.

**Architecture:** The monorepo (npm workspaces + Nx 22.4.5) contains 4 sites (Next.js 16, .NET 10, SvelteKit 2, DocFX), 1 component library (67 React components), and Azure Bicep infrastructure. This plan addresses configuration conflicts, security gaps, CI/CD inefficiencies, and standardization gaps identified through a comprehensive audit of all root configs, RFCs, source code, scripts, and workflows.

**Tech Stack:** Node.js 24, npm 11, Nx 22.4.5, TypeScript 5.9, ESLint 9.39, Prettier 3.8, Vitest 4, Playwright 1.58, .NET 10, Azure Bicep, GitHub Actions, Docker

---

## Phase 1: Configuration Consolidation (Critical - Fix Conflicts)

These tasks fix active configuration conflicts that cause incorrect behavior today.

---

### Task 1: Consolidate Prettier Configuration (Eliminate Dual Config)

**Why:** Both `.prettierrc` (JSON) and `prettier.config.ts` (TypeScript) exist. Prettier loads `.prettierrc` first by default, so the HTML override and JSDoc documentation in the TypeScript version are silently ignored.

**Files:**
- Delete: `.prettierrc`
- Modify: `prettier.config.ts` (no changes needed - it's already complete)
- Modify: `nx.json` (remove `.prettierrc` from sharedGlobals if present)

**Step 1: Verify prettier.config.ts is a superset of .prettierrc**

Run: `node -e "const json = require('./.prettierrc'); const ts = require('./prettier.config.ts'); console.log('JSON keys:', Object.keys(json).sort()); console.log('TS keys:', Object.keys(ts.default || ts).sort());"`

Expected: TS config contains all JSON config keys plus overrides.

**Step 2: Delete .prettierrc**

```bash
git rm .prettierrc
```

**Step 3: Verify Prettier resolves to prettier.config.ts**

Run: `npx prettier --find-config-path src/app/page.tsx`
Expected: Output shows `prettier.config.ts` (not `.prettierrc`).

**Step 4: Spot-check formatting is unchanged**

Run: `npx prettier --check "sites/arolariu.ro/src/app/page.tsx"`
Expected: File passes check (no formatting changes from the config switch).

**Step 5: Commit**

```bash
git add .prettierrc prettier.config.ts
git commit -m "fix(config): remove duplicate .prettierrc, keep prettier.config.ts

The JSON config took precedence over the TypeScript version,
silently ignoring the HTML parser override and JSDoc docs."
```

---

### Task 2: Fix .prettierignore SCSS and JSON Over-Exclusion

**Why:** `.prettierignore` blocks `**/**/*.scss` and `**/**/*.json`, but SCSS modules are being actively created (67+ files) and many JSON files (tsconfig.json, package.json) should be formatted. This means new SCSS files in the migration have zero formatting enforcement.

**Files:**
- Modify: `.prettierignore`

**Step 1: Read the current .prettierignore**

Read: `.prettierignore` (understand current exclusion patterns)

**Step 2: Replace overly broad patterns with targeted exclusions**

Replace the file type exclusions section with:

```
# File types - targeted exclusions
**/**/*.md
**/**/*.svg
**/**/*.css
**/**/*.xml
**/**/*.yml
**/**/*.tsbuildinfo

# JSON - exclude generated/lock files only, allow config formatting
**/package-lock.json
**/generated/**/*.json
**/messages/*.d.json.ts
**/code-cov/**/*.json

# SCSS - exclude generated output only (allow .module.scss formatting)
**/dist/**/*.scss
**/build/**/*.scss
**/.next/**/*.scss
```

**Step 3: Verify SCSS files are now formattable**

Run: `npx prettier --check "sites/arolariu.ro/src/styles/abstracts/_variables.scss"`
Expected: File is checked (not skipped).

**Step 4: Run formatter on all SCSS files to establish baseline**

Run: `npx prettier --write "sites/arolariu.ro/src/**/*.module.scss" --log-level warn`
Expected: Files formatted without errors.

**Step 5: Commit**

```bash
git add .prettierignore
git commit -m "fix(config): allow Prettier to format SCSS modules and config JSON

SCSS was blocked during active SCSS migration. JSON lock files
and generated files remain excluded; config files are now formatted."
```

---

### Task 3: Make .mcp.json Portable (Remove Hardcoded Path)

**Why:** `.mcp.json` hardcodes `C:\\Users\\aolariu\\source\\repos\\arolariu\\arolariu.ro` for the filesystem MCP server, making it unusable for any other developer or CI environment.

**Files:**
- Modify: `.mcp.json`

**Step 1: Read the current .mcp.json**

Read: `.mcp.json`

**Step 2: Replace hardcoded path with a portable approach**

The filesystem MCP server should use a relative path or the `INIT_CWD` / project root convention. Replace the `args` array for the filesystem server:

```json
"filesystem": {
  "command": "cmd",
  "args": ["/c", "npx", "-y", "@anthropics/mcp-server-filesystem", "."]
}
```

Note: `.` resolves to the project root because Claude Code runs from the repo root.

**Step 3: Verify MCP server starts correctly**

Run: Restart Claude Code and verify the filesystem MCP server loads without errors.

**Step 4: Commit**

```bash
git add .mcp.json
git commit -m "fix(config): make .mcp.json portable with relative path

Replaced hardcoded C:\\Users\\aolariu path with '.' for the
filesystem MCP server so it works on any developer machine."
```

---

## Phase 2: Backend Security Hardening (High Priority)

These tasks fix security issues in the .NET backend API.

---

### Task 4: Fix Authorization Bypass (IsPrincipalSuperUser)

**Why:** `IsPrincipalSuperUser()` in `InvoiceEndpoints.cs` always returns `true`, meaning every authenticated user is treated as a super user. This bypasses all privilege checks.

**Files:**
- Modify: `sites/api.arolariu.ro/src/Invoices/Endpoints/InvoiceEndpoints.cs` (the method near line 95)
- Create: `sites/api.arolariu.ro/tests/arolariu.Backend.Domain.Tests/Invoices/Endpoints/IsPrincipalSuperUserTests.cs`

**Step 1: Write the failing test**

```csharp
[Fact]
public void IsPrincipalSuperUser_RegularUser_ReturnsFalse()
{
    // Arrange: Create a ClaimsPrincipal without the superuser role
    var claims = new[] { new Claim(ClaimTypes.Role, "User") };
    var identity = new ClaimsIdentity(claims, "TestAuth");
    var principal = new ClaimsPrincipal(identity);

    // Act
    var result = InvoiceEndpoints.IsPrincipalSuperUser(principal);

    // Assert
    Assert.False(result);
}

[Fact]
public void IsPrincipalSuperUser_AdminUser_ReturnsTrue()
{
    var claims = new[] { new Claim(ClaimTypes.Role, "SuperUser") };
    var identity = new ClaimsIdentity(claims, "TestAuth");
    var principal = new ClaimsPrincipal(identity);

    var result = InvoiceEndpoints.IsPrincipalSuperUser(principal);

    Assert.True(result);
}
```

**Step 2: Run test to verify it fails**

Run: `dotnet test sites/api.arolariu.ro/tests/arolariu.Backend.Domain.Tests --filter "IsPrincipalSuperUser" -v n`
Expected: FAIL - method always returns true.

**Step 3: Implement role-based check**

Replace the `IsPrincipalSuperUser` method body:

```csharp
private static bool IsPrincipalSuperUser(ClaimsPrincipal principal)
{
    return principal.IsInRole("SuperUser") || principal.IsInRole("Admin");
}
```

**Step 4: Run test to verify it passes**

Run: `dotnet test sites/api.arolariu.ro/tests/arolariu.Backend.Domain.Tests --filter "IsPrincipalSuperUser" -v n`
Expected: PASS

**Step 5: Commit**

```bash
git add sites/api.arolariu.ro/src/Invoices/Endpoints/InvoiceEndpoints.cs sites/api.arolariu.ro/tests/
git commit -m "fix(api): implement role-based IsPrincipalSuperUser check

Was hardcoded to return true. Now checks for SuperUser or Admin role
claims on the principal. Added unit tests for both cases."
```

---

### Task 5: Restrict CORS Policy

**Why:** `AddGeneralDomainConfiguration()` configures CORS with `AllowAnyOrigin()`, `AllowAnyMethod()`, `AllowAnyHeader()`. This allows any website to make authenticated requests to the API.

**Files:**
- Modify: `sites/api.arolariu.ro/src/Core/Domain/General/Extensions/WebApplicationBuilderExtensions.cs`

**Step 1: Read the current CORS configuration**

Read the file and find the CORS policy registration.

**Step 2: Replace AllowAnyOrigin with explicit origin list**

```csharp
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowTrustedOrigins", policy =>
    {
        policy.WithOrigins(
            "https://arolariu.ro",
            "https://www.arolariu.ro",
            "https://cv.arolariu.ro",
            "https://docs.arolariu.ro",
            "https://dev.arolariu.ro",
            "https://localhost:3000"  // Local development
        )
        .AllowAnyMethod()
        .AllowAnyHeader()
        .AllowCredentials();
    });
});
```

**Step 3: Update the middleware pipeline to use the named policy**

Find `app.UseCors(...)` and update to `app.UseCors("AllowTrustedOrigins")`.

**Step 4: Verify the API starts without errors**

Run: `cd sites/api.arolariu.ro && dotnet build src/Core -c Debug`
Expected: Build succeeds with 0 errors.

**Step 5: Commit**

```bash
git add sites/api.arolariu.ro/src/Core/
git commit -m "fix(api): restrict CORS to trusted origins only

AllowAnyOrigin was overly permissive. Now only arolariu.ro
subdomains and localhost are allowed. Credentials also enabled
for cookie-based auth."
```

---

### Task 6: Add Pagination to ReadAllInvoiceObjects

**Why:** `ReadAllInvoiceObjects()` returns `IEnumerable<Invoice>` with no pagination. For a Cosmos DB-backed service, this causes unbounded RU consumption and memory pressure.

**Files:**
- Modify: `sites/api.arolariu.ro/src/Invoices/Services/Foundation/InvoiceStorage/IInvoiceStorageFoundationService.cs`
- Modify: `sites/api.arolariu.ro/src/Invoices/Services/Foundation/InvoiceStorage/InvoiceStorageFoundationService.cs`
- Modify: Orchestration and Endpoint layers (propagate pagination parameters)

**Step 1: Define pagination parameters**

Add a `PaginationOptions` record to the Common project:

```csharp
public sealed record PaginationOptions(
    int PageSize = 25,
    string? ContinuationToken = null);

public sealed record PaginatedResult<T>(
    IReadOnlyList<T> Items,
    string? ContinuationToken,
    bool HasMore);
```

**Step 2: Update IInvoiceStorageFoundationService**

Change the signature:

```csharp
Task<PaginatedResult<Invoice>> ReadAllInvoiceObjects(
    Guid userIdentifier,
    PaginationOptions pagination,
    CancellationToken ct = default);
```

**Step 3: Implement in the foundation service**

Use Cosmos DB's `WithMaxItemCount` and continuation token support in the broker layer.

**Step 4: Propagate to orchestration and endpoint layers**

Update the orchestration service interface and endpoint handlers to accept and return pagination.

**Step 5: Add query parameters to the GET endpoint**

```
GET /rest/v1/invoices?pageSize=25&continuationToken=xyz
```

**Step 6: Run existing tests (expect some failures due to signature changes)**

Run: `dotnet test sites/api.arolariu.ro/tests -v n`
Fix any compilation errors from the signature change.

**Step 7: Commit**

```bash
git add sites/api.arolariu.ro/
git commit -m "feat(api): add cursor-based pagination to invoice listing

Prevents unbounded Cosmos DB queries. Uses continuation tokens
for efficient page-through. Default page size: 25."
```

---

## Phase 3: Tooling Standardization

---

### Task 7: Expand ESLint Config for All Workspaces

**Why:** `eslint.config.ts` only has a `websiteEslintConfig` for `sites/arolariu.ro`. The component library (packages/components) and CV site (sites/cv.arolariu.ro) have no dedicated lint rules, meaning they fall through to a generic or no configuration.

**Files:**
- Modify: `eslint.config.ts`

**Step 1: Read the current eslint.config.ts to understand the export structure**

Read: `eslint.config.ts`

**Step 2: Add a components config block**

Add a new config targeting `packages/components/**/*.{ts,tsx}` with React + TypeScript rules appropriate for a library (stricter export rules, no next/next rules).

**Step 3: Add a CV site config block**

Add a config for `sites/cv.arolariu.ro/**/*.{ts,svelte}` with Svelte-specific rules (eslint-plugin-svelte).

**Step 4: Verify lint runs without errors**

Run: `npx nx run-many -t lint --all`
Expected: All workspaces linted with appropriate rules.

**Step 5: Commit**

```bash
git add eslint.config.ts
git commit -m "feat(lint): add ESLint configs for component library and CV site

Previously only the website had a dedicated config. Components
now have library-specific rules and CV site has Svelte rules."
```

---

### Task 8: Standardize Test File Naming Convention

**Why:** The codebase uses both `.test.ts` and `.spec.ts` for unit tests. The vitest.config.ts includes `.test.*` and excludes `.spec.*` (Playwright E2E). But some component/layout unit tests use `.spec.ts`, causing them to be skipped by Vitest.

**Files:**
- Rename: All `.spec.{ts,tsx}` files in `sites/arolariu.ro/src/` to `.test.{ts,tsx}` (except Playwright tests in `tests/`)
- Modify: No config changes needed (convention is already documented)

**Step 1: Identify misnamed unit test files**

Run: Find all `.spec.ts` and `.spec.tsx` files inside `src/` (NOT inside `tests/` which are Playwright E2E):

```bash
find sites/arolariu.ro/src -name "*.spec.ts" -o -name "*.spec.tsx"
```

**Step 2: Rename each file from .spec to .test**

For each found file:
```bash
git mv path/to/File.spec.tsx path/to/File.test.tsx
```

**Step 3: Verify Vitest picks up the renamed tests**

Run: `npx vitest run --reporter=verbose 2>&1 | head -50`
Expected: Previously-skipped test files now appear in the test run.

**Step 4: Commit**

```bash
git add -A
git commit -m "fix(test): rename .spec files in src/ to .test for Vitest

Vitest only includes .test.* files. Files named .spec.* in src/
were silently skipped. Playwright E2E .spec files in tests/ are
unchanged."
```

---

### Task 9: Configure Storybook Dev Target for Components

**Why:** `packages/components/project.json` has `"dev": "echo 'No dev target configured'"` instead of a working Storybook dev server. This blocks local component development.

**Files:**
- Modify: `packages/components/project.json`
- Modify: `packages/components/package.json` (if no storybook dev script exists)

**Step 1: Check if Storybook scripts exist in package.json**

Read: `packages/components/package.json`

**Step 2: Add or wire up the Storybook dev script**

In `packages/components/project.json`, update the dev target:

```json
"dev": {
  "command": "npx storybook dev -p 6006",
  "options": {
    "cwd": "packages/components"
  }
}
```

Or if it should delegate to the root:

```json
"dev": {
  "executor": "nx:run-commands",
  "options": {
    "command": "npm run dev:components",
    "cwd": "."
  }
}
```

**Step 3: Verify Storybook starts**

Run: `npx nx dev components`
Expected: Storybook opens at http://localhost:6006

**Step 4: Commit**

```bash
git add packages/components/project.json packages/components/package.json
git commit -m "fix(components): configure Storybook dev target

Was a no-op echo. Now starts Storybook on port 6006 for
local component development."
```

---

## Phase 4: CI/CD Optimization

---

### Task 10: Enable Docker BuildKit Layer Caching

**Why:** Both the frontend and backend Dockerfiles rebuild from scratch on every CI run. Docker BuildKit with registry caching can save 5-10 minutes per build.

**Files:**
- Modify: `.github/workflows/official-website-build.yml`
- Modify: `.github/workflows/official-api-trigger.yml`

**Step 1: Read the website build workflow**

Read: `.github/workflows/official-website-build.yml`

**Step 2: Add BuildKit cache-from/cache-to flags**

In the docker build step, add:

```yaml
- name: Build Docker image
  run: |
    docker buildx build \
      --cache-from type=registry,ref=${{ env.ACR_LOGIN_SERVER }}/website:cache \
      --cache-to type=registry,ref=${{ env.ACR_LOGIN_SERVER }}/website:cache,mode=max \
      --tag ${{ env.ACR_LOGIN_SERVER }}/website:${{ env.TAG }} \
      --file sites/arolariu.ro/Dockerfile \
      --push \
      .
```

**Step 3: Add docker buildx setup step before build**

```yaml
- name: Set up Docker Buildx
  uses: docker/setup-buildx-action@v3
```

**Step 4: Apply the same pattern to the API workflow**

Read and modify `.github/workflows/official-api-trigger.yml` with identical caching.

**Step 5: Commit**

```bash
git add .github/workflows/official-website-build.yml .github/workflows/official-api-trigger.yml
git commit -m "perf(ci): enable Docker BuildKit layer caching

Uses ACR registry as cache backend. Saves 5-10 min per build
by reusing unchanged layers across runs."
```

---

### Task 11: Add .dockerignore Files

**Why:** Without `.dockerignore`, the entire monorepo (node_modules, .next, .git, code-cov) is sent to the Docker daemon as build context, slowing builds and risking secret leakage.

**Files:**
- Create: `sites/arolariu.ro/.dockerignore`
- Create: `sites/api.arolariu.ro/.dockerignore`

**Step 1: Create frontend .dockerignore**

```
# Build artifacts
**/node_modules
**/.next
**/dist
**/build
**/out

# Test & coverage
**/code-cov
**/coverage
**/test-results
**/.playwright

# Source control
.git
.gitignore

# IDE & OS
.vscode
.vs
*.swp
Thumbs.db

# Environment files
**/.env
**/.env.*
!**/.env.example

# Documentation & plans
docs/
*.md
!README.md

# Infrastructure
infra/
```

**Step 2: Create backend .dockerignore**

```
# Build artifacts
**/bin
**/obj
**/node_modules

# Test & coverage
**/code-cov
**/coverage
**/TestResults

# Source control
.git
.gitignore

# IDE & OS
.vscode
.vs
*.swp
*.user

# Environment files
**/.env
**/appsettings.*.json
!**/appsettings.json

# Documentation
docs/
*.md
!README.md

# Infrastructure & frontend
infra/
sites/arolariu.ro/
sites/cv.arolariu.ro/
sites/docs.arolariu.ro/
packages/
```

**Step 3: Verify Docker build context is smaller**

Run: `docker build --no-cache --progress=plain -f sites/arolariu.ro/Dockerfile . 2>&1 | head -5`
Expected: "sending build context" shows significantly less data.

**Step 4: Commit**

```bash
git add sites/arolariu.ro/.dockerignore sites/api.arolariu.ro/.dockerignore
git commit -m "perf(docker): add .dockerignore files for both sites

Reduces build context by excluding node_modules, .git, coverage,
docs, and infrastructure from Docker daemon transfer."
```

---

### Task 12: Deduplicate PR Hygiene Comments

**Why:** `official-hygiene-check-v2.yml` creates a new PR comment on every push, spamming the conversation. It should update an existing comment instead.

**Files:**
- Modify: `.github/workflows/official-hygiene-check-v2.yml` (summary job)
- Modify: `.github/scripts/src/runHygieneCheckV2.ts` (if comment logic is there)

**Step 1: Read the summary job in the hygiene workflow**

Read: `.github/workflows/official-hygiene-check-v2.yml`

**Step 2: Replace create-comment with find-and-update pattern**

Use `peter-evans/find-comment` + `peter-evans/create-or-update-comment`:

```yaml
- name: Find existing hygiene comment
  uses: peter-evans/find-comment@v3
  id: find-comment
  with:
    issue-number: ${{ github.event.pull_request.number }}
    comment-author: 'github-actions[bot]'
    body-includes: '<!-- hygiene-check-v2 -->'

- name: Create or update hygiene comment
  uses: peter-evans/create-or-update-comment@v4
  with:
    comment-id: ${{ steps.find-comment.outputs.comment-id }}
    issue-number: ${{ github.event.pull_request.number }}
    body: |
      <!-- hygiene-check-v2 -->
      ${{ steps.generate-summary.outputs.comment-body }}
    edit-mode: replace
```

**Step 3: Verify on a test PR**

Push a change and verify only one comment appears (updated, not duplicated).

**Step 4: Commit**

```bash
git add .github/workflows/official-hygiene-check-v2.yml
git commit -m "fix(ci): deduplicate PR hygiene check comments

Uses find-comment + create-or-update pattern to edit the existing
comment instead of posting a new one on every push."
```

---

## Phase 5: Documentation & Standards

---

### Task 13: Update CLAUDE.md RFC Table

**Why:** CLAUDE.md's RFC table is missing RFC 1002 (JSDoc/TSDoc Standard) and RFC 1008 (SCSS System Architecture), both of which are implemented and actively used.

**Files:**
- Modify: `CLAUDE.md`

**Step 1: Read the current RFC table in CLAUDE.md**

Read: `CLAUDE.md` and find the RFC table section.

**Step 2: Add missing RFCs to the table**

Add these rows to the RFC table:

```markdown
| RFC 1002 | JSDoc/TSDoc Documentation Standard |
| RFC 1008 | SCSS System Architecture (7-1 Pattern) |
```

**Step 3: Verify the table is complete against docs/rfc/**

Run: List all RFC files in `docs/rfc/` and confirm each has a table entry.

**Step 4: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: add RFC 1002 and RFC 1008 to CLAUDE.md reference table

Both RFCs are implemented and actively used but were missing from
the AI agent quick reference."
```

---

### Task 14: Add Nx Workspace Visualization and Documentation

**Why:** The Nx configuration lacks documentation about which projects override the base vitest/tsconfig configs and why. Developers (and AI agents) need to quickly understand the dependency graph.

**Files:**
- Modify: `nx.json` (add sharedGlobals entries for .prettierignore)
- Create: Document the project graph in CLAUDE.md

**Step 1: Add missing sharedGlobals entry**

Add `.prettierignore` to the sharedGlobals array in nx.json (it affects formatting behavior).

**Step 2: Document project-level config overrides in CLAUDE.md**

Add a section to CLAUDE.md:

```markdown
### Config Override Map
| Project | vitest.config.ts | tsconfig.json | eslint |
|---------|-----------------|---------------|--------|
| Root (base) | 90% coverage, jsdom | strictest, noEmit | 20+ plugins |
| arolariu.ro | +alias @/, excludes .next | +paths @/*, relaxed exactOptional | websiteEslintConfig |
| components | 85% branch threshold | +jsx, react-jsx | (needs config) |
| cv.arolariu.ro | excludes /data/ | +svelte, SvelteKit extends | (needs config) |
```

**Step 3: Commit**

```bash
git add nx.json CLAUDE.md
git commit -m "docs: add config override map and fix nx sharedGlobals

Helps developers understand which projects override base configs
and why. Also adds .prettierignore to Nx cache invalidation."
```

---

## Phase 6: Backend Validation & Resilience

---

### Task 15: Implement Invoice Validation Methods

**Why:** `InvoiceStorageFoundationService.Validations.cs` has empty method bodies with TODO comments. This means invoices can be created/updated with invalid data.

**Files:**
- Modify: `sites/api.arolariu.ro/src/Invoices/Services/Foundation/InvoiceStorage/InvoiceStorageFoundationService.Validations.cs`
- Create: `sites/api.arolariu.ro/tests/arolariu.Backend.Domain.Tests/Invoices/Services/Foundation/InvoiceStorageValidationTests.cs`

**Step 1: Write failing tests for validation rules**

```csharp
[Fact]
public void ValidateInvoice_NullInvoice_ThrowsValidationException()
{
    // Arrange
    Invoice? invoice = null;

    // Act & Assert
    Assert.Throws<InvoiceStorageFoundationValidationException>(
        () => _service.ValidateInvoiceInformationIsValid(invoice!));
}

[Fact]
public void ValidateInvoice_EmptyId_ThrowsValidationException()
{
    var invoice = new Invoice { Id = Guid.Empty };

    Assert.Throws<InvoiceStorageFoundationValidationException>(
        () => _service.ValidateInvoiceInformationIsValid(invoice));
}
```

**Step 2: Run tests to verify they fail**

Run: `dotnet test sites/api.arolariu.ro/tests --filter "ValidateInvoice" -v n`
Expected: FAIL (empty method body doesn't throw).

**Step 3: Implement validation logic**

```csharp
private static void ValidateInvoiceInformationIsValid(Invoice invoice)
{
    switch (invoice)
    {
        case null:
            throw new InvoiceStorageFoundationValidationException(
                new InvoiceIdNotSetException());
        case { Id: var id } when id == Guid.Empty:
            throw new InvoiceStorageFoundationValidationException(
                new InvoiceIdNotSetException());
        case { CreatedBy: var cb } when cb == Guid.Empty:
            throw new InvoiceStorageFoundationValidationException(
                new InvoiceIdNotSetException());
    }
}
```

**Step 4: Run tests to verify they pass**

Run: `dotnet test sites/api.arolariu.ro/tests --filter "ValidateInvoice" -v n`
Expected: PASS

**Step 5: Commit**

```bash
git add sites/api.arolariu.ro/
git commit -m "feat(api): implement invoice validation in foundation service

Empty validation methods now enforce non-null, non-empty ID,
and non-empty CreatedBy. Prevents invalid invoices from reaching
the Cosmos DB broker."
```

---

## Phase 7: Script Improvements

---

### Task 16: Fix test-e2e.ts Runtime JSON Mutation

**Why:** `test-e2e.ts` modifies the Postman collection JSON file at runtime to inject auth tokens. This is not thread-safe and could leave the file in a dirty state in git.

**Files:**
- Modify: `scripts/test-e2e.ts`

**Step 1: Read the current test-e2e.ts**

Read: `scripts/test-e2e.ts`

**Step 2: Replace JSON mutation with Newman environment variables**

Instead of modifying the collection JSON, pass the auth token via Newman's `--env-var` flag:

```typescript
const newmanArgs = [
  'run', collectionPath,
  '--env-var', `authToken=${process.env.E2E_TEST_AUTH_TOKEN}`,
  '--reporters', 'json,junit',
  '--reporter-json-export', `${reportDir}/report.json`,
  '--reporter-junit-export', `${reportDir}/report.xml`,
];
```

**Step 3: Update the Postman collection to use {{authToken}} variable**

Ensure the collection references `{{authToken}}` in its auth headers (this should already be the case).

**Step 4: Verify E2E tests still pass locally**

Run: `E2E_TEST_AUTH_TOKEN=test npm run test:e2e:backend`
Expected: Newman runs without JSON file modification.

**Step 5: Commit**

```bash
git add scripts/test-e2e.ts
git commit -m "fix(scripts): use env vars instead of mutating collection JSON

test-e2e.ts was modifying the Postman collection file at runtime
to inject auth tokens. Now uses Newman --env-var flag instead."
```

---

### Task 17: Add Environment Config Validation Schema

**Why:** `generate.env.ts` accepts any string value for environment variables without type validation. Invalid values can propagate to deployment.

**Files:**
- Modify: `scripts/generate.env.ts`

**Step 1: Read the current generate.env.ts**

Read: `scripts/generate.env.ts`

**Step 2: Add a Zod validation schema for required env vars**

```typescript
import { z } from 'zod';

const envSchema = z.object({
  NEXT_PUBLIC_SITE_URL: z.string().url(),
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: z.string().startsWith('pk_'),
  CLERK_SECRET_KEY: z.string().startsWith('sk_'),
  AZURE_TENANT_ID: z.string().uuid(),
  AZURE_SUBSCRIPTION_ID: z.string().uuid(),
  RESEND_API_KEY: z.string().startsWith('re_'),
  // ... add other keys with their validation rules
});
```

**Step 3: Validate after generation, before writing**

```typescript
const result = envSchema.safeParse(envVars);
if (!result.success) {
  console.error('Invalid environment configuration:');
  for (const issue of result.error.issues) {
    console.error(`  ${issue.path.join('.')}: ${issue.message}`);
  }
  process.exit(1);
}
```

**Step 4: Verify the generator validates correctly**

Run: `npm run generate /env /verbose`
Expected: Validation passes for valid configs, fails with clear messages for invalid ones.

**Step 5: Commit**

```bash
git add scripts/generate.env.ts
git commit -m "feat(scripts): add Zod validation to env config generation

Catches invalid environment values (malformed URLs, wrong key
prefixes, invalid UUIDs) before they reach deployment."
```

---

## Phase 8: Performance & Build Optimization

---

### Task 18: Leverage Nx Cache in CI

**Why:** GitHub Actions workflows rebuild everything from scratch. Nx has robust computation caching that can skip unchanged targets, but it's not configured in CI.

**Files:**
- Modify: `.github/actions/setup-workspace/action.yml`
- Modify: `.github/workflows/official-hygiene-check-v2.yml`

**Step 1: Add Nx cache to the setup-workspace composite action**

Add a cache step for the Nx cache directory:

```yaml
- name: Cache Nx computation
  uses: actions/cache@v4
  with:
    path: .nx/cache
    key: ${{ runner.os }}-nx-${{ hashFiles('**/package-lock.json') }}-${{ github.sha }}
    restore-keys: |
      ${{ runner.os }}-nx-${{ hashFiles('**/package-lock.json') }}-
      ${{ runner.os }}-nx-
```

**Step 2: Use nx affected instead of nx run-many in CI**

In the hygiene workflow, replace full runs with affected runs:

```yaml
- run: npx nx affected -t test --base=origin/main --head=HEAD
```

**Step 3: Verify cache hits on second run**

Push two commits in a row and verify the second build shows `[remote cache]` or `[local cache]` markers.

**Step 4: Commit**

```bash
git add .github/actions/setup-workspace/action.yml .github/workflows/official-hygiene-check-v2.yml
git commit -m "perf(ci): enable Nx computation caching in GitHub Actions

Caches .nx/cache across runs and uses 'nx affected' to skip
unchanged targets. Expected to reduce CI time by 30-50%."
```

---

### Task 19: Add Docker Healthcheck to Frontend Dockerfile

**Why:** The backend Dockerfile has a `HEALTHCHECK` instruction but the frontend does not. Container orchestrators (Azure App Service, Kubernetes) need healthchecks to know when the app is ready.

**Files:**
- Modify: `sites/arolariu.ro/Dockerfile`

**Step 1: Read the current Dockerfile**

Read: `sites/arolariu.ro/Dockerfile`

**Step 2: Add HEALTHCHECK before CMD**

```dockerfile
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/ || exit 1
```

Note: Uses `wget` (available in alpine) instead of `curl` to avoid installing extra packages.

**Step 3: Verify the healthcheck works locally**

Run: `docker build -f sites/arolariu.ro/Dockerfile -t website:test . && docker run -d --name website-test website:test && sleep 15 && docker inspect --format='{{.State.Health.Status}}' website-test`
Expected: Output shows `healthy`.

**Step 4: Clean up**

```bash
docker stop website-test && docker rm website-test
```

**Step 5: Commit**

```bash
git add sites/arolariu.ro/Dockerfile
git commit -m "feat(docker): add healthcheck to frontend container

Uses wget to probe localhost:3000 every 30s with 10s startup grace.
Enables proper readiness detection by container orchestrators."
```

---

## Summary & Task Dependencies

```
Phase 1: Config Consolidation
  Task 1: Prettier dedup ────────┐
  Task 2: .prettierignore fix ───┤ (independent, can parallel)
  Task 3: .mcp.json portability ─┘

Phase 2: Backend Security
  Task 4: Auth bypass fix ───────┐
  Task 5: CORS restriction ─────┤ (independent, can parallel)
  Task 6: Pagination ───────────┘

Phase 3: Tooling Standardization
  Task 7: ESLint multi-workspace ┐
  Task 8: Test naming ──────────┤ (independent, can parallel)
  Task 9: Storybook dev target ─┘

Phase 4: CI/CD Optimization
  Task 10: Docker BuildKit ──────┐
  Task 11: .dockerignore ────────┤ (independent, can parallel)
  Task 12: PR comment dedup ─────┘

Phase 5: Documentation
  Task 13: CLAUDE.md RFC table ──┐ (independent, can parallel)
  Task 14: Config override map ──┘

Phase 6: Backend Validation
  Task 15: Invoice validation ──── (depends on Task 4 commit)

Phase 7: Script Improvements
  Task 16: test-e2e.ts fix ──────┐ (independent, can parallel)
  Task 17: Env config schema ────┘

Phase 8: Performance
  Task 18: Nx CI caching ────────┐
  Task 19: Frontend healthcheck ─┘ (independent, can parallel)
```

**Total: 19 tasks across 8 phases**

Phases 1-2 are highest priority (fix active bugs and security issues).
Phases 3-4 improve developer experience and CI speed.
Phases 5-8 are incremental improvements.

Each phase's tasks are independent and can be executed in parallel by a swarm of copilot agents. Cross-phase dependencies are noted above.

---

**Estimated execution time:** 2-4 hours with parallel agents (1 agent per task within each phase).
