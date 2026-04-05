"use client";

import {Show, SignInButton, UserButton} from "@clerk/nextjs";
import {memo} from "react";
import styles from "./AuthButton.module.scss";

/**
 * Renders the authentication control that adapts to user's sign-in state.
 *
 * @remarks
 * **Rendering Context**: Client Component (`"use client"` required).
 *
 * **Authentication Provider**: Clerk (@clerk/nextjs v7)
 * - Requires `<ClerkProvider>` in parent layout
 * - Uses `<Show when="...">` for declarative auth-state rendering
 *
 * **Component States**:
 * 1. **Signed In**: Displays Clerk's `<UserButton>` (with skeleton fallback while loading)
 * 2. **Signed Out**: Displays `<SignInButton>` to initiate auth flow
 *
 * **Performance Optimization**:
 * - Wrapped with `React.memo` to prevent re-renders when parent updates
 * - `<UserButton fallback>` provides a skeleton during Clerk initialization
 *
 * @returns JSX element showing sign-in button or user profile button
 *
 * @example
 * ```tsx
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
  return (
    <>
      <Show when='signed-in'>
        <UserButton fallback={<div className={styles["skeleton"]} />} />
      </Show>
      <Show when='signed-out'>
        <SignInButton />
      </Show>
    </>
  );
}

export default memo(AuthButton);
