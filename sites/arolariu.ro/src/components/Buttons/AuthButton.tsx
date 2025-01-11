/** @format */

"use client";
import {SessionProvider, signIn, signOut, useSession} from "next-auth/react";
import {useTranslations} from "next-intl";

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
 * Auth button.
 */
function AuthButton() {
  const {data: session, status} = useSession();
  const t = useTranslations("Authentication.Button");

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
        onClick={() => signOut()}>
        {t("logout")}
      </button>
    );
  return (
    <button
      type='button'
      onClick={() => signIn()}>
      {t("login")}
    </button>
  );
}

// export with HOC 'withSessionProvider'
export default withSessionProvider(AuthButton);
