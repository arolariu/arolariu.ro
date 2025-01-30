/** @format */

"use server";

import {cookies} from "next/headers";

/**
 * This function gets a cookie from the request.
 */
export async function getCookie({name}: Readonly<{name: string}>) {
  const allCookies = await cookies();
  const targetedCookie = allCookies.get(name);
  const targetedCookieValue = targetedCookie?.value;
  return targetedCookieValue;
}

/**
 * This function sets a cookie in the response.
 */
export async function setCookie({name, value}: Readonly<{name: string; value: string}>) {
  const allCookies = await cookies();
  const updatedCookies = allCookies.set(name, value);
  return updatedCookies;
}
