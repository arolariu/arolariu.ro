import {clerkMiddleware as authMiddleware, createRouteMatcher} from "@clerk/nextjs/server";
import {NextRequest} from "next/server";
import {middleware as translationMiddleware} from "./lib/i18n";

const isProtectedRoute = createRouteMatcher(["/admin(.*)"]);

const cspMiddleware = (request: NextRequest) => {
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const trustedDomains = `https://arolariu.ro https://*.arolariu.ro https://clerk.com https://*.clerk.com https://accounts.dev https://*.accounts.dev https://fonts.astatic.com https://*.fonts.astatic.com https://fonts.gstatic.com https://*.fonts.gstatic.com`;

  const cspHeader = `
    default-src 'self' 'nonce-${nonce}' ${trustedDomains};
    script-src 'self' 'unsafe-inline' 'unsafe-eval' ${trustedDomains};
    style-src 'self' 'unsafe-inline' ${trustedDomains};
    img-src 'self' blob: data: ${trustedDomains};
    worker-src 'self' blob: data: ${trustedDomains};
    object-src 'none';
    block-all-mixed-content;
    upgrade-insecure-requests;
    `;

  const contentSecurityPolicyHeaderValue = cspHeader.replaceAll(/\s{2,}/g, " ").trim();

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", contentSecurityPolicyHeaderValue);

  const response = translationMiddleware({request: {headers: requestHeaders}});
  response.headers.set("Content-Security-Policy", contentSecurityPolicyHeaderValue);

  return response;
};

export default authMiddleware((auth, req) => {
  if (isProtectedRoute(req)) {
    auth().protect();
  }

  return cspMiddleware(req);
});

export const config = {
  matcher: ["/((?!.*\\..*|_next).*)", "/", "/(api|trpc)(.*)"],
};
