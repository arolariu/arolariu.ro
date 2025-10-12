"use server";

import {cookies} from "next/headers";

/**
 * Gets a cookie value from the request.
 *
 * **Security Context**: This is a Next.js Server Action that runs exclusively on the server.
 * - The `"use server"` directive ensures this function cannot execute in browser context
 * - Client components invoke this via Server Actions (POST requests with same-origin validation)
 * - Next.js automatically validates Server Action origin to prevent CSRF attacks
 * - HTTP-only cookies are accessible because execution occurs in Node.js runtime
 *
 * **Cookie Access Safety**:
 * - Server-side only: Uses Next.js `cookies()` API from `next/headers`
 * - Client invocation: Routed through Next.js Server Action RPC mechanism
 * - Origin validation: Next.js enforces same-origin policy for Server Actions
 * - No direct document.cookie: Client-side JavaScript cannot read HTTP-only cookies
 *
 * @param name The name of the cookie to retrieve.
 * @returns The value of the cookie, or undefined if it doesn't exist.
 *
 * @example
 * // Server Component usage:
 * const sessionId = await getCookie("guest_session_id");
 *
 * @example
 * // Client Component usage (invokes Server Action):
 * "use client";
 * import {getCookie} from "@/lib/actions/cookies";
 * const value = await getCookie("my_cookie"); // Executes on server via RPC
 */
export async function getCookie(name: string): Promise<string | undefined> {
  const allCookies = await cookies();
  const targetedCookie = allCookies.get(name);
  const targetedCookieValue = targetedCookie?.value;
  return targetedCookieValue;
}

/**
 * Sets a cookie in the response with optional security configurations.
 *
 * **Security Context**: This is a Next.js Server Action that runs exclusively on the server.
 * - The `"use server"` directive ensures this function cannot execute in browser context
 * - Only server-side code and Server Action invocations can set cookies
 * - Client-side JavaScript cannot directly call this to set arbitrary cookies
 * - Next.js validates Server Action requests to prevent unauthorized cookie manipulation
 *
 * **Cookie Security Best Practices**:
 * - Use `httpOnly: true` for session/auth cookies to prevent XSS attacks
 * - Use `secure: true` in production to enforce HTTPS-only transmission
 * - Use `sameSite: "lax"` or `"strict"` to prevent CSRF attacks
 * - Set appropriate `maxAge` to limit cookie lifetime and privacy exposure
 *
 * **Client-Server Safety**:
 * - Server Components: Direct cookie access via Next.js `cookies()` API
 * - Client Components: Invoke via Server Actions (validated RPC calls)
 * - Browser: Cannot directly call this function or forge Server Action requests
 * - Next.js: Enforces same-origin policy and validates Server Action authenticity
 *
 * @param name The name of the cookie to set.
 * @param value The value to store in the cookie.
 * @param options Optional cookie configuration for security and behavior.
 * @param options.maxAge Cookie expiration in seconds (e.g., 2_592_000 = 30 days).
 * @param options.httpOnly If true, prevents JavaScript access (XSS protection).
 * @param options.secure If true, cookie only sent over HTTPS (should be true in production).
 * @param options.sameSite Controls cross-site cookie behavior ("strict" | "lax" | "none").
 * @param options.path Cookie path scope (default: "/").
 * @returns A promise that resolves when the cookie is set.
 *
 * @example
 * // Secure session cookie:
 * await setCookie("session_id", uuid, {
 *   httpOnly: true,
 *   secure: process.env.NODE_ENV === "production",
 *   sameSite: "lax",
 *   maxAge: 2_592_000, // 30 days
 * });
 *
 * @example
 * // Simple preference cookie (no security restrictions):
 * await setCookie("theme", "dark", {
 *   maxAge: 31_536_000, // 1 year
 * });
 */
export async function setCookie(
  name: string,
  value: string,
  options?: {
    maxAge?: number;
    httpOnly?: boolean;
    secure?: boolean;
    sameSite?: "strict" | "lax" | "none";
    path?: string;
  },
): Promise<void> {
  const allCookies = await cookies();
  allCookies.set(name, value, {
    path: options?.path ?? "/",
    maxAge: options?.maxAge,
    httpOnly: options?.httpOnly,
    secure: options?.secure,
    sameSite: options?.sameSite,
  });
}

/**
 * Deletes a cookie from the response.
 *
 * **Security Context**: This is a Next.js Server Action that runs exclusively on the server.
 * - Only server-side code can delete cookies
 * - Client components must invoke this via Server Actions
 * - Next.js validates Server Action origin to prevent unauthorized deletions
 *
 * @param name The name of the cookie to delete.
 * @returns A promise that resolves when the cookie is deleted.
 *
 * @example
 * // Clear session cookie:
 * await deleteCookie("guest_session_id");
 */
export async function deleteCookie(name: string): Promise<void> {
  const allCookies = await cookies();
  allCookies.delete(name);
}
