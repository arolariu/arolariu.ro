/** @format */

"use client";

import logo from "@/app/logo.svg";
import {useWindowSize} from "@/hooks";
import Image from "next/image";
import Link from "next/link";
import {AuthButton, ThemeButton} from "./Buttons";
import {DesktopNavigation, MobileNavigation} from "./Navigation";

/**
 * The header component.
 * @returns The header component.
 */
export default function Header() {
  const {isMobile, isDesktop} = useWindowSize();

  return (
    <header>
      <nav className='navbar bg-white text-black dark:bg-black dark:text-white 2xsm:fixed 2xsm:top-0 2xsm:z-50 lg:relative lg:z-auto'>
        <div className='navbar-start flex flex-row flex-nowrap'>
          {Boolean(isMobile) && <MobileNavigation />}

          <Link
            href='/'
            className='ml-2 flex items-center font-medium hover:text-yellow-300'>
            <Image
              src={logo}
              alt=''
              aria-hidden
              className='rounded-full ring-2 ring-indigo-500 2xsm:hidden lg:block'
              width={40}
              height={40}
            />
            <span className='ml-3 text-xl'>arolariu.ro</span>
          </Link>
        </div>

        <div className='navbar-center flex flex-row flex-nowrap'>{Boolean(isDesktop) && <DesktopNavigation />}</div>

        <div className='navbar-end flex flex-row flex-wrap gap-4'>
          <AuthButton />
          <ThemeButton />
        </div>
      </nav>
    </header>
  );
}
