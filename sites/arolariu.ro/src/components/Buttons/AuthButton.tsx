"use client";

import {SignedIn, SignedOut, SignInButton, useAuth, UserButton} from "@clerk/nextjs";
import {memo} from "react";

/**
 * Renders the authentication control that adapts to user's sign-in state.
 *
 * @remarks
 * **Rendering Context**: Client Component (`"use client"` required).
 *
 * **Why Client Component?**
 * - Uses Clerk's `useAuth` hook for real-time auth state
 * - Requires interactive sign-in/sign-out functionality
 * - Needs access to browser-based authentication flow
 *
 * **Authentication Provider**: Clerk (@clerk/nextjs)
 * - Requires `<ClerkProvider>` in parent layout
 * - Manages authentication state and session tokens
 * - Provides secure sign-in/sign-out flows
 *
 * **Component States**:
 * 1. **Loading**: Shows animated skeleton while auth state loads
 * 2. **Signed In**: Displays Clerk's `<UserButton>` with profile/settings
 * 3. **Signed Out**: Displays `<SignInButton>` to initiate auth flow
 *
 * **Performance Optimization**:
 * - Wrapped with `React.memo` to prevent re-renders when parent updates
 * - Only re-renders when Clerk auth state changes
 * - Loading skeleton prevents layout shift during hydration
 *
 * @returns JSX element showing sign-in button, user profile button, or loading state
 *
 * @example
 * ```tsx
 * // Usage in header/navigation
 * <header>
 *   <nav>
 *     <Logo />
 *     <NavigationLinks />
 *     <AuthButton />
 *   </nav>
 * </header>
 * ```
 *
 * @see {@link https://clerk.com/docs/components/user/user-button | Clerk UserButton Documentation}
 * @see {@link https://clerk.com/docs/components/authentication/sign-in-button | Clerk SignInButton Documentation}
 */
function AuthButton(): React.JSX.Element {
  const {isSignedIn, isLoaded} = useAuth();

  if (!isLoaded) {
    return <div className='h-8 w-8 animate-pulse rounded-full bg-gray-200 dark:bg-gray-700' />;
  }

  if (isSignedIn) {
    return (
      <SignedIn>
        <UserButton fallback={<div className='h-8 w-8 animate-pulse rounded-full bg-gray-200 dark:bg-gray-700' />} />
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
