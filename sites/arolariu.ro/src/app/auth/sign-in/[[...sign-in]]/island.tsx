"use client";

import {SignIn} from "@clerk/nextjs";

/**
 * The sign in page, which allows the user to sign in to the application.
 * @returns The sign in page, with the sign in component from Clerk.
 */
export default function RenderSignInPage(): React.JSX.Element {
  return (
    <div className='mx-auto'>
      <SignIn />
    </div>
  );
}
