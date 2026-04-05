"use client";

/**
 * @fileoverview Site-wide header component with responsive navigation, authentication, and theme controls.
 * @module components/Header
 *
 * @remarks
 * Provides the global header used across all pages in the arolariu.ro website.
 * Includes responsive navigation, branding, authentication controls, and theme switching.
 *
 * **Why Client Component?**
 * Uses `useWindowSize` and `useTranslations` hooks which require client-side React context.
 *
 * @see {@link https://next-intl.com/docs/environments/server-client-components | next-intl docs}
 * @see {@link https://react.dev/reference/react/memo | React.memo}
 */

import logo from "@/app/logo.svg";
import {useWindowSize} from "@arolariu/components";
import {useTranslations} from "next-intl";
import Image from "next/image";
import Link from "next/link";
import {memo} from "react";
import AuthButton from "./Buttons/AuthButton";
import ThemeButton from "./Buttons/ThemeButton";
import {DesktopNavigation, MobileNavigation} from "./Navigation";

/**
 * Renders the site-wide header with responsive navigation, branding, and controls.
 *
 * @remarks
 * **Rendering Context**: Client Component (`"use client"` directive required).
 *
 * **Why Client Component?**
 * - Uses `useWindowSize` hook from @arolariu/components for responsive rendering
 * - Uses `useTranslations` hook from next-intl for client-side i18n
 * - Both hooks require React context provided by client-side providers
 * - Enables dynamic layout updates on viewport changes without full page reload
 *
 * **Key Features:**
 * - **Responsive Navigation**: Switches between mobile (hamburger menu) and desktop (horizontal nav) layouts based on viewport width
 * - **Internationalization**: Uses `next-intl` client hook for multilingual support (translations via `Common.accessibility` namespace)
 * - **Authentication Controls**: Displays AuthButton for sign-in/sign-out via Clerk
 * - **Theme Switching**: Provides ThemeButton for light/dark mode toggle
 * - **Brand Identity**: Displays logo and site name with link to homepage
 *
 * **Layout Structure:**
 * 1. **Start Section** (`header__start`): Mobile navigation toggle + Logo + Site name
 * 2. **Center Section** (`header__center`): Desktop navigation (hidden on mobile)
 * 3. **End Section** (`header__end`): Authentication + Theme controls
 *
 * **Responsive Behavior:**
 * - Mobile (`isMobile === true`): Shows `MobileNavigation` (hamburger menu)
 * - Desktop (`isDesktop === true`): Shows `DesktopNavigation` (horizontal menu)
 * - Breakpoints determined by `useWindowSize` hook from component library
 *
 * **Styling Architecture:**
 * - Base: `.header` class with responsive flex layout
 * - Sections: `.header__start`, `.header__center`, `.header__end` for flex positioning
 * - Components: `.header__nav`, `.header__brand`, `.header__logo`, `.header__title`
 * - BEM methodology for consistent, predictable class naming
 *
 * **Dependencies:**
 * - `@arolariu/components`: `useWindowSize` hook for responsive viewport detection
 * - `next-intl`: `useTranslations` hook for client-side internationalization
 * - `next/image`: Optimized logo rendering with automatic format selection
 * - `next/link`: Client-side navigation for brand link
 * - `AuthButton`: Authentication controls with Clerk integration
 * - `ThemeButton`: Theme switching controls for light/dark mode
 * - `DesktopNavigation`, `MobileNavigation`: Platform-specific navigation components
 *
 * **Performance Considerations:**
 * - Component is memoized via `React.memo` to prevent unnecessary re-renders
 * - Next.js Image component for optimized logo with automatic format selection and lazy loading
 * - Conditional rendering (`Boolean(isMobile)`, `Boolean(isDesktop)`) prevents hydration mismatches
 * - Navigation components conditionally rendered based on viewport size to reduce DOM nodes
 * - Translation bundle loaded via NextIntlClientProvider in parent layout
 *
 * **Accessibility:**
 * - Logo has proper alt text from i18n translations (`Common.accessibility.logoAlt`)
 * - Brand link is keyboard navigable with semantic HTML
 * - Navigation sections properly structured with semantic `<header>` and `<nav>` tags
 * - Responsive design maintains usability across all device sizes
 * - Interactive elements (buttons, links) have proper focus states
 *
 * @returns Header JSX element with responsive navigation, branding, and control buttons
 *
 * @example
 * ```tsx
 * // Usage in root layout (app/layout.tsx)
 * export default function RootLayout({ children }) {
 *   return (
 *     <html>
 *       <body>
 *         <Header />
 *         <main>{children}</main>
 *         <Footer />
 *       </body>
 *     </html>
 *   );
 * }
 * ```
 *
 * @see {@link useWindowSize} - Hook for responsive viewport detection from component library
 * @see {@link AuthButton} - Authentication control component with Clerk integration
 * @see {@link ThemeButton} - Theme switching component for light/dark mode
 * @see {@link DesktopNavigation} - Desktop horizontal navigation menu
 * @see {@link MobileNavigation} - Mobile hamburger navigation menu
 * @see {@link Footer} - Companion footer component with similar structure
 * @see {@link https://next-intl.com/docs/usage/messages | next-intl useTranslations}
 */
function Header(): React.JSX.Element {
  const {isMobile, isDesktop} = useWindowSize();
  const t = useTranslations("Common.accessibility");

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
              alt={t("logoAlt")}
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
