import {SignIn} from "@clerk/nextjs";
import {type Metadata} from "next";

export const metadata: Metadata = {
  title: "Sign In",
  description: "Sign in to arolariu.ro",
};

/**
 * The sign in page, which allows the user to sign in to the application.
 * @returns The sign in page, with the sign in component from Clerk.
 */
export default function SignInPage(): React.JSX.Element {
  return (
    <section className='2xsm:mt-16 2xsm:p-2 flex flex-col sm:p-4 md:mt-0 md:p-8'>
      <h1 className='my-4 text-center text-2xl font-extrabold'>Sign in by reusing your account from one of the following providers:</h1>
      <div className='mx-auto'>
        <SignIn />
      </div>
      <small className='mb-8 py-16 text-center text-lg font-semibold'>
        We do not offer the possibility to create an account via an e-mail / password combination at this moment.
      </small>
    </section>
  );
}
