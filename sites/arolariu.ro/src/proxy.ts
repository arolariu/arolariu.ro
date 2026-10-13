/**
 * @fileoverview Clerk middleware wiring explain/entrypoint.
 * @module sites/arolariu.ro/src/proxy
 *
 * @remarks
 * Configures request matching rules and enforces authentication for protected routes.
 */

import {clerkMiddleware as authMiddleware} from "@clerk/nextjs/server";

class MalformedAdminPathError extends Error {
  public readonly statusCode = 400;

  constructor(pathname: string, cause: unknown) {
    super(`Malformed encoding in URL path: ${pathname}`, {cause});
    this.name = "MalformedURLError";
  }
}

function isProtectedAdminPath(pathname: string): boolean {
  let decodedPath: string;
  try {
    decodedPath = decodeURI(pathname);
  } catch (error) {
    throw new MalformedAdminPathError(pathname, error);
  }
  // Preserve Clerk's existing decoding, repeated-slash normalization and /admin(.*) prefix policy.
  return /^\/admin.*$/iu.test(decodedPath.replace(/\/\/+/gu, "/"));
}

export default authMiddleware(async (auth, req) => {
  if (isProtectedAdminPath(req.nextUrl.pathname)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    // eslint-disable-next-line unicorn/prefer-string-raw -- this is a regex
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",

    // Always run for API routes
    "/(api|trpc)(.*)",

    // Skip for static files in the /manifest or /_manifest folder
    "/(manifest|_manifest)(.*)",
  ],
};
