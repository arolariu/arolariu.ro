import {auth, currentUser} from "@clerk/nextjs/server";
import {NextResponse} from "next/server";

export const dynamic = "force-dynamic";

/**
 * The GET handler for the user route.
 * @returns The auth response that contains the user object.
 */
export async function GET() {
  // Get the userId from auth() -- if null, the user is not signed in
  const {userId} = auth();

  if (!userId) {
    return new NextResponse("Unauthorized", {status: 401});
  }

  // Get the Backend API User object when you need access to the user's information
  const user = await currentUser();

  // Perform your Route Handler's logic with the returned user object

  return NextResponse.json({user: user}, {status: 200});
}
