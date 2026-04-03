# Testing Architecture

> Guidelines for writing and maintaining tests in the arolariu.ro website.

## Quick Reference

| What | Command |
|------|---------|
| Run all tests | `npm run test:website` |
| Run one file | `npx vitest run src/lib/utils.generic.test.ts` |
| Watch mode | `npx vitest --project=website` |
| Coverage | `npm run test:unit` |

**Test files are colocated with source code** — place `foo.test.ts` next to `foo.ts`.
Use `.test.ts(x)` suffix for Vitest. `.spec.ts(x)` is reserved for Playwright E2E.

---

## Mock Architecture (3 Tiers)

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

If a module has a stub, the stub IS the module — no `vi.mock()` needed in vitest.setup.ts.

---

## Tier 1: Stubs

**Location**: `tests/stubs/`

Stubs are for modules that **cannot be imported** in happy-dom because they:
- Import `server-only` (Next.js build-time marker)
- Import heavy Node.js SDKs (@azure/monitor-opentelemetry-exporter, etc.)
- Use Node.js-only APIs not available in happy-dom

### Stubbed Modules

| Stub File | Replaces | Why |
|-----------|----------|-----|
| `server-only.ts` | `server-only` | No-op (build marker) |
| `instrumentation.server.ts` | `@/instrumentation.server` | OTel SDKs crash in happy-dom |
| `lib/config/configProxy.ts` | `@/lib/config/configProxy` | Imports server-only + Azure credentials |
| `lib/utils.server.ts` | `@/lib/utils.server` | Imports server-only + jose |
| `lib/azure/storageClient.ts` | `@/lib/azure/storageClient` | Imports server-only + Azure Blob SDK |
| `lib/actions/storage/fetchConfig.ts` | `@/lib/actions/storage/fetchConfig` | Server action |
| `lib/actions/user/fetchUser.ts` | `@/lib/actions/user/fetchUser` | Server action (Clerk + JWT) |

### Key: `vi.fn(impl)` vs `vi.fn()`

```typescript
// vi.fn(impl) — original implementation SURVIVES restoreMocks
export const withSpan = vi.fn((_name, fn) => fn());
// After mockRestore(): withSpan still calls fn() ✅

// vi.fn() — bare mock, tests must set return values
export const fetchApiUrl = vi.fn();
// After mockRestore(): fetchApiUrl returns undefined (as expected) ✅
```

Use `vi.fn(impl)` for passthrough behavior (withSpan, rewriteAzuriteUrl).
Use `vi.fn()` for functions whose return value tests must control.

---

## Tier 2: Global Mocks

**Location**: `vitest.setup.ts`

These apply to ALL test files automatically:

| Module | Mock Behavior |
|--------|---------------|
| `next/navigation` | useRouter returns push/replace/back fns, usePathname returns "/" |
| `next-intl` | useTranslations returns key passthrough, useLocale returns "en" |
| `@clerk/nextjs` | useUser/useAuth return unauthenticated state |
| `@opentelemetry/*` | Empty or try-import with fallback |
| `@azure/*` | Empty constructors to prevent CJS resolution crashes |

### Overriding global mocks in a test

```typescript
// Use vi.mocked() for type-safe access
import {useRouter} from "next/navigation";
const mockRouter = vi.mocked(useRouter);

beforeEach(() => {
  mockRouter.mockReturnValue({
    push: vi.fn(),
    replace: vi.fn(),
    // ... custom behavior for this test
  });
});
```

---

## Tier 3: Per-Test Mocks

### Pattern A: Simple auto-mock + vi.mocked()

Use when you just need to control a module's return values:

```typescript
vi.mock("@/lib/actions/invoices/fetchInvoice");

import {fetchInvoice} from "@/lib/actions/invoices/fetchInvoice";
const mockFetchInvoice = vi.mocked(fetchInvoice);

beforeEach(() => {
  mockFetchInvoice.mockResolvedValue({status: "success", data: testInvoice});
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

### Pattern C: Azure blob client chain

```typescript
const {mockDownload, mockGetBlockBlobClient, mockGetContainerClient} = vi.hoisted(() => {
  const getBlockBlobClient = vi.fn();
  const getContainerClient = vi.fn(() => ({getBlockBlobClient}));
  return {
    mockDownload: vi.fn(),
    mockGetBlockBlobClient: getBlockBlobClient,
    mockGetContainerClient: getContainerClient,
  };
});

// Wire up in beforeEach (survives mockReset)
beforeEach(() => {
  const {createBlobClient} = await import("@/lib/azure/storageClient");
  vi.mocked(createBlobClient).mockResolvedValue({
    getContainerClient: mockGetContainerClient,
  } as any);
  mockGetBlockBlobClient.mockReturnValue({download: mockDownload});
});
```

---

## Test Helpers

**Location**: `tests/helpers/`

### `renderWithProviders()`

Wraps components with NextIntlClientProvider (currently a passthrough mock):

```tsx
import {renderWithProviders, screen} from "@tests/helpers";

it("renders title", () => {
  renderWithProviders(<MyComponent title="Hello" />);
  expect(screen.getByText("Hello")).toBeInTheDocument();
});
```

---

## Important Gotchas

### `restoreMocks: true` in base config

The root `vitest.config.ts` sets `mockReset: true`, `clearMocks: true`, `restoreMocks: true`.
This means between tests:
- All `mockImplementation()` calls are stripped
- All `mockReturnValue()` / `mockResolvedValue()` calls are cleared
- `vi.fn(impl)` reverts to `impl` (the "original")
- Bare `vi.fn()` reverts to returning `undefined`

**Always set mock return values in `beforeEach()`**, never at module scope.

### `vi.hoisted()` is synchronous

You cannot `await import()` inside `vi.hoisted()`. Only use it to create mock
objects (`vi.fn()`, plain objects, class constructors).

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

Excluded from coverage:
- `instrumentation.server.ts`, `instrumentation.ts` (OTel bootstrap)
- `.next/` (build artifacts)
- `tests/` (test infrastructure)

---

## Directory Layout

```
sites/arolariu.ro/
├── tests/
│   ├── stubs/              ← Tier 1: module alias stubs
│   ├── helpers/            ← Shared test utilities (renderWithProviders)
│   ├── utils/              ← Playwright E2E utilities (tags, assertions)
│   └── README.md           ← This file
├── vitest.config.ts        ← Alias resolution + coverage config
├── vitest.setup.ts         ← Tier 2: global mocks
└── src/
    └── **/*.test.ts(x)     ← Tier 3: test files colocated with source
```
