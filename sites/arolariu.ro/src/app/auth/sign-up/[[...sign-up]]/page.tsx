import {SignUp} from "@clerk/nextjs";
import {type Metadata} from "next";

export const metadata: Metadata = {
  title: "Sign Up",
  description: "Sign up to arolariu.ro",
};

/**
 * The sign up page, which allows the user to sign up to the application.
 * @returns The sign up page, with the sign up component from Clerk.
 */
export default function SignUpPage(): React.JSX.Element {
  return (
    <section className='2xsm:mt-16 2xsm:p-2 flex flex-col sm:p-4 md:mt-0 md:p-8'>
      <h1 className='my-4 text-center text-2xl font-extrabold'>
        Sign up by creating a new account or by reusing your account from one of the following identity providers:
      </h1>
      <div className='mx-auto'>
        <SignUp />
      </div>
      <small className='mb-8 py-16 text-center text-lg font-semibold'>
        We do not offer the possibility to recover an account created via an e-mail / password combination at this moment.
      </small>
    </section>
  );
}
