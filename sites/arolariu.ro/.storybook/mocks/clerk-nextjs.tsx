import type {PropsWithChildren, ReactNode} from "react";

/**
 * Deterministic signed-out Clerk boundary for browser-rendered stories.
 */

export function ClerkProvider({children}: PropsWithChildren): ReactNode {
  return children;
}

export function useAuth(): Readonly<{isLoaded: true; isSignedIn: false; userId: null}> {
  return {isLoaded: true, isSignedIn: false, userId: null};
}

export function useUser(): Readonly<{isLoaded: true; isSignedIn: false; user: null}> {
  return {isLoaded: true, isSignedIn: false, user: null};
}

export async function auth(): Promise<Readonly<{isAuthenticated: false; userId: null}>> {
  return {isAuthenticated: false, userId: null};
}

export async function currentUser(): Promise<null> {
  return null;
}

export function Show({
  when,
  children,
  fallback = null,
}: Readonly<{
  when: "signed-in" | "signed-out" | boolean;
  children: ReactNode;
  fallback?: ReactNode;
}>): ReactNode {
  switch (when) {
    case "signed-out":
    case true:
      return children;
    case "signed-in":
    case false:
      return fallback;
  }
}

export function SignInButton({children}: Readonly<{children?: ReactNode}>): ReactNode {
  return children ?? <button type='button'>Sign in</button>;
}

export function UserButton({fallback = null}: Readonly<{fallback?: ReactNode}>): ReactNode {
  return fallback;
}

export function SignIn(): ReactNode {
  return <div aria-label='Sign in'>Sign in</div>;
}

export function SignUp(): ReactNode {
  return <div aria-label='Sign up'>Sign up</div>;
}
