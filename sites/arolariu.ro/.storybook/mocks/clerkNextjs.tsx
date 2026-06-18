"use client";

import type {ReactNode} from "react";

type ClerkUserEmailAddress = Readonly<{
  emailAddress: string;
}>;

type ClerkStorybookUser = Readonly<{
  id: string;
  firstName: string;
  lastName: string;
  fullName: string;
  username: string;
  imageUrl: string;
  primaryEmailAddress: ClerkUserEmailAddress;
  emailAddresses: readonly ClerkUserEmailAddress[];
}>;

const storybookUser: ClerkStorybookUser = {
  id: "user_storybook",
  firstName: "Story",
  lastName: "User",
  fullName: "Story User",
  username: "story.user",
  imageUrl: "",
  primaryEmailAddress: {emailAddress: "story.user@example.com"},
  emailAddresses: [{emailAddress: "story.user@example.com"}],
};

/**
 * Module-level auth state for Storybook. Mutated by stories via
 * {@link __setStorybookSignedOut} to toggle signed-in/out rendering.
 */
let signedIn = true;

/**
 * Storybook-only: force the mock Clerk auth into a signed-out (or signed-in) state.
 *
 * @param value - When true, the mock renders as a signed-out user.
 */
export function __setStorybookSignedOut(value: boolean): void {
  signedIn = !value;
}

type ChildrenProps = Readonly<{
  children?: ReactNode;
}>;

/**
 * Storybook-safe Clerk provider that simply renders its children.
 *
 * @param props - Provider props.
 * @returns Children without contacting Clerk.
 */
export function ClerkProvider({children}: ChildrenProps): React.JSX.Element {
  return <>{children}</>;
}

/**
 * Storybook-safe auth state hook.
 *
 * @returns Authenticated mock auth state.
 */
export function useAuth(): Readonly<{
  isLoaded: boolean;
  isSignedIn: boolean;
  userId: string;
  sessionId: string;
  getToken: () => Promise<string>;
}> {
  return {
    isLoaded: true,
    isSignedIn: signedIn,
    userId: signedIn ? storybookUser.id : "",
    sessionId: signedIn ? "session_storybook" : "",
    getToken: async () => (signedIn ? "storybook-token" : ""),
  };
}

/**
 * Storybook-safe Clerk user hook.
 *
 * @returns A stable mock Clerk user.
 */
export function useUser(): Readonly<{
  isLoaded: boolean;
  isSignedIn: boolean;
  user: ClerkStorybookUser | null;
}> {
  return {
    isLoaded: true,
    isSignedIn: signedIn,
    user: signedIn ? storybookUser : null,
  };
}

/**
 * Renders authenticated-only content in Storybook.
 *
 * @param props - Component props.
 * @returns Children.
 */
export function SignedIn({children}: ChildrenProps): React.JSX.Element {
  return <>{signedIn ? children : null}</>;
}

/**
 * Hides signed-out-only content in Storybook when signed in.
 *
 * @param props - Component props.
 * @returns Children when signed out; otherwise nothing.
 */
export function SignedOut({children}: ChildrenProps): React.JSX.Element {
  return <>{signedIn ? null : children}</>;
}

/**
 * Base UI-compatible conditional wrapper used by Clerk's Show primitive.
 *
 * @param props - Component props.
 * @returns Children.
 */
export function Show({children}: ChildrenProps): React.JSX.Element {
  return <>{children}</>;
}

/**
 * Storybook-safe sign-in button.
 *
 * @param props - Component props.
 * @returns Children or a default button.
 */
export function SignInButton({children}: ChildrenProps): React.JSX.Element {
  return <>{children ?? <button type='button'>Sign in</button>}</>;
}

/**
 * Storybook-safe sign-in component.
 *
 * @returns Static sign-in placeholder.
 */
export function SignIn(): React.JSX.Element {
  return <div>Storybook sign-in</div>;
}

/**
 * Storybook-safe sign-up component.
 *
 * @returns Static sign-up placeholder.
 */
export function SignUp(): React.JSX.Element {
  return <div>Storybook sign-up</div>;
}

/**
 * Storybook-safe user button.
 *
 * @returns Static user avatar button.
 */
export function UserButton(): React.JSX.Element {
  return <button type='button'>{storybookUser.fullName}</button>;
}
