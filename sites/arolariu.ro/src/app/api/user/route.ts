/** @format */

import {fetchUser} from "@/lib/actions/user/fetchUser";
import {generateGuid} from "@/lib/utils.generic";
import {API_JWT, createJwtToken} from "@/lib/utils.server";
import type {UserInformation} from "@/types";
import {NextResponse} from "next/server";

export const dynamic = "force-dynamic";

/**
 * The GET handler for the user route.
 * @returns The auth response that contains the user object.
 */
export async function GET() {
  // /api/user
  const {user} = await fetchUser();
  const userHasValidEmail = user?.email !== null && user?.email !== undefined;

  const emailHash = userHasValidEmail
    ? await crypto.subtle.digest("SHA-256", new TextEncoder().encode(user?.email!))
    : null;

  const userIdentifier = emailHash ? generateGuid(emailHash) : "00000000-0000-0000-0000-000000000000";

  const header = {alg: "HS256", typ: "JWT"};
  const payload = {
    iss: "https://auth.arolariu.ro",
    aud: "https://api.arolariu.ro",
    iat: Math.floor(Date.now() / 1000),
    nbf: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 5 * 60,
    sub: user?.id ?? "guest",
    userIdentifier: userIdentifier,
  };

  const userJwt = createJwtToken(header, payload, API_JWT);
  return NextResponse.json({user, userIdentifier, userJwt} satisfies UserInformation, {status: 200});
}
