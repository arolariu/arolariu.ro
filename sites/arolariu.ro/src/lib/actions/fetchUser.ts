"use server";

import {currentUser, type User} from "@clerk/nextjs/server";

/**
 * Fetches the current user.
 * @returns A promise of the current user.
 */
export async function fetchUser(): Promise<{isAuthenticated: boolean; user: User | null}> {
  const user = await currentUser();
  const isAuthenticated = user !== null;
  return {isAuthenticated, user};
}
