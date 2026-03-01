/**
 * @fileoverview Server actions for resolving the current user and issuing BFF tokens.
 * @module sites/arolariu.ro/src/lib/actions/user/fetchUser
 */

"use server";

import {EMPTY_GUID, generateGuid} from "@/lib/utils.generic";
import {API_JWT, createJwtToken} from "@/lib/utils.server";
import type {UserInformation} from "@/types";
import {auth, currentUser, type User} from "@clerk/nextjs/server";
import {fetchConfigValues} from "@/lib/config/configProxy";

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

type JwtConfiguration = Readonly<{
  jwtAudience: string;
  jwtIssuer: string;
}>;

function createJwtTimestamps(): Readonly<{currentTimestamp: number; expirationTime: number}> {
  const currentTimestamp = Math.floor(Date.now() / 1000);
  // todo: we don't store the generated token, so we fallback to 5 minutes expiration time.
  const expirationTime = currentTimestamp + 300; // 5 minute expiration

  return {currentTimestamp, expirationTime};
}

function resolveSubject(user: User | null, userId: string | undefined): string {
  return (
    user?.primaryEmailAddress?.emailAddress
    ?? user?.emailAddresses[0]?.emailAddress
    ?? user?.primaryPhoneNumber?.phoneNumber
    ?? user?.phoneNumbers[0]?.phoneNumber
    ?? user?.id
    ?? userId
    ?? "N/A"
  );
}

async function fetchJwtConfiguration(): Promise<JwtConfiguration> {
  const authConfiguration = await fetchConfigValues(["Common:Auth:Issuer", "Common:Auth:Audience"]);
  const jwtIssuer = authConfiguration["Common:Auth:Issuer"];
  const jwtAudience = authConfiguration["Common:Auth:Audience"];

  if (!jwtIssuer || !jwtAudience) {
    throw new Error("Missing required authentication configuration from exp catalog.");
  }

  return {jwtAudience, jwtIssuer};
}

async function createAuthenticatedUserInformation(
  userId: string | undefined,
  jwtConfiguration: JwtConfiguration,
): Promise<Readonly<UserInformation>> {
  const user = await currentUser();
  const userIdentifier = generateGuid(user?.primaryEmailAddress?.emailAddress ?? userId);
  const {currentTimestamp, expirationTime} = createJwtTimestamps();

  const jwtPayload = {
    iss: jwtConfiguration.jwtIssuer,
    aud: jwtConfiguration.jwtAudience,
    iat: currentTimestamp,
    nbf: currentTimestamp,
    exp: expirationTime,
    sub: resolveSubject(user, userId),
    userIdentifier,
    role: "user",
  };

  const token = await createJwtToken(jwtPayload, API_JWT);

  return {
    user,
    userIdentifier,
    userJwt: token,
  };
}

async function createGuestUserInformation(jwtConfiguration: JwtConfiguration): Promise<Readonly<UserInformation>> {
  const guestIdentifier = EMPTY_GUID;
  const {currentTimestamp, expirationTime} = createJwtTimestamps();
  const jwtPayload = {
    iss: jwtConfiguration.jwtIssuer,
    aud: jwtConfiguration.jwtAudience,
    iat: currentTimestamp,
    nbf: currentTimestamp,
    exp: expirationTime,
    sub: "guest",
    userIdentifier: guestIdentifier,
    role: "guest",
  };
  const guestToken = await createJwtToken(jwtPayload, API_JWT);

  return {
    user: null,
    userIdentifier: guestIdentifier,
    userJwt: guestToken,
  };
}

/**
 * Fetches the user information from the backend-for-frontend (BFF) API.
 * @returns A promise of the user information including authentication status and user object.
 */
export async function fetchBFFUserFromAuthService(): Promise<Readonly<UserInformation>> {
  "use server";
  try {
    const {isAuthenticated, userId} = await auth();
    const jwtConfiguration = await fetchJwtConfiguration();

    return isAuthenticated
      ? await createAuthenticatedUserInformation(userId ?? undefined, jwtConfiguration)
      : await createGuestUserInformation(jwtConfiguration);
  } catch (error) {
    console.error(">>> Error fetching user from BFF:", error);
    throw error;
  }
}
