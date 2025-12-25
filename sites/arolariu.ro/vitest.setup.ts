/**
 * Vitest setup file for Next.js application
 * Provides Next.js specific mocks and configurations
 * Extends the base monorepo setup
 */

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
vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
  useLocale: () => "en",
}));

// Mock Clerk
vi.mock("@clerk/nextjs", () => ({
  useUser: () => ({user: null, isLoaded: true, isSignedIn: false}),
  useAuth: () => ({userId: null, isLoaded: true, isSignedIn: false}),
}));

// Mock server-only to prevent errors in tests
vi.mock("server-only", () => {
  return {};
});
