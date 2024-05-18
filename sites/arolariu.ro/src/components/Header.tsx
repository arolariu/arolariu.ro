/** @format */

"use client";

import {SignedIn, SignedOut, UserButton, useUser} from "@clerk/nextjs";
import {HamburgerMenuIcon} from "@radix-ui/react-icons";
import Link from "next/link";
import ThemeSwitcherButton from "./Buttons/ThemeButton";
import {Button} from "./ui/button";
import {Popover, PopoverContent, PopoverTrigger} from "./ui/popover";
import {Skeleton} from "./ui/skeleton";

const NavigationLinks = [
  {href: "/domains", label: "Domains"},
  {href: "/events", label: "Events"},
];

const HeaderSkeleton = () => (
  <header>
    <nav className='navbar bg-white dark:bg-black 2xsm:fixed 2xsm:top-0 2xsm:z-50 lg:relative lg:z-auto'>
      <div className='navbar-start flex flex-row flex-nowrap'>
        <Skeleton className='h-10 w-10 rounded-full bg-indigo-500 p-2 text-white' />
      </div>
      <div className='navbar-center gap-8 2xsm:hidden lg:relative lg:flex'>
        <Skeleton className='h-10 w-10 text-white' />
        <Skeleton className='h-10 w-10 text-white' />
        <Skeleton className='h-10 w-10 text-white' />
      </div>
      <div className='navbar-end flex flex-row flex-wrap'>
        <Skeleton className='h-10 w-10 rounded-full bg-indigo-500 p-2 text-white' />
      </div>
    </nav>
  </header>
);

const Navigation = ({className}: Readonly<{className?: string}>) => {
  const {isLoaded, isSignedIn, user} = useUser();
  if (!isLoaded) return;

  return (
    <ul className={className}>
      {NavigationLinks.map(({href, label}) => (
        <li key={href}>
          <Link
            href={href}
            className='indicator mr-5 hover:text-yellow-300'>
            {label}
          </Link>
        </li>
      ))}

      {!isSignedIn && (
        <li>
          <Link
            href='/auth'
            className='indicator mr-5 hover:text-yellow-300'>
            Auth
          </Link>
        </li>
      )}
      {!!isSignedIn && (
        <li>
          <Link
            href={`/accounts/${user.id}`}
            className='indicator mr-5 hover:text-yellow-300'>
            Account
          </Link>
        </li>
      )}
    </ul>
  );
};

/**
 * The header component.
 * @returns The header component.
 */
export default function Header() {
  const {isLoaded, isSignedIn} = useUser();
  if (!isLoaded) return <HeaderSkeleton />;

  return (
    <header>
      <nav className='navbar bg-white dark:bg-black 2xsm:fixed 2xsm:top-0 2xsm:z-50 lg:relative lg:z-auto'>
        <div className='navbar-start flex flex-row flex-nowrap'>
          <div className='lg:hidden'>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant='outline'>
                  <HamburgerMenuIcon />
                </Button>
              </PopoverTrigger>
              <PopoverContent>
                <Navigation className='menu menu-vertical' />
              </PopoverContent>
            </Popover>
          </div>
          <Link
            href='/'
            className='ml-2 flex items-center font-medium'>
            <svg
              xmlns='http://www.w3.org/2000/svg'
              fill='none'
              stroke='currentColor'
              strokeLinecap='round'
              strokeLinejoin='round'
              strokeWidth='2'
              className='h-10 w-10 rounded-full bg-indigo-500 p-2 text-white'
              viewBox='0 0 24 24'>
              <path d='M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5' />
            </svg>
            <span className='ml-3 text-xl'>arolariu.ro</span>
          </Link>
        </div>

        <div className='navbar-center 2xsm:hidden lg:relative lg:flex'>
          <Navigation className='menu menu-horizontal' />
        </div>

        <div className='navbar-end flex flex-row flex-wrap'>
          <div className='mr-4 mt-2'>
            {!isSignedIn && (
              <SignedOut>
                <Link
                  href='/auth'
                  className='mr-5 hover:text-yellow-300 2xsm:mr-1'>
                  Login
                </Link>
              </SignedOut>
            )}
            {!!isSignedIn && (
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
