import type {Metadata} from "next";
import RenderSignUpPage from "./island";

export const metadata: Metadata = {
  title: "Sign Up",
  description: "Sign up to arolariu.ro",
};

/**
 * The sign up page, which allows the user to sign up to the application.
 * @returns The sign up page, with the sign up component from Clerk.
 */
export default async function SignUpPage(): Promise<React.JSX.Element> {
  return (
    <section className='2xsm:mt-16 2xsm:p-2 flex flex-col sm:p-4 md:mt-0 md:p-8'>
      <h1 className='my-4 text-center text-2xl font-extrabold'>
        Sign up by creating a new account or by reusing your account from one of the following identity providers:
      </h1>
      <RenderSignUpPage />
    </section>
  );
}
