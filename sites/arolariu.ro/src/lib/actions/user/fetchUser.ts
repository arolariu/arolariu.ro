/**
 * @fileoverview Server actions for resolving the current user and issuing BFF tokens.
 * @module sites/arolariu.ro/src/lib/actions/user/fetchUser
 */

"use server";

import {fetchApiJwtSecret} from "@/lib/config/configProxy";
import {EMPTY_GUID, generateGuid} from "@/lib/utils.generic";
import {createJwtToken} from "@/lib/utils.server";
import type {UserInformation} from "@/types";
import {auth, currentUser, type User} from "@clerk/nextjs/server";

/**
 * Fetches the current user.
 * @returns A promise of the current user and authentication status.
 */
export async function fetchAaaSUserFromAuthService(): Promise<{isAuthenticated: boolean; user: User | null}> {
  "use server";
  try {
    ("use cache");
    const user = await currentUser();
    const isAuthenticated = user !== null;
    return {isAuthenticated, user} as const;
  } catch (error) {
    console.error(">>> Error fetching user from Auth Service:", error);
    throw error;
  }
}

interface JwtPayload {
  readonly iss: string;
  readonly aud: string;
  readonly iat: number;
  readonly nbf: number;
  readonly exp: number;
  readonly sub: string;
  readonly userIdentifier: string;
  readonly role: "user" | "guest";
}

/**
 * Builds a JWT payload with standard claims for the arolariu.ro BFF token.
 * @param sub - The subject claim (email, phone, or user ID).
 * @param userIdentifier - The deterministic GUID for the user.
 * @param role - The user role ("user" or "guest").
 * @returns A JWT payload object with iss, aud, iat, nbf, exp, sub, userIdentifier, and role.
 */
function buildJwtPayload(sub: string, userIdentifier: string, role: "user" | "guest"): JwtPayload {
  // todo: we don't store the generated token, so we fallback to 5 minutes expiration time.
  const currentTimestamp = Math.floor(Date.now() / 1000);
  return {
    iss: "https://auth.arolariu.ro",
    aud: "https://api.arolariu.ro",
    iat: currentTimestamp,
    nbf: currentTimestamp,
    exp: currentTimestamp + 300,
    sub,
    userIdentifier,
    role,
  };
}

/**
 * Resolves the primary contact identifier for a Clerk user.
 * Checks email, phone, and user ID in priority order.
 * @param user - The Clerk user object, or null.
 * @returns The best available subject string.
 */
function resolveUserSubject(user: User | null): string {
  return (
    user?.primaryEmailAddress?.emailAddress
    ?? user?.emailAddresses[0]?.emailAddress
    ?? user?.primaryPhoneNumber?.phoneNumber
    ?? user?.phoneNumbers[0]?.phoneNumber
    ?? user?.id
    ?? "N/A"
  );
}

/**
 * Fetches the user information from the backend-for-frontend (BFF) API.
 * @returns A promise of the user information including authentication status and user object.
 */
export async function fetchBFFUserFromAuthService(): Promise<Readonly<UserInformation>> {
  "use server";
  try {
    const {isAuthenticated, userId} = await auth();
    const jwtSecret = await fetchApiJwtSecret();
    if (!jwtSecret) throw new Error("API JWT secret is empty or unavailable — cannot issue token.");

    if (isAuthenticated) {
      ("use cache");
      const user = await currentUser();
      const userIdentifier = generateGuid(user?.primaryEmailAddress?.emailAddress ?? userId);
      const sub = resolveUserSubject(user);
      const token = await createJwtToken(buildJwtPayload(sub, userIdentifier, "user"), jwtSecret);

      return {user, userIdentifier, userJwt: token};
    } else {
      const guestIdentifier = EMPTY_GUID;
      const guestToken = await createJwtToken(buildJwtPayload("guest", guestIdentifier, "guest"), jwtSecret);

      return {user: null, userIdentifier: guestIdentifier, userJwt: guestToken};
    }
  } catch (error) {
    console.error(">>> Error fetching user from BFF:", error);
    throw error;
  }
}
