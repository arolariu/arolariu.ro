/** @format */

import {signIn} from "@/auth";
import type {Metadata} from "next";
import {AuthError} from "next-auth";
import {redirect} from "next/navigation";

export const metadata: Metadata = {
  title: "Sign Up",
  description: "Sign up to arolariu.ro",
};

type SearchParams = Promise<{[key: string]: string | string[] | undefined}>;

/**
 * The sign up page.
 * @returns The sign up page.
 */
export default async function SignUpPage(props: Readonly<{searchParams: SearchParams}>) {
  const searchParams = await props.searchParams;
  const callbackUrl = searchParams["callbackUrl"] as string;

  return (
    <section className='flex flex-col 2xsm:mt-16 2xsm:p-2 sm:p-4 md:mt-0 md:p-8'>
      <h1 className='my-4 text-center text-2xl font-extrabold'>
        Sign in by reusing your account from one of the following providers:
      </h1>
      <article className='mx-auto flex flex-col gap-4'>
        <form
          action={async () => {
            "use server";
            try {
              await signIn("keycloak", {
                redirectTo: callbackUrl ?? "",
              });
            } catch (error) {
              if (error instanceof AuthError) {
                return redirect(`/?error=${error.type}`);
              }
              throw error;
            }
          }}>
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
