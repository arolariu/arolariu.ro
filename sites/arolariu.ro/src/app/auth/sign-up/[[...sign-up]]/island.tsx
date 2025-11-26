"use client";

import {SignUp} from "@clerk/nextjs";

/**
 * The sign up page, which allows the user to sign up to the application.
 * @returns The sign up page, with the sign up component from Clerk.
 */
export default function RenderSignUpPage(): React.JSX.Element {
  return (
    <div className='mx-auto'>
      <SignUp />
    </div>
  );
}
