import {API_JWT} from "@/constants";
import "server-only";

import {type User} from "@clerk/backend";
import {currentUser} from "@clerk/nextjs";

import * as jose from "jose";

/**
 * Generate a JWT for a user.
 * @param user The user for which to generate the JWT.
 * @returns A promise of the JWT.
 */
export async function generateJWT(user: User | null) {
  const secret = new TextEncoder().encode(API_JWT);

  const header = {alg: "HS256", typ: "JWT"};

  const payload = {
    iss: "https://arolariu.ro",
    aud: "https://api.arolariu.ro",
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 180,
    sub: user?.username ?? "guest",
  };

  const jwt = await new jose.SignJWT(payload).setProtectedHeader(header).sign(secret);
  return jwt;
}

/**
 * Fetches the current user.
 * @returns A promise of the current user.
 */
export async function fetchUser(): Promise<{isAuthenticated: boolean; user: User | null}> {
  const user = await currentUser();
  const isAuthenticated = user !== null;
  return {isAuthenticated, user};
}
