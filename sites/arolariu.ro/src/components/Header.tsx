/** @format */

"use client";

import useWindowSize from "@/hooks/useWindowSize";
import Image from "next/image";
import Link from "next/link";
import {Button, MenuTrigger, Popover} from "react-aria-components";
import logo from "../../public/logo.svg";
import AuthButton from "./Buttons/AuthButton";
import ThemeSwitcherButton from "./Buttons/ThemeButton";
import {Navigation} from "./Navigation";

/**
 * The header component.
 * @returns The header component.
 */
export default function Header() {
  const {isMobile, isDesktop} = useWindowSize();

  return (
    <header>
      <nav className='navbar bg-white dark:bg-black 2xsm:fixed 2xsm:top-0 2xsm:z-50 lg:relative lg:z-auto'>
        <div className='navbar-start flex flex-row flex-nowrap'>
          {Boolean(isMobile) && (
            <MenuTrigger>
              <Button className='flex size-10 flex-col items-center justify-center justify-items-center align-middle'>
                ☰
              </Button>
              <Popover className='rounded-b-xl bg-white dark:bg-black'>
                <Navigation className='menu menu-vertical' />
              </Popover>
            </MenuTrigger>
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

        <div className='navbar-end flex flex-row flex-wrap gap-2'>
          <AuthButton />
          <ThemeSwitcherButton />
        </div>
      </nav>
    </header>
  );
}
