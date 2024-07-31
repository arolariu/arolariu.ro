/** @format */

"use client";

import useWindowSize from "@/hooks/useWindowSize";
import {SignedIn, SignedOut, UserButton, useUser} from "@clerk/nextjs";
import {HamburgerMenuIcon} from "@radix-ui/react-icons";
import Image from "next/image";
import Link from "next/link";
import logo from "../../public/logo.svg";
import ThemeSwitcherButton from "./Buttons/ThemeButton";
import {Button} from "./ui/button";
import {Popover, PopoverContent, PopoverTrigger} from "./ui/popover";
import {Skeleton} from "./ui/skeleton";
const HeaderSkeleton = () => (
  <header>
    <nav className='navbar bg-white dark:bg-black 2xsm:fixed 2xsm:top-0 2xsm:z-50 lg:relative lg:z-auto'>
      <div className='navbar-start flex flex-row flex-nowrap'>
        <Skeleton className='h-10 w-10 rounded-full bg-indigo-700 p-2 text-white' />
      </div>
      <div className='navbar-center gap-8 2xsm:hidden lg:relative lg:flex'>
        <Skeleton className='h-10 w-10 text-white' />
        <Skeleton className='h-10 w-10 text-white' />
        <Skeleton className='h-10 w-10 text-white' />
      </div>
      <div className='navbar-end flex flex-row flex-wrap'>
        <Skeleton className='h-10 w-10 rounded-full bg-indigo-700 p-2 text-white' />
      </div>
    </nav>
  </header>
);

const Navigation = ({className}: Readonly<{className?: string}>) => {
  const {isLoaded, isSignedIn, user} = useUser();
  if (!isLoaded) return;

  return (
    <ul className={`${className as string} flex items-center justify-center justify-items-center gap-4`}>
      <li>
        <details>
          <summary>
            <Link href='/domains'>Domains </Link>
          </summary>
          <ul className='mx-2 rounded-xl bg-white dark:bg-black 2xsm:border-0 md:border'>
            <li className='hover:text-yellow-300'>
              <Link href='/domains/invoices'>&gt; Invoices</Link>
            </li>
            <li className='hover:text-yellow-300'>
              <Link href='/domains/live'>&gt; Chat Rooms</Link>
            </li>
          </ul>
        </details>
      </li>
      <li className='hover:text-yellow-300'>
        <Link href='/events'>Events</Link>
      </li>

      <li>
        <Link
          href={isSignedIn ? `/accounts/${user.id}` : "/auth"}
          className='indicator hover:text-yellow-300'>
          {isSignedIn ? "Account" : "Auth"}
        </Link>
      </li>
    </ul>
  );
};

/**
 * The header component.
 * @returns The header component.
 */
export default function Header() {
  const {isMobile, isDesktop} = useWindowSize();
  const {isLoaded, isSignedIn} = useUser();
  if (!isLoaded) return <HeaderSkeleton />;

  return (
    <header>
      <nav className='navbar bg-white dark:bg-black 2xsm:fixed 2xsm:top-0 2xsm:z-50 lg:relative lg:z-auto'>
        <div className='navbar-start flex flex-row flex-nowrap'>
          {Boolean(isMobile) && (
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant='outline'
                  title='Mobile Navigation Menu'>
                  <HamburgerMenuIcon />
                </Button>
              </PopoverTrigger>
              <PopoverContent>
                <Navigation className='menu menu-vertical' />
              </PopoverContent>
            </Popover>
          )}
          <Link
            href='/'
            className='ml-2 flex items-center font-medium hover:text-yellow-300'>
            <Image
              src={logo}
              alt='The `arolariu.ro` logo.'
              className='rounded-full ring-2 ring-indigo-500 2xsm:hidden lg:block'
              width={40}
              height={40}
            />
            <span className='ml-3 text-xl'>arolariu.ro</span>
          </Link>
        </div>

        <div className='navbar-center flex'>
          {Boolean(isDesktop) && <Navigation className='menu menu-horizontal' />}
        </div>

        <div className='navbar-end flex flex-row flex-wrap'>
          <div className='mr-4 mt-2'>
            {!isSignedIn && (
              <SignedOut>
                <Link
                  href='/auth'
                  className='mr-5 p-2 hover:text-yellow-300 2xsm:mr-3'>
                  Login
                </Link>
              </SignedOut>
            )}
            {Boolean(isSignedIn) && (
              <SignedIn>
                <UserButton />
              </SignedIn>
            )}
          </div>
          <ThemeSwitcherButton />
        </div>
      </nav>
    </header>
  );
}
