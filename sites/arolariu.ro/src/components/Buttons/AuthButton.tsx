/** @format */

"use client";

import {SignedIn, SignedOut, SignInButton, UserButton, useUser} from "@clerk/nextjs";
import {memo, useMemo} from "react";

/**
 * AuthButton component is a button that allows the user to sign in or out.
 * Optimized with React.memo to prevent unnecessary re-renders.
 * @returns The authentication button.
 */
function AuthButton(): React.JSX.Element {
  const {isSignedIn, isLoaded} = useUser();

  // Memoize the loading state to prevent recreating on each render
  const loadingButton = useMemo(() => <div className='h-8 w-8 animate-pulse rounded-full bg-gray-200 dark:bg-gray-700' />, []);

  if (!isLoaded) return loadingButton;

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
