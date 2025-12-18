"use server";

import {cookies} from "next/headers";

/**
 * @fileoverview Server actions for reading and mutating HTTP cookies.
 * @module lib/actions/cookies/cookies.action
 *
 * @remarks
 * **Execution context**: Server-only (`"use server"`).
 *
 * This module wraps Next.js' `cookies()` API to provide a small, typed surface for:
 * - Reading a cookie value from the current request context.
 * - Setting or deleting cookies from a server action.
 *
 * **Important**: Cookie mutation works only in contexts where Next.js exposes a
 * mutable cookies store (e.g., Server Actions / Route Handlers). In purely
 * server-rendered components, cookies are read-only.
 */

/**
 * Reads a cookie value from the current request context.
 *
 * @remarks
 * - Returns `undefined` when the cookie is absent.
 * - Cookie names are case-sensitive.
 *
 * @param name - The cookie name to read.
 * @returns The cookie value, or `undefined` when not present.
 */
export async function getCookie(name: string): Promise<string | undefined> {
  const allCookies = await cookies();
  const targetedCookie = allCookies.get(name);
  const targetedCookieValue = targetedCookie?.value;
  return targetedCookieValue;
}

/**
 * Sets a cookie on the outgoing response.
 *
 * @remarks
 * Uses `{path: "/"}` so the cookie is available site-wide.
 *
 * @param name - The cookie name to set.
 * @param value - The cookie value to store.
 * @returns A promise that resolves when the cookie has been written.
 */
export async function setCookie(name: string, value: string): Promise<void> {
  const allCookies = await cookies();
  allCookies.set(name, value, {path: "/"});
}

/**
 * Deletes a cookie from the outgoing response.
 *
 * @remarks
 * Deletion is performed using Next.js' cookie store API.
 *
 * @param name - The cookie name to delete.
 * @returns A promise that resolves when the cookie has been removed.
 */
export async function deleteCookie(name: string): Promise<void> {
  const allCookies = await cookies();
  allCookies.delete(name);
}
