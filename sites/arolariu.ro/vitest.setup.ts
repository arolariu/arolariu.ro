/**
 * @fileoverview Global Vitest setup for the arolariu.ro website.
 * @module sites/arolariu.ro/vitest.setup
 *
 * @remarks
 * ## Mock Architecture (3 tiers)
 *
 * 1. **Stubs** (`tests/stubs/`): Module aliases resolved via `vitest.config.ts`.
 *    Replace server-only modules that crash in happy-dom. These use `vi.fn(impl)`
 *    so the original implementation survives `restoreMocks: true`.
 *    Modules: `server-only`, `instrumentation.server`, `configProxy`, `utils.server`,
 *    `storageClient`, `fetchConfig`, `fetchUser`.
 *
 * 2. **Global mocks** (this file): Browser APIs and SDK shims that every test needs.
 *    Modules: `next/navigation`, `next-intl`, `@clerk/nextjs`, `@opentelemetry/*`,
 *    `@azure/*` SDKs.
 *
 * 3. **Per-test mocks**: Inline `vi.mock()` + `vi.hoisted()` in individual test files
 *    for module-specific behavior (e.g., Resend class, specific server actions).
 *
 * @see tests/README.md for full documentation.
 */

import "@testing-library/jest-dom/vitest";
import "fake-indexeddb/auto";
import type {ReactNode} from "react";
import {vi} from "vitest";

// ── Environment ──
process.env["RESEND_API_KEY"] = "re_test_mock_api_key_for_vitest";

// ── Browser API mocks (Next.js) ──

vi.mock("next/navigation", () => ({
  useRouter() {
    return {
      push: vi.fn(),
      replace: vi.fn(),
      prefetch: vi.fn(),
      back: vi.fn(),
      pathname: "/",
      query: {},
      asPath: "/",
    };
  },
  usePathname: () => "/",
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
  revalidateTag: vi.fn(),
}));

vi.mock("next/font/google", () => {
  const createFont = (variable: string) => ({
    className: "font-mock",
    style: {fontFamily: "font-mock"},
    variable,
  });

  return {
    Atkinson_Hyperlegible: vi.fn(() => createFont("--font-dyslexic")),
    Caudex: vi.fn(() => createFont("--font-default")),
  };
});

vi.mock("@clerk/nextjs", () => ({
  ClerkProvider: ({children}: Readonly<{children: ReactNode}>) => children,
  useUser: () => ({user: null, isLoaded: true, isSignedIn: false}),
  useAuth: () => ({userId: null, isLoaded: true, isSignedIn: false}),
  Show: ({
    when,
    children,
    fallback = null,
  }: Readonly<{when: "signed-in" | "signed-out" | boolean; children: ReactNode; fallback?: ReactNode}>) =>
    when === "signed-out" || when === true ? children : fallback,
  SignInButton: ({children}: Readonly<{children?: ReactNode}>) => children ?? null,
  UserButton: ({fallback = null}: Readonly<{fallback?: ReactNode}>) => fallback,
}));

// ── i18n shims ──
//
// `useTranslations` and `useLocale` are React hooks that require a
// `NextIntlClientProvider` context. Client-component tests that don't set
// up that provider need stubs here. The stubs intentionally return key
// paths verbatim (e.g., `t((m) => m.foo.bar)` → `"foo.bar"`) so tests
// can assert on the raw key string without depending on real translation
// content.
//
// `createTranslator` is NOT mocked — it's a pure function with no provider
// dependency, and tests that exercise it (e.g., `_i18n/index.test.ts`) use
// the real next-intl runtime. An earlier broken `t.rich` mock on
// `createTranslator` was removed in PR #751's refactor (Copilot review
// comment #4).
vi.mock("next-intl", async (importOriginal) => {
  const actual = await importOriginal<typeof import("next-intl")>();
  const makeTranslator = (namespace?: string) => {
    const t = ((key: string) => (namespace ? `${namespace}.${key}` : key)) as unknown as ReturnType<typeof actual.useTranslations>;
    (t as unknown as {rich: (key: string) => string}).rich = (key: string) => (namespace ? `${namespace}.${key}` : key);
    return t;
  };
  return {
    ...actual,
    useTranslations: (namespace?: string) => makeTranslator(namespace),
    useLocale: () => "en",
    // `useFormatter` requires `NextIntlClientProvider` context too — stub it
    // so components/tests that call it without a provider don't throw. The
    // returned formatters are minimal stringifiers; assert on raw values,
    // not on locale-specific formatting.
    useFormatter: () => ({
      dateTime: (date: Date | number) => String(date),
      number: (n: number) => String(n),
      relativeTime: (date: Date | number) => String(date),
      list: (items: Iterable<string>) => Array.from(items).join(", "),
    }),
  };
});

vi.mock("next-intl-selector", async (importOriginal) => {
  const actual = await importOriginal<typeof import("next-intl-selector")>();
  const {mockSelectorTranslator} = await import("next-intl-selector/testing");
  const makeTranslator = () => mockSelectorTranslator();

  return {
    ...actual,
    useTranslations: () => makeTranslator(),
    selectorFromPath: actual.selectorFromPath,
    pathFromSelector: actual.pathFromSelector,
  };
});

vi.mock("next-intl-selector/server", async (importOriginal) => {
  const actual = await importOriginal<typeof import("next-intl-selector/server")>();
  const {mockSelectorTranslator} = await import("next-intl-selector/testing");

  return {
    ...actual,
    getTranslations: async () => mockSelectorTranslator(),
  };
});

// ── SDK shims (prevent CJS/ESM resolution crashes in happy-dom) ──

vi.mock("@opentelemetry/api", async (importOriginal) => {
  try {
    return await importOriginal();
  } catch {
    return {trace: {getTracer: () => ({startSpan: vi.fn()})}, context: {active: vi.fn()}, createContextKey: vi.fn()};
  }
});
vi.mock("@opentelemetry/sdk-logs", () => ({}));
vi.mock("@opentelemetry/sdk-trace-base", () => ({}));
vi.mock("@opentelemetry/resources", () => ({}));

vi.mock("@azure/storage-blob", () => ({BlobServiceClient: vi.fn()}));
vi.mock("@azure/identity", () => ({DefaultAzureCredential: vi.fn()}));
vi.mock("@azure/app-configuration", () => ({}));
