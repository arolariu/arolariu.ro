"use client";

import logo from "@/app/logo.svg";
import {useWindowSize} from "@arolariu/components";
import Image from "next/image";
import Link from "next/link";
import {memo} from "react";
import AuthButton from "./Buttons/AuthButton";
import ThemeButton from "./Buttons/ThemeButton";
import {DesktopNavigation, MobileNavigation} from "./Navigation";

/**
 * The header component.
 * @returns The header component.
 */
function Header(): React.JSX.Element {
  const {isMobile, isDesktop} = useWindowSize();

  return (
    <header className='print:hidden'>
      <nav className='navbar 2xsm:fixed 2xsm:top-0 2xsm:z-50 bg-white text-black lg:relative lg:z-auto dark:bg-black dark:text-white'>
        <div className='navbar-start flex flex-row flex-nowrap'>
          {Boolean(isMobile) && <MobileNavigation />}

          <Link
            href='/'
            className='ml-2 flex items-center font-medium hover:text-yellow-300'>
            <Image
              src={logo}
              alt='arolariu.ro logo'
              className='2xsm:hidden rounded-full ring-2 ring-indigo-500 lg:block'
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

// This component is memoized to prevent unnecessary re-renders
export default memo(Header);
