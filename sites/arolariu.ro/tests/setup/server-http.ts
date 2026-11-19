import {afterEach, beforeEach, vi} from "vitest";

const clerk = vi.hoisted(() => ({
  auth: vi.fn<() => Promise<{isAuthenticated: true; userId: string}>>(),
  currentUser: vi.fn<() => Promise<{primaryEmailAddress: {emailAddress: string}} | null>>(async () => null),
}));
vi.mock("@clerk/nextjs/server", () => clerk);

export const auth = clerk.auth;
export const currentUser = clerk.currentUser;
export const apiUrl = "https://api.example.test";
export const jwtSecret = "invoice-test-key-not-used-outside-vitest";
export const fetchAtHttp = vi.fn<typeof globalThis.fetch>();

beforeEach(() => {
  vi.stubEnv("API_URL", apiUrl);
  vi.stubEnv("API_JWT", jwtSecret);
  vi.stubGlobal("fetch", fetchAtHttp);
  auth.mockResolvedValue({isAuthenticated: true, userId: "user-1"});
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});
