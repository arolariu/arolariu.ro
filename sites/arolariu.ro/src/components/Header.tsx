import {SITE_URL} from "@/constants";
import {SignedIn, SignedOut, UserButton} from "@clerk/nextjs";
import {HamburgerMenuIcon} from "@radix-ui/react-icons";
import Link from "next/link";
import ThemeSwitcherButton from "./Buttons/ThemeButton";
import Navigation from "./Navigation";
import {Button} from "./ui/button";
import {Popover, PopoverContent, PopoverTrigger} from "./ui/popover";

/**
 * The header component.
 * @returns The header component.
 */
export default function Header() {
  return (
    <header>
      <nav className='navbar bg-white 2xsm:fixed 2xsm:top-0 2xsm:z-50 lg:relative lg:z-auto dark:bg-black'>
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

        <div className='navbar-center 2xsm:hidden lg:relative lg:flex'>
          <Navigation className='menu menu-horizontal' />
        </div>

        <div className='navbar-end flex flex-row flex-wrap'>
          <div className='mr-4 mt-2'>
            <SignedOut>
              <Link
                href={`${SITE_URL}/auth`}
                className='mr-5 hover:text-yellow-300 2xsm:mr-1'>
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
