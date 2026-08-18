/**
 * @fileoverview External-boundary setup for real-module analysis integration tests.
 * @module sites/arolariu.ro/vitest.analysis.setup
 *
 * @remarks
 * Website actions, utilities, stores, components, and instrumentation resolve to
 * their production modules under `vitest.analysis.config.ts`. Only browser,
 * framework, authentication, and native-network boundaries are isolated here.
 */

import "@testing-library/jest-dom/vitest";
import "fake-indexeddb/auto";
import {cleanup} from "@testing-library/react";
import {afterEach, beforeEach, vi} from "vitest";
import {analysisClerk} from "./tests/helpers/analysisClerk";
import {analysisRouter} from "./tests/helpers/analysisNavigation";

process.env["EXP_PROXY_URL"] = "https://config.analysis.test";
vi.stubGlobal("fetch", vi.fn());

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: analysisRouter.push,
    replace: analysisRouter.replace,
    prefetch: vi.fn(),
    back: vi.fn(),
    pathname: "/",
    query: {},
    asPath: "/",
  }),
  usePathname: () => "/",
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
  revalidateTag: vi.fn(),
}));

vi.mock("@clerk/nextjs", () => ({
  useAuth: () => ({userId: null, isLoaded: true, isSignedIn: false}),
  useUser: () => ({user: null, isLoaded: true, isSignedIn: false}),
}));

vi.mock("@clerk/nextjs/server", () => ({
  auth: analysisClerk.auth,
  currentUser: analysisClerk.currentUser,
}));

beforeEach(() => {
  analysisClerk.auth.mockResolvedValue({isAuthenticated: false, userId: null});
  analysisClerk.currentUser.mockResolvedValue(null);
});

vi.mock("@azure/storage-blob", () => {
  const containerClient = {
    getBlockBlobClient: () => ({
      url: "http://storage.analysis.test/invoices/placeholder",
      getProperties: async () => ({}),
      setMetadata: async () => undefined,
      uploadData: async () => undefined,
      deleteIfExists: async () => ({succeeded: true}),
    }),
    listBlobsFlat: async function* (): AsyncGenerator<never, void, undefined> {
      yield* [];
    },
  };

  class BlobServiceClient {
    static fromConnectionString(): BlobServiceClient {
      return new BlobServiceClient();
    }

    getContainerClient(): typeof containerClient {
      return containerClient;
    }
  }

  return {
    BlobSASPermissions: {parse: () => ({})},
    BlobServiceClient,
    generateBlobSASQueryParameters: () => ({toString: () => ""}),
  };
});

Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: (query: string): MediaQueryList => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }),
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});
