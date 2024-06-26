/** @format */

"use server";

import {cookies} from "next/headers";

/**
 * This function gets a cookie from the request.
 */
export async function getCookie({name}: Readonly<{name: string}>) {
  return cookies().get(name)?.value;
}

/**
 * This function sets a cookie in the response.
 */
export async function setCookie({name, value}: Readonly<{name: string; value: string}>) {
  cookies().set(name, value);
}
