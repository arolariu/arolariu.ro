import {createRouteMatcher} from "@clerk/nextjs/server";
import {NextRequest} from "next/server";
import {describe, expect, it, vi} from "vitest";

type AuthBoundary = Readonly<{protect: () => Promise<unknown>}>;
type MiddlewareHandler = (auth: AuthBoundary, request: NextRequest) => Promise<void>;

const {captured} = vi.hoisted(() => ({
  captured: {handler: undefined as MiddlewareHandler | undefined},
}));

vi.mock("@clerk/nextjs/server", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@clerk/nextjs/server")>();
  return {
    ...actual,
    clerkMiddleware: (handler: MiddlewareHandler): MiddlewareHandler => {
      captured.handler = handler;
      return handler;
    },
  };
});

import middleware from "./proxy";

const sdkMatcher = createRouteMatcher(["/admin(.*)"]);
const paths = [
  "/",
  "/settings",
  "/api/invoices",
  "/admin",
  "/admin/",
  "/admin/users",
  "/administrator",
  "/admin-suffix",
  "/ADMIN/users",
  "/admin?next=/settings",
  "/settings?next=/admin",
  "//admin///users",
  "/%61dmin",
  "/ad%6Din/users",
  "/admin%2Fusers",
  "/admin%3Fusers",
  "/admin/%E2%9C%93",
  "/admin%0A",
  "/admin%0Ausers",
  "/%",
  "/%ZZ",
  "/admin/%E0%A4",
] as const;

function getFailureShape(error: unknown): Readonly<{name: string; message: string; statusCode: unknown}> {
  if (!(error instanceof Error)) {
    throw new TypeError("Expected the matcher to throw an Error");
  }
  return {name: error.name, message: error.message, statusCode: "statusCode" in error ? error.statusCode : undefined};
}

describe("protected-route matcher compatibility", () => {
  it.each(["guest", "authenticated"] as const)("preserves the pinned SDK matcher and auth invocation for %s requests", async (actor) => {
    expect(middleware).toBeDefined();
    const handler = captured.handler;
    if (!handler) {
      throw new Error("Clerk middleware handler was not captured");
    }

    for (const path of paths) {
      const request = new NextRequest(`https://arolariu.ro${path}`);
      const protect = vi.fn(async () => ({userId: actor === "guest" ? null : "user-123"}));
      const auth = {protect};
      let expectedMatch: boolean;
      try {
        expectedMatch = sdkMatcher(request);
      } catch (error) {
        await expect(handler(auth, request).catch(getFailureShape)).resolves.toEqual(getFailureShape(error));
        expect(protect).not.toHaveBeenCalled();
        continue;
      }

      await handler(auth, request);

      expect(protect, `${actor}: ${path}`).toHaveBeenCalledTimes(expectedMatch ? 1 : 0);
    }
  });

  it("propagates the existing auth protection failure rather than allowing a guest request", async () => {
    const failure = new Error("authentication required");
    const protect = vi.fn(async () => {
      throw failure;
    });
    const handler = captured.handler;
    if (!handler) {
      throw new Error("Clerk middleware handler was not captured");
    }

    await expect(handler({protect}, new NextRequest("https://arolariu.ro/admin"))).rejects.toBe(failure);
    expect(protect).toHaveBeenCalledOnce();
  });
});
