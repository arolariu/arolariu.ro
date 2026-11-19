# Testing Architecture

> Guidelines for writing and maintaining tests in the arolariu.ro website.

## Quick Reference

| What             | Command                                                      |
| ---------------- | ------------------------------------------------------------ |
| Full unit suite  | `npm run test:unit`                                          |
| Run one file     | `npx vitest run src/lib/utils.generic.test.ts`               |
| Watch mode       | `npx vitest`                                                 |
| Website coverage | `npx vitest run src emails --coverage.reporter=text-summary` |

Run these commands from `sites/arolariu.ro`. Coverage needs no flag: the root `vitest.config.ts` sets `coverage.enabled: true`.

**Test files are colocated with source code** — place `foo.test.ts` next to `foo.ts`. Use `.test.ts(x)` suffix for Vitest. `.spec.ts(x)` is
reserved for Playwright E2E.

`npm run test:unit` runs three disjoint projects. `vitest.config.ts` selects plain `*.test.ts` files by path and routes `*.lean.test.tsx`
and `*.http.test.tsx` files by suffix. The `website-lean` project has no shared setup or legacy server aliases. Utilities, validators,
parsers, and email rendering tests run in Node; export, navigation, and preferences tests opt into Happy DOM and supply only the boundaries
they consume. The `server-http` project runs the real invoice actions, configuration, JWT signing, and transport. Its setup uses synthetic
configuration, substitutes Clerk, and intercepts HTTP. The action tests run in Node; dialog and wizard tests select Happy DOM in the same
project so they can exercise the real actions from the UI without legacy aliases. Tests that reach Next.js cache invalidation or routing
substitute those framework boundaries. The `website` project still uses the legacy stubs for the remaining suites.

The scan action suites in `server-http` use the real configuration and storage adapter. `tests/setup/blob-sdk.ts` supplies only the Azure
SDK boundary and a test-only storage endpoint response; the repository still chooses the container, maps metadata, and sends decoded bytes.

Prefer the real repository implementation for new tests. The legacy aliases below document existing migration debt, not seams to add to new
tests.

---

## Legacy DOM Test Stubs

```
┌─────────────────────────────────────────────────────────┐
│  Tier 1: STUBS  (tests/stubs/)                          │
│  Module aliases resolved by Vitest before import.       │
│  Replace server-only modules that crash in happy-dom.   │
│  Use vi.fn(impl) — survives restoreMocks: true.         │
├─────────────────────────────────────────────────────────┤
│  Tier 2: GLOBAL MOCKS  (vitest.setup.ts)                │
│  vi.mock() calls applied to every test file.            │
│  Browser APIs and SDK shims (next/navigation, Clerk).   │
├─────────────────────────────────────────────────────────┤
│  Tier 3: PER-TEST MOCKS  (inline in test files)         │
│  vi.mock() + vi.hoisted() for module-specific behavior. │
│  Resend class, specific server actions, etc.            │
└─────────────────────────────────────────────────────────┘
```

### Resolution order

1. **Alias resolution** (vitest.config.ts): `@/instrumentation.server` → `tests/stubs/instrumentation.server.ts`
2. **Global mocks** (vitest.setup.ts): `vi.mock("next/navigation", ...)` applied to all tests
3. **Per-test mocks** (test file): `vi.mock("resend", ...)` applied to that test only

If a module has a stub, the stub IS the module — no `vi.mock()` needed in vitest.setup.ts. Tests should not inline-mock aliased stubs just
to set return values; import the stubbed export and configure it with `vi.mocked(...)` instead.

---

## Tier 1: Stubs

**Location**: `tests/stubs/`

Stubs are for modules that **cannot be imported** in happy-dom because they:

- Import `server-only` (Next.js build-time marker)
- Import heavy Node.js SDKs (@azure/monitor-opentelemetry-exporter, etc.)
- Use Node.js-only APIs not available in happy-dom

### Stubbed Modules

| Stub File                            | Replaces                            | Why                                     |
| ------------------------------------ | ----------------------------------- | --------------------------------------- |
| `server-only.ts`                     | `server-only`                       | No-op (build marker)                    |
| `instrumentation.server.ts`          | `@/instrumentation.server`          | OTel SDKs crash in happy-dom            |
| `lib/config/configProxy.ts`          | `@/lib/config/configProxy`          | Imports server-only + Azure credentials |
| `lib/utils.server.ts`                | `@/lib/utils.server`                | Imports server-only + jose              |
| `lib/azure/storageClient.ts`         | `@/lib/azure/storageClient`         | Imports server-only + Azure Blob SDK    |
| `lib/actions/storage/fetchConfig.ts` | `@/lib/actions/storage/fetchConfig` | Server action                           |
| `lib/actions/user/fetchUser.ts`      | `@/lib/actions/user/fetchUser`      | Server action (Clerk + JWT)             |

### Key: `vi.fn(impl)` vs `vi.fn()`

```typescript
// vi.fn(impl) — original implementation SURVIVES restoreMocks
export const withSpan = vi.fn((_name, fn) => fn());
// After mockRestore(): withSpan still calls fn() ✅

// vi.fn() — bare mock, tests must set return values
export const fetchApiUrl = vi.fn();
// After mockRestore(): fetchApiUrl returns undefined (as expected) ✅
```

Use `vi.fn(impl)` for passthrough behavior (withSpan, rewriteAzuriteUrl). Use `vi.fn()` for functions whose return value tests must control.

### Configuring stubbed exports

```typescript
import {fetchBFFUserFromAuthService} from "@/lib/actions/user/fetchUser";

const mockFetchBFFUserFromAuthService = vi.mocked(fetchBFFUserFromAuthService);

beforeEach(() => {
  mockFetchBFFUserFromAuthService.mockResolvedValue({
    user: null,
    userIdentifier: "test-user",
    userJwt: "test-jwt",
  });
});
```

---

## Tier 2: Global Mocks

**Location**: `vitest.setup.ts`

These apply to the `website` (DOM) project only:

| Module or setup             | Mock behavior                                                                                            |
| --------------------------- | -------------------------------------------------------------------------------------------------------- |
| Setup imports               | `@testing-library/jest-dom/vitest` matchers and `fake-indexeddb/auto` (in-memory IndexedDB)              |
| `RESEND_API_KEY`            | Set to a fake key in `process.env`                                                                       |
| `next/navigation`           | `useRouter()` returns push/replace/back/prefetch fns; `usePathname` returns "/"; empty `useSearchParams` |
| `next/cache`                | `revalidatePath` and `revalidateTag` are `vi.fn()`                                                       |
| `next/font/google`          | `Atkinson_Hyperlegible` and `Caudex` return mock font objects                                            |
| `next-intl`                 | Real module plus `useTranslations` (returns key paths), `useLocale` (`"en"`), and a stub `useFormatter`  |
| `next-intl-selector`        | Real module plus `useTranslations` returning `mockSelectorTranslator()` (`next-intl-selector/testing`)   |
| `next-intl-selector/server` | Real module plus `getTranslations` returning `mockSelectorTranslator()`                                  |
| `@clerk/nextjs`             | Signed-out `useUser`/`useAuth`; passthrough `ClerkProvider`; `Show`, `SignInButton`, `UserButton` stubs  |
| `@opentelemetry/*`          | Real `api` (stub fallback if import fails); empty `sdk-logs`, `sdk-trace-base`, `resources`              |
| `@azure/*`                  | `vi.fn()` constructors for `storage-blob`/`identity`; empty `app-configuration` (avoids CJS/ESM crashes) |

### Overriding global mocks in a test

The global `next/navigation` mock defines `useRouter` as a plain function, not `vi.fn()`, so `vi.mocked(useRouter).mockReturnValue(...)`
throws against it. Re-mock the module in the test file with `vi.fn()` exports, then configure them:

```typescript
vi.mock("next/navigation", () => ({
  useRouter: vi.fn(),
  usePathname: () => "/",
  useSearchParams: () => new URLSearchParams(),
}));

import {useRouter} from "next/navigation";
const mockUseRouter = vi.mocked(useRouter);

beforeEach(() => {
  mockUseRouter.mockReturnValue({
    push: vi.fn(),
    replace: vi.fn(),
    // ... custom behavior for this test
  } as never);
});
```

---

## Tier 3: Per-Test Mocks

For new tests, isolate only external boundaries: network, Clerk, framework runtime APIs, SDK clients, or browser APIs. Import deterministic
internal code directly and assert its real output. For server entry points that need Node runtime dependencies, use the `server-http`
project instead of adding another server implementation stub.

### Pattern A: Simple auto-mock + vi.mocked()

Use when you just need to control a module's return values:

```typescript
vi.mock("@/app/domains/invoices/_actions/invoices/fetchInvoice");

import {fetchInvoice} from "@/app/domains/invoices/_actions/invoices/fetchInvoice";
const mockFetchInvoice = vi.mocked(fetchInvoice);

beforeEach(() => {
  mockFetchInvoice.mockResolvedValue({success: true, data: testInvoice});
});
```

### Pattern B: `vi.hoisted()` + factory (for complex mocks)

Use when the mock needs constructor behavior or chained objects:

```typescript
// 1. Hoist mock references (runs BEFORE imports)
const {mockSendEmail} = vi.hoisted(() => ({
  mockSendEmail: vi.fn(),
}));

// 2. Use hoisted refs in factory
vi.mock("resend", () => ({
  Resend: class MockResend {
    emails = {send: mockSendEmail};
  },
}));

// 3. Import normally (gets the mock)
import {Resend} from "resend";

// 4. Assert in tests
expect(mockSendEmail).toHaveBeenCalledWith({to: "user@test.com", ...});
```

### Pattern C: Azure Blob storage (aliased stub)

`@/lib/azure/storageClient` resolves to the Tier 1 stub, where Blob helpers such as `uploadBlobObject` are bare `vi.fn()`s. Import the
helper the code under test calls and configure it in `beforeEach`; do not rebuild the Blob client chain:

```typescript
import {uploadBlobObject} from "@/lib/azure/storageClient";

const mockUploadBlobObject = vi.mocked(uploadBlobObject);

beforeEach(() => {
  mockUploadBlobObject.mockResolvedValue(testBlobObject); // a BlobObject fixture
});
```

Only `src/lib/azure/storageClient.test.ts` exercises `createBlobClient`: it calls `vi.unmock("@/lib/azure/storageClient")` and tests the
real module against a mocked `@azure/storage-blob`.

---

## Test Helpers

**Location**: `tests/helpers/`

### `renderWithProviders()`

Renders with a passthrough wrapper (no provider yet); the `messages` and `locale` options are currently ignored. Import the helpers barrel
by relative path; there is no `@tests` alias:

```tsx
// src/components/MyComponent.test.tsx
import {renderWithProviders, screen} from "../../tests/helpers";

it("renders title", () => {
  renderWithProviders(<MyComponent title='Hello' />);
  expect(screen.getByText("Hello")).toBeInTheDocument();
});
```

---

## Speed and Flake Guardrails

- Prefer awaiting public hook callbacks inside `act` and then asserting the settled state directly. Use `invokeHookCallback()` from the
  shared `tests/helpers` barrel for callback hooks that already return a promise.
- Use `waitFor` when the code under test schedules work independently of the awaited action, such as `useEffect` fetches, debounced work,
  timers, or browser API callbacks.
- Do not wrap an already-awaited hook callback with an extra `waitFor` just to assert that `isSaving`, `isDeleting`, or similar flags
  returned to `false`.
- Keep `await import(...)` only when the test intentionally controls module evaluation order with `vi.doMock`, `vi.unmock`,
  `vi.resetModules`, or environment mutation before import.
- Measure before optimizing. Runtime-only refactors should include before/after timing for the changed files or explain why a hotspot was
  intentionally left alone.

---

## Important Gotchas

### `restoreMocks: true` in base config

The root `vitest.config.ts` sets `mockReset: true`, `clearMocks: true`, `restoreMocks: true`. This means between tests:

- All `mockImplementation()` calls are stripped
- All `mockReturnValue()` / `mockResolvedValue()` calls are cleared
- `vi.fn(impl)` reverts to `impl` (the "original")
- Bare `vi.fn()` reverts to returning `undefined`

**Always set mock return values in `beforeEach()`**, never at module scope.

### `vi.hoisted()` is synchronous

You cannot `await import()` inside `vi.hoisted()`. Only use it to create mock objects (`vi.fn()`, plain objects, class constructors).

### Import order in test files

```typescript
// 1. vi.hoisted() — creates mock references
// 2. vi.mock() — registers mock factories (hoisted above imports)
// 3. import — gets the mocked versions
// 4. describe/it — test cases

// ⚠️ vi.mock() factories run BEFORE imports, so they can only reference
//    variables from vi.hoisted() or inline literals.
```

---

## Coverage

Thresholds (enforced in CI): **90%** for statements, branches, functions, and lines.

Effective exclusions are the union of the `coverage.exclude` arrays in the [root `vitest.config.ts`](../../../vitest.config.ts) and the
[site `vitest.config.ts`](../vitest.config.ts). Besides build output, generated files, Storybook, `tests/`, test and spec files, config and
setup files, and the OTel bootstrap (`instrumentation.ts`, `instrumentation.server.ts`), these are excluded:

- Type definitions: `**/*.d.ts`, `**/types/**/*.ts`
- Side-effect infrastructure: `**/telemetry.ts`, `**/proxy.ts`
- Presentational and template files: `**/emails/**/*.tsx`, `**/export/InvoicePDF.tsx`, `src/components/Navigation.tsx`,
  `src/app/_components/PreferencesSubscriptions.tsx`, `**/*.stories.tsx`
- Styles: `**/*.css`, `**/*.scss`, `**/*.module.scss`

---

## Directory Layout

```
sites/arolariu.ro/
├── tests/
│   ├── stubs/                 ← Tier 1: module alias stubs
│   ├── helpers/               ← Shared Vitest utilities (renderWithProviders, invokeHookCallback, chart layout)
│   │   └── builders/          ← Test data builders (TestDataBuilder)
│   ├── config/                ← Playwright environment, projects, and reporters
│   ├── fixtures/              ← Playwright fixtures (a11y, base, navigation)
│   ├── page-objects/          ← Playwright page objects (BasePage, header, footer)
│   ├── utils/                 ← Playwright E2E utilities (tags, assertions, logger)
│   ├── container/             ← Container runtime-configuration smoke test (run by CI)
│   ├── global-setup.ts        ← Playwright global setup
│   ├── global-teardown.ts     ← Playwright global teardown
│   ├── playwright-helpers.ts  ← Playwright navigation retry helpers
│   └── README.md              ← This file
├── playwright.config.ts       ← Playwright E2E config
├── vitest.config.ts           ← Alias resolution + coverage config
├── vitest.setup.ts            ← Tier 2: global mocks
└── src/
    ├── **/*.test.ts(x)        ← Tier 3: Vitest tests colocated with source
    └── **/*.spec.tsx          ← Playwright E2E specs colocated with source
```
