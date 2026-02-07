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
    <header className='header'>
      <nav className='header__nav'>
        <div className='header__start'>
          {Boolean(isMobile) && <MobileNavigation />}

          <Link
            href='/'
            className='header__brand'>
            <Image
              src={logo}
              alt='arolariu.ro logo'
              className='header__logo'
              width={40}
              height={40}
            />
            <span className='header__title'>arolariu.ro</span>
          </Link>
        </div>

        <div className='header__center'>{Boolean(isDesktop) && <DesktopNavigation />}</div>

        <div className='header__end'>
          <AuthButton />
          <ThemeButton />
        </div>
      </nav>
    </header>
  );
}

// This component is memoized to prevent unnecessary re-renders
export default memo(Header);
