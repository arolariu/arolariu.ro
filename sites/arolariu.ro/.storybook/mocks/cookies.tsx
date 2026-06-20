/**
 * @fileoverview Storybook mock for the cookie server actions (`@/lib/actions/cookies`).
 * @module .storybook/mocks/cookies
 *
 * @remarks
 * The real module is `"use server"` and imports `next/headers`, which cannot run in
 * the Storybook browser runtime. This mock preserves the call signatures with
 * in-memory, side-effect-free implementations.
 */

const store = new Map<string, string>();

/**
 * Reads a cookie value from the in-memory store.
 *
 * @param name - Cookie name.
 * @returns The stored value, or undefined when absent.
 */
export async function getCookie(name: string): Promise<string | undefined> {
  return store.get(name);
}

/**
 * Writes a cookie value to the in-memory store.
 *
 * @param name - Cookie name.
 * @param value - Cookie value.
 */
export async function setCookie(name: string, value: string): Promise<void> {
  store.set(name, value);
}

/**
 * Deletes a cookie from the in-memory store.
 *
 * @param name - Cookie name.
 */
export async function deleteCookie(name: string): Promise<void> {
  store.delete(name);
}
