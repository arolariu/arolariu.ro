"use server";

import {cookies} from "next/headers";

/**
 * This function gets a cookie from the request.
 */
export async function getCookie({name}: {name: string}) {
  return cookies().get(name);
}

/**
 * This function sets a cookie in the response.
 */
export async function setCookie({name, value}: {name: string; value: string}) {
  cookies().set(name, value);
}
