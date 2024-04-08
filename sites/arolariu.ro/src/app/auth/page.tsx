import {fetchUser} from "@/lib/utils.server";
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
    <main className='body-font dark:text-gray-300'>
      <div className='container mx-auto px-5 py-24'>
        <div className='mx-4 mb-10 flex flex-wrap text-center'>
          {/* Sign up component */}
          <div className='container mb-10 px-8 sm:w-1/2'>
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
              Being part of the `arolariu.ro` domain space allows you to save your profile across all the different
              domains hosted under the `arolariu.ro` umbrella. You can benefit from seamless synchronization and a
              unified experience across all the domains.
            </p>
            <Link
              href='/auth/sign-up/'
              className='btn btn-primary mt-6 flex w-full rounded border-0 px-5 py-2 text-white hover:bg-indigo-600 focus:outline-none'>
              Sign up.
            </Link>
          </div>
          {/* Sign in component */}
          <div className='container mb-10 px-8 sm:w-1/2'>
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
              Sign in using your member credentials. Your profile will be kept in sync during this browser session. You
              can benefit from seamless synchronization and a unified experience across all the domains.
            </p>
            <Link
              href='/auth/sign-in/'
              className='btn btn-primary mt-6 flex w-full rounded border-0 px-5 py-2 text-white hover:bg-indigo-600 focus:outline-none'>
              Sign in.
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
