/** @format */

import {SignIn} from "@clerk/nextjs";
import {type Metadata} from "next";

export const metadata: Metadata = {
  title: "Sign In",
  description: "Sign in to arolariu.ro",
};

/**
 * The sign in page.
 * @returns The sign in page.
 */
export default function SignInPage() {
  return (
    <section className='flex flex-col 2xsm:mt-16 2xsm:p-2 sm:p-4 md:mt-0 md:p-8'>
      <h1 className='my-4 text-center text-2xl font-extrabold'>
        Sign in by reusing your account from one of the following providers:
      </h1>
      <div className='mx-auto'>
        <SignIn />
      </div>
      <small className='mb-8 py-16 text-center text-lg font-semibold'>
        We do not offer the possibility to create an account via an e-mail / password combination at this moment.
      </small>
    </section>
  );
}
