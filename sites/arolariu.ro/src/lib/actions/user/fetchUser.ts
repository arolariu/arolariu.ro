"use server";

import {EMPTY_GUID, generateGuid} from "@/lib/utils.generic";
import {API_JWT, createJwtToken} from "@/lib/utils.server";
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

/**
 * Fetches the user information from the backend-for-frontend (BFF) API.
 * @returns A promise of the user information including authentication status and user object.
 */
export async function fetchBFFUserFromAuthService(): Promise<Readonly<UserInformation>> {
  "use server";
  try {
    const {isAuthenticated, userId} = await auth();
    if (isAuthenticated) {
      ("use cache");
      const user = await currentUser();
      const userIdentifier = generateGuid(user?.primaryEmailAddress?.emailAddress ?? userId);

      const currentTimestamp = Math.floor(Date.now() / 1000);
      // todo: we don't store the generated token, so we fallback to 5 minutes expiration time.
      const expirationTime = currentTimestamp + 300; // 5 minute expiration

      const jwtPayload = {
        iss: "https://auth.arolariu.ro",
        aud: "https://api.arolariu.ro",
        iat: currentTimestamp,
        nbf: currentTimestamp,
        exp: expirationTime,
        sub:
          user?.primaryEmailAddress?.emailAddress
          ?? user?.emailAddresses[0]?.emailAddress
          ?? user?.primaryPhoneNumber?.phoneNumber
          ?? user?.phoneNumbers[0]?.phoneNumber
          ?? user?.id
          ?? "N/A",
        userIdentifier,
        role: "user",
      };

      const token = await createJwtToken(jwtPayload, API_JWT);

      const userInformation: UserInformation = {
        user,
        userIdentifier,
        userJwt: token,
      };

      return userInformation;
    } else {
      const guestIdentifier = EMPTY_GUID;
      const currentTimestamp = Math.floor(Date.now() / 1000);
      // todo: we don't store the generated token, so we fallback to 5 minutes expiration time.
      const expirationTime = currentTimestamp + 300; // 5 minute expiration
      const jwtPayload = {
        iss: "https://auth.arolariu.ro",
        aud: "https://api.arolariu.ro",
        iat: currentTimestamp,
        nbf: currentTimestamp,
        exp: expirationTime,
        sub: "guest",
        userIdentifier: guestIdentifier,
        role: "guest",
      };
      const guestToken = await createJwtToken(jwtPayload, API_JWT);
      const userInformation: UserInformation = {
        user: null,
        userIdentifier: guestIdentifier,
        userJwt: guestToken,
      };

      return userInformation;
    }
  } catch (error) {
    console.error(">>> Error fetching user from BFF:", error);
    throw error;
  }
}
