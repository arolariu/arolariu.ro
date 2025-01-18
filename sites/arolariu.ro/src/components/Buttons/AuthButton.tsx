/** @format */

"use client";

import {SessionProvider, signIn, signOut, useSession} from "next-auth/react";
import {useTranslations} from "next-intl";
import {useCallback} from "react";

/**
 * High Order Component (HOC) that provides the session context to the wrapped component.
 * This context is used to manage the user's authentication state.
 * @param Component The component to wrap.
 * @returns The wrapped component with the session context provider.
 */
const withSessionProvider = (Component: React.ComponentType) => {
  return function WrappedComponent(props: React.ComponentProps<typeof Component>) {
    return (
      <SessionProvider>
        <Component {...props} />
      </SessionProvider>
    );
  };
};

/**
 * AuthButton component is a button that allows the user to sign in or out.
 * @returns The authentication button.
 */
function AuthButton() {
  const {data: session, status} = useSession();
  const t = useTranslations("Authentication.Button");

  const handleSignOut = useCallback(() => {
    console.info(">>> User is signing out...");
    signOut();
  }, []);

  const handleSignIn = useCallback(() => {
    console.info(">>> User is signing in...");
    signIn();
  }, []);

  if (status === "loading")
    return (
      <button
        type='button'
        className='hidden'
      />
    );
  if (session)
    return (
      <button
        type='button'
        onClick={handleSignOut}>
        {t("logout")}
      </button>
    );
  return (
    <button
      type='button'
      onClick={handleSignIn}>
      {t("login")}
    </button>
  );
}

// export with HOC 'withSessionProvider'
export default withSessionProvider(AuthButton);
