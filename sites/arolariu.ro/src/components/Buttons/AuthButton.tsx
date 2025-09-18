"use client";

import {SignedIn, SignedOut, SignInButton, UserButton, useUser} from "@clerk/nextjs";
import {memo} from "react";

const LoadingButton = () => <div className='h-8 w-8 animate-pulse rounded-full bg-gray-200 dark:bg-gray-700' />;

/**
 * AuthButton component is a button that allows the user to sign in or out.
 * Optimized with React.memo to prevent unnecessary re-renders.
 * @returns The authentication button.
 */
function AuthButton(): React.JSX.Element {
  const {isSignedIn, isLoaded} = useUser();
  if (!isLoaded) {
    return <LoadingButton />;
  }

  if (isSignedIn) {
    return (
      <SignedIn>
        <UserButton />
      </SignedIn>
    );
  }

  return (
    <SignedOut>
      <SignInButton />
    </SignedOut>
  );
}

export default memo(AuthButton);
