/** @format */

"use client";

import {SignedIn, SignedOut, SignInButton, UserButton, useUser} from "@clerk/nextjs";

/**
 * AuthButton component is a button that allows the user to sign in or out.
 * @returns The authentication button.
 */
export default function AuthButton(): React.JSX.Element {
  const {isSignedIn, isLoaded} = useUser();

  if (isLoaded && isSignedIn)
    return (
      <SignedIn>
        <UserButton />
      </SignedIn>
    );

  if (isLoaded && !isSignedIn)
    return (
      <SignedOut>
        <SignInButton />
      </SignedOut>
    );

  return (
    <button
      type='button'
      className='hidden'
    />
  );
}
