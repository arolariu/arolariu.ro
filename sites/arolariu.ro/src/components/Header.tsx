import {SITE_URL} from "@/constants";
import {SignedIn, SignedOut, UserButton} from "@clerk/nextjs";
import Link from "next/link";
import {GiHamburgerMenu} from "react-icons/gi";
import ThemeSwitcherButton from "./Buttons/ThemeButton";
import Navigation from "./Navigation";

/**
 * The header component.
 * @returns The header component.
 */
export default function Header() {
  return (
    <header>
      <nav className='navbar bg-white text-black 2xsm:fixed 2xsm:top-0 2xsm:z-50 md:relative md:z-auto dark:bg-black dark:text-white'>
        <div className='navbar-start'>
          <div className='dropdown'>
            <GiHamburgerMenu
              tabIndex={0}
              className='btn btn-circle btn-ghost h-full w-full lg:hidden'
            />
            <Navigation className='menu dropdown-content menu-sm bg-white lg:ml-[12%] dark:bg-black' />
          </div>

          <Link
            href={SITE_URL}
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

        <div className='navbar-center hidden lg:flex'>
          <Navigation className='menu menu-horizontal' />
        </div>

        <div className='navbar-end'>
          <div className='-mt-1 mr-4'>
            <SignedOut>
              <Link
                href={`${SITE_URL}/auth`}
                className='mr-5 hover:text-yellow-300'>
                Login
              </Link>
            </SignedOut>
            <SignedIn>
              <UserButton afterSignOutUrl='/' />
            </SignedIn>
          </div>
          <ThemeSwitcherButton />
        </div>
      </nav>
    </header>
  );
}
