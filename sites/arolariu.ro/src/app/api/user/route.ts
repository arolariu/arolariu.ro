/** @format */

import {auth, currentUser} from "@clerk/nextjs/server";
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

  return NextResponse.json({user}, {status: 200});
}
