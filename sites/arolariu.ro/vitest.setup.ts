/**
 * @fileoverview Vitest setup for the arolariu.ro website.
 * @module sites/arolariu.ro/vitest.setup
 *
 * @remarks
 * Provides Next.js specific mocks and extends the monorepo test setup.
 */

import "@testing-library/jest-dom/vitest";
import "fake-indexeddb/auto";
import {vi} from "vitest";

// Set required environment variables before any imports that depend on them
// This must be done before modules like utils.server.ts are imported
process.env["RESEND_API_KEY"] = "re_test_mock_api_key_for_vitest";

// Mock Next.js router
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
  usePathname() {
    return "/";
  },
  useSearchParams() {
    return new URLSearchParams();
  },
}));

// Mock next-intl
vi.mock("next-intl", () => {
  const mockT = (key: string) => key;
  mockT.rich = (key: string) => key;
  return {
    useTranslations: () => mockT,
    useLocale: () => "en",
    useFormatter: () => ({dateTime: (d: Date) => d.toISOString(), number: (n: number) => String(n)}),
    NextIntlClientProvider: ({children}: {children: React.ReactNode}) => children,
  };
});

// Mock Clerk
vi.mock("@clerk/nextjs", () => ({
  useUser: () => ({user: null, isLoaded: true, isSignedIn: false}),
  useAuth: () => ({userId: null, isLoaded: true, isSignedIn: false}),
}));

// Mock server-only to prevent errors in tests
vi.mock("server-only", () => {
  return {};
});

// Mock OpenTelemetry to prevent deep node_modules resolution issues in tests
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

// Mock Azure SDKs to prevent CJS resolution issues (function-bind/implementation)
vi.mock("@azure/storage-blob", () => ({BlobServiceClient: vi.fn()}));
vi.mock("@azure/identity", () => ({DefaultAzureCredential: vi.fn()}));
vi.mock("@azure/app-configuration", () => ({}));

// Mock server-side utilities that import next/headers
vi.mock("@/lib/azure/storageClient", () => ({
  createBlobClient: vi.fn(),
  rewriteAzuriteUrl: vi.fn((url: string) => url),
}));
