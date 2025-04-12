/** @format */

"use server";

import {cookies} from "next/headers";

/**
 * This function gets a cookie from the request.
 */
export async function getCookie(name: string): Promise<string | undefined> {
  const allCookies = await cookies();
  const targetedCookie = allCookies.get(name);
  const targetedCookieValue = targetedCookie?.value;
  return targetedCookieValue;
}

/**
 * This function sets a cookie in the response.
 */
export async function setCookie(name: string, value: string): Promise<void> {
  const allCookies = await cookies();
  allCookies.set(name, value, {path: "/"});
}

/**
 * This function deletes a cookie from the response.
 */
export async function deleteCookie(name: string): Promise<void> {
  const allCookies = await cookies();
  allCookies.delete(name);
}
