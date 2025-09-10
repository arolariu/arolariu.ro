import {auth} from "@clerk/nextjs/server";
import {NextResponse} from "next/server";

export const dynamic = "force-dynamic";

/**
 * The GET handler for the user route.
 * @returns The auth response that contains the user object.
 */
export async function GET() {
  const {getToken, userId} = await auth();
  const token = await getToken({template: "jwt-for-api"});
  return NextResponse.json({userId, token}, {status: 200});
}
