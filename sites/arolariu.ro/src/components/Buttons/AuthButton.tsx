"use client";

import {useUserInformation} from "@/hooks/useUserInformation";
import {Button, Tooltip, TooltipContent, TooltipProvider, TooltipTrigger} from "@arolariu/components";
import {SignedIn, SignedOut, SignInButton, useAuth, UserButton} from "@clerk/nextjs";
import Link from "next/link";
import {memo} from "react";
import {TbUser} from "react-icons/tb";

/**
 * Renders the authentication control that adapts to user's sign-in state.
 *
 * @remarks
 * **Rendering Context**: Client Component (`"use client"` required).
 *
 * **Why Client Component?**
 * - Uses Clerk's `useUser` hook for real-time auth state
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
 * 2. **Signed In**: Displays profile link and Clerk's `<UserButton>` with profile/settings
 * 3. **Signed Out**: Displays `<SignInButton>` to initiate auth flow
 *
 * **Performance Optimization**:
 * - Wrapped with `React.memo` to prevent re-renders when parent updates
 * - Only re-renders when Clerk auth state changes
 * - Loading skeleton prevents layout shift during hydration
 *
 * **Design Rationale**:
 * - Clerk components handle OAuth flows, session management, and security
 * - Profile link provides quick access to user settings page
 * - Skeleton loader provides visual feedback during authentication check
 * - Conditional rendering ensures appropriate UI for each auth state
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
  const {userInformation} = useUserInformation();

  if (!isLoaded) {
    return <div className='h-8 w-8 animate-pulse rounded-full bg-gray-200 dark:bg-gray-700' />;
  }

  if (isSignedIn) {
    return (
      <SignedIn>
        <div className='flex items-center gap-2'>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant='ghost'
                  size='icon'
                  className='h-8 w-8 rounded-full'
                  asChild>
                  <Link href={`/profile/${userInformation.userIdentifier}`}>
                    <TbUser className='h-5 w-5' />
                    <span className='sr-only'>Profile</span>
                  </Link>
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>My Profile</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <UserButton fallback={<div className='h-8 w-8 animate-pulse rounded-full bg-gray-200 dark:bg-gray-700' />} />
        </div>
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
