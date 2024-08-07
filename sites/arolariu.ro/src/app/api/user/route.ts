/** @format */

import {generateGuid} from "@/lib/utils.generic";
import {API_JWT} from "@/lib/utils.server";
import {UserInformation} from "@/types/UserInformation";
import {currentUser} from "@clerk/nextjs/server";
import * as jose from "jose";
import {NextResponse} from "next/server";

export const dynamic = "force-dynamic";

/**
 * The GET handler for the user route.
 * @returns The auth response that contains the user object.
 */
export async function GET() {
  const user = await currentUser();
  let userId = user?.id ?? "00000000-0000-0000-0000-000000000000";
  const isGuestUser = userId === "00000000-0000-0000-0000-000000000000";

  const idHash = isGuestUser ? null : await crypto.subtle.digest("SHA-256", new TextEncoder().encode(userId));
  const userIdentifier = idHash ? generateGuid(idHash) : "00000000-0000-0000-0000-000000000000";

  const secret = new TextEncoder().encode(API_JWT);
  const header = {alg: "HS256", typ: "JWT"};
  const payload = {
    iss: "https://auth.arolariu.ro",
    aud: "https://api.arolariu.ro",
    iat: Math.floor(Date.now() / 1000),
    nbf: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 5 * 60,
    sub: user?.id ?? "guest",
    userIdentifier: userIdentifier,
  } satisfies jose.JWTPayload;

  const userJwt = await new jose.SignJWT(payload).setProtectedHeader(header).sign(secret);
  return NextResponse.json({user, userIdentifier, userJwt} satisfies UserInformation, {status: 200});
}
