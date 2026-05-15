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

vi.mock("next-intl", () => {
  const mockTranslator = (key: string, vars?: Record<string, unknown>) => {
    if (!vars) return key;
    let result = key;
    Object.entries(vars).forEach(([k, v]) => {
      result = result.replace(`{${k}}`, String(v));
    });
    return result;
  };

  return {
    useTranslations: (namespace?: string) => {
      const mockT = (key: string) => (namespace ? `${namespace}.${key}` : key);
      mockT.rich = (key: string) => (namespace ? `${namespace}.${key}` : key);
      return mockT;
    },
    createTranslator: ({locale: _locale, messages, namespace}: {locale?: string; messages: Record<string, unknown>; namespace: string}) => {
      const fn = (key: string, vars?: Record<string, unknown>) => {
        const parts = `${namespace}.${key}`.split(".");
        let value: unknown = messages;
        for (const part of parts) {
          if (typeof value !== "object" || value === null) return key;
          value = (value as Record<string, unknown>)[part];
        }
        const text = typeof value === "string" ? value : key;
        return mockTranslator(text, vars);
      };
      fn.rich = (key: string, replacements?: Record<string, (content?: string) => unknown>) => {
        const parts = `${namespace}.${key}`.split(".");
        let value: unknown = messages;
        for (const part of parts) {
          if (typeof value !== "object" || value === null) return key;
          value = (value as Record<string, unknown>)[part];
        }
        let text = typeof value === "string" ? value : key;
        if (!replacements) return text;
        // Simple implementation: split on <tagName></tagName> or <tagName>content</tagName>
        const result: (string | unknown)[] = [];
        let remaining = text;
        for (const [tagName, _replacer] of Object.entries(replacements)) {
          const selfClosingPattern = `<${tagName}></${tagName}>`;
          const withContentPattern = new RegExp(`<${tagName}>(.*?)</${tagName}>`, "g");
          if (remaining.includes(selfClosingPattern)) {
            const parts = remaining.split(selfClosingPattern);
            remaining = parts.join("{{REPLACEMENT}}");
          } else {
            remaining = remaining.replace(withContentPattern, (_match, _content) => {
              return "{{REPLACEMENT}}";
            });
          }
        }
        // Now split by {{REPLACEMENT}} and interleave with replacer results
        const segments = remaining.split("{{REPLACEMENT}}");
        const replacerEntries = Object.entries(replacements);
        for (let i = 0; i < segments.length; i++) {
          if (segments[i]) result.push(segments[i]);
          if (i < replacerEntries.length) {
            const entry = replacerEntries[i];
            if (entry) result.push(entry[1](""));
          }
        }
        return result.length === 1 ? result[0] : result;
      };
      return fn;
    },
    useLocale: () => "en",
    useFormatter: () => ({dateTime: (d: Date) => d.toISOString(), number: (n: number) => String(n)}),
    NextIntlClientProvider: ({children}: {children: React.ReactNode}) => children,
  };
});

vi.mock("@clerk/nextjs", () => ({
  useUser: () => ({user: null, isLoaded: true, isSignedIn: false}),
  useAuth: () => ({userId: null, isLoaded: true, isSignedIn: false}),
}));

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
