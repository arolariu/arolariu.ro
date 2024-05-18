/** @format */

import {fetchUser} from "@/lib/actions/fetchUser";
import {type Metadata} from "next";
import Image from "next/image";
import Link from "next/link";
import {redirect} from "next/navigation";

export const metadata: Metadata = {
  title: "Auth",
  description: "The authentication page for the `arolariu.ro` platform.",
};

/**
 * The main authentication page.
 * @returns The main authentication page.
 */
export default async function AuthPage() {
  const {isAuthenticated} = await fetchUser();
  if (isAuthenticated) {
    return redirect("/");
  }

  return (
    <>
      {/* Sign up component */}
      <section className='sm:w-1/2'>
        <div className='flex h-64 items-center justify-center overflow-hidden rounded-lg'>
          <Image
            src='/images/auth/sign-up.svg'
            alt='Sign up SVG'
            width='300'
            height='500'
            className='object-fill object-center'
          />
        </div>
        <h2 className='title-font mb-3 mt-6 text-2xl font-medium'>Become a new member today.</h2>
        <p className='text-base leading-relaxed'>
          Being part of the `arolariu.ro` domain space allows you to save your profile across all the different domains
          hosted under the `arolariu.ro` umbrella. You can benefit from seamless synchronization and a unified
          experience across all the domains.
        </p>
        <Link
          href='/auth/sign-up/'
          className='btn btn-primary mt-6 rounded border-0 p-4 text-white hover:bg-indigo-600 focus:outline-none'>
          Sign up.
        </Link>
      </section>
      {/* Sign in component */}
      <section className='sm:w-1/2'>
        <div className='flex h-64 items-center justify-center overflow-hidden rounded-lg'>
          <Image
            src='/images/auth/sign-in.svg'
            alt='Sign in SVG'
            width='300'
            height='500'
            className='object-fill object-center'
          />
        </div>
        <h2 className='title-font mb-3 mt-6 text-2xl font-medium'>Continue as an existing member.</h2>
        <p className='text-base leading-relaxed'>
          Sign in using your member credentials. Your profile will be kept in sync during this browser session. You can
          benefit from seamless synchronization and a unified experience across all the domains.
        </p>
        <Link
          href='/auth/sign-in/'
          className='btn btn-primary mt-6 rounded border-0 p-4 text-white hover:bg-indigo-600 focus:outline-none'>
          Sign in.
        </Link>
      </section>
    </>
  );
}
