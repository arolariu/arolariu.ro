/** @format */

import {signIn} from "@/auth";
import {fetchUser} from "@/lib/actions/user/fetchUser";
import type {Metadata} from "next";
import {AuthError} from "next-auth";
import {redirect} from "next/navigation";

export const metadata: Metadata = {
  title: "Sign In",
  description: "Sign in to arolariu.ro",
};

type Props = {searchParams: Promise<{[key: string]: string | string[] | undefined}>};

/**
 * The sign in page, SSR'ed, where users can sign in to the platform.
 * @returns The sign in page, SSR'ed.
 */
export default async function SignInPage({searchParams}: Readonly<Props>) {
  const {isAuthenticated} = await fetchUser();
  const {callbackUrl} = await searchParams;

  const handleFormAction = async () => {
    "use server";
    try {
      await signIn("keycloak", {redirectTo: callbackUrl as string});
    } catch (error) {
      if (error instanceof AuthError) {
        return redirect(`/?error=${error.type}`);
      }
      // eslint-disable-next-line functional/no-promise-reject -- We need to throw an error here.
      throw error;
    }
  };

  if (isAuthenticated) return redirect("/accounts");
  return (
    <section className='flex flex-col 2xsm:mt-16 2xsm:p-2 sm:p-4 md:mt-0 md:p-8'>
      <h1 className='my-4 text-center text-2xl font-extrabold'>
        Sign in by reusing your account from one of the following providers:
      </h1>
      <article className='mx-auto flex flex-col gap-4'>
        <form action={handleFormAction}>
          <button type='submit'>
            <span>
              Sign in with <code>auth.arolariu.ro</code>.
            </span>
          </button>
        </form>
      </article>
    </section>
  );
}
