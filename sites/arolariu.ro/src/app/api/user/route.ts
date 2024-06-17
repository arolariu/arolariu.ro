/** @format */

import {SITE_URL} from "@/lib/utils.generic";
import {API_JWT, API_URL} from "@/lib/utils.server";
import {auth, currentUser} from "@clerk/nextjs/server";
import * as jose from "jose";
import {NextResponse} from "next/server";

export const dynamic = "force-dynamic";

/**
 * The GET handler for the user route.
 * @returns The auth response that contains the user object.
 */
export async function GET() {
  const {userId} = auth();

  if (!userId) {
    return new NextResponse("Unauthorized", {status: 401});
  }

  const user = await currentUser();

  const secret = new TextEncoder().encode(API_JWT);
  const header = {alg: "HS256", typ: "JWT"};
  const payload = {
    iss: SITE_URL,
    aud: API_URL,
    iat: Math.floor(Date.now() / 1000),
    nbf: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 180,
    sub: user?.username ?? "guest",
  } satisfies jose.JWTPayload;
  const userJwt = await new jose.SignJWT(payload).setProtectedHeader(header).sign(secret);

  return NextResponse.json({user, userJwt}, {status: 200});
}
