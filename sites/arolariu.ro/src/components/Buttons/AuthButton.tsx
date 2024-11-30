/** @format */

"use client";
import {SessionProvider, signIn, signOut, useSession} from "next-auth/react";

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

  if (status === "loading")
    return (
      <button
        type='button'
        className='hidden'></button>
    );
  if (session)
    return (
      <button
        type='button'
        onClick={() => signOut()}>
        Logout
      </button>
    );
  return (
    <button
      type='button'
      onClick={() => signIn()}>
      Login
    </button>
  );
}

// export with HOC 'withSessionProvider'
export default withSessionProvider(AuthButton);
