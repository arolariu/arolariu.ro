"use server";

import {cookies} from "next/headers";

/**
 * This function gets a cookie from the request.
 * @returns The value of the cookie, or undefined if it doesn't exist.
 */
export async function getCookie(name: string): Promise<string | undefined> {
  const allCookies = await cookies();
  const targetedCookie = allCookies.get(name);
  const targetedCookieValue = targetedCookie?.value;
  return targetedCookieValue;
}

/**
 * This function sets a cookie in the response.
 * @param name The name of the cookie to set.
 * @param value The value to store in the cookie.
 * @param options Optional cookie configuration (maxAge, httpOnly, secure, sameSite, etc.).
 * @returns A promise that resolves when the cookie is set.
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
 * This function deletes a cookie from the response.
 * @returns A promise that resolves when the cookie is deleted.
 */
export async function deleteCookie(name: string): Promise<void> {
  const allCookies = await cookies();
  allCookies.delete(name);
}
