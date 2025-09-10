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
 * @returns A promise that resolves when the cookie is set.
 */
export async function setCookie(name: string, value: string): Promise<void> {
  const allCookies = await cookies();
  allCookies.set(name, value, {path: "/"});
}

/**
 * This function deletes a cookie from the response.
 * @returns A promise that resolves when the cookie is deleted.
 */
export async function deleteCookie(name: string): Promise<void> {
  const allCookies = await cookies();
  allCookies.delete(name);
}
