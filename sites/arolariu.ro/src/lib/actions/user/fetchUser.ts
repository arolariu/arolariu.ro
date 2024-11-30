/** @format */

"use server";

import {auth} from "@/auth";
import type {User} from "next-auth";

/**
 * Fetches the current user.
 * @returns A promise of the current user.
 */
export async function fetchUser(): Promise<{isAuthenticated: boolean; user: User | null}> {
  const session = await auth();
  const isAuthenticated = !!session?.user;
  return {isAuthenticated, user: session?.user ?? null} as const;
}
