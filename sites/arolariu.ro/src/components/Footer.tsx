/**
 * @fileoverview Site-wide footer component with navigation, branding, and metadata.
 * @module components/Footer
 *
 * @remarks
 * Provides the global footer used across all pages in the arolariu.ro website.
 * Includes cross-subdomain navigation, social links, build info, and legal pages.
 *
 * **Why Client Component?**
 * Uses `useTranslations` hook from next-intl which requires client-side React context.
 *
 * @see {@link https://next-intl.com/docs/environments/server-client-components | next-intl docs}
 */

"use client";

import logo from "@/app/logo.svg";
import {COMMIT_SHA, SITE_NAME, TIMESTAMP} from "@/lib/utils.generic";
import {RichText} from "@/presentation/Text";
import {Tooltip, TooltipContent, TooltipProvider, TooltipTrigger} from "@arolariu/components";
import {useTranslations} from "next-intl";
import Image from "next/image";
import Link from "next/link";
import React, {memo} from "react";
import {TbBrandGithub, TbBrandLinkedin} from "react-icons/tb";

/**
 * Renders the site-wide footer with navigation, metadata, and social links.
 *
 * @remarks
 * **Rendering Context**: Client Component (`"use client"` directive required).
 *
 * **Why Client Component?**
 * - Uses `useTranslations` hook from next-intl for client-side i18n
 * - Hook requires React context provided by `NextIntlClientProvider`
 * - Enables dynamic translation updates without full page reload
 *
 * **Key Features:**
 * - **Multi-subdomain Navigation**: Dynamically switches between production (`arolariu.ro`)
 *   and development (`dev.arolariu.ro`) environments based on `SITE_NAME`
 * - **Internationalization**: Uses `next-intl` client hook for multilingual support
 *   (translations via `Footer` namespace)
 * - **Build Metadata**: Displays commit SHA and build timestamp with interactive tooltips
 * - **Responsive Design**: Adapts layout for mobile (2xsm), tablet (sm/md), and desktop (lg/xl)
 * - **SVG Wave Decoration**: Custom SVG path creates visual transition from content to footer
 *
 * **Subdomain Logic:**
 * - If `SITE_NAME === "arolariu.ro"`: Shows link to `dev.arolariu.ro` (development environment)
 * - Otherwise: Shows link to `arolariu.ro` (production environment)
 * - Always includes: `cv.arolariu.ro`, `api.arolariu.ro`, `docs.arolariu.ro`
 *
 * **Navigation Sections:**
 * 1. **Subdomains**: Cross-links to other arolariu.ro services
 * 2. **About Pages**: Links to `/about`, `/acknowledgements`, `/terms-of-service`, `/privacy-policy`
 * 3. **Social Media**: GitHub and LinkedIn profiles
 * 4. **Metadata**: Copyright notice, source code link, build info, commit SHA
 *
 * **Styling Architecture:**
 * - Base: footer-bg background (dynamic, derived from gradient theme) with white text
 * - Hover Effects: Yellow 500 accent color on interactive elements
 * - Responsive Classes: Uses Tailwind's `2xsm:` (custom), `sm:`, `md:`, `lg:` breakpoints
 *
 * **Dependencies:**
 * - `@arolariu/components`: Tooltip components from shared UI library
 * - `next-intl`: Client-side translation hook (`useTranslations`)
 * - `react-icons/tb`: Tabler icons for social media (GitHub, LinkedIn)
 * - Environment constants: `COMMIT_SHA`, `SITE_NAME`, `TIMESTAMP` from `utils.generic`
 *
 * **Performance Considerations:**
 * - Next.js Image component for optimized logo rendering with automatic format selection
 * - Static links enable automatic prefetching for faster navigation
 * - Tooltip lazy-loaded on hover to reduce initial render cost
 * - Translation bundle loaded via NextIntlClientProvider in parent layout
 *
 * @returns Footer JSX element with navigation, branding, and metadata sections
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
 * @see {@link RichText} - Component for rendering internationalized rich text content
 * @see {@link SITE_NAME} - Environment constant determining subdomain link behavior
 * @see {@link COMMIT_SHA} - Git commit SHA for build traceability
 * @see {@link TIMESTAMP} - Build timestamp for deployment tracking
 * @see {@link https://next-intl.com/docs/usage/messages | next-intl useTranslations}
 */
function FooterComponent(): React.JSX.Element {
  const t = useTranslations("Footer");
  const siteName = SITE_NAME.toUpperCase();

  return (
    <footer className='footer'>
      <svg
        className='footer__wave'
        preserveAspectRatio='none'
        viewBox='0 0 1440 54'>
        <path
          fill='currentColor'
          d='M0 22L120 16.7C240 11 480 1.00001 720 0.700012C960 1.00001 1200 11 1320 16.7L1440 22V54H1320C1200 54 960 54 720 54C480 54 240 54 120 54H0V22Z'
        />
      </svg>

      <div className='footer__container'>
        <div className='footer__grid'>
          <div className='footer__brand-section'>
            <Link
              href='/'
              aria-label='Go home'
              title='AROLARIU.RO'
              className='footer__brand-link'>
              <Image
                src={logo}
                alt='The `arolariu.ro` logo.'
                className='footer__logo'
                width={40}
                height={40}
              />
              <span className='footer__brand-name'>{siteName}</span>
            </Link>
            <div className='footer__brand-description'>
              <RichText
                className='footer__rich-text prose'
                sectionKey='Footer'
                textKey='subtitle'
              />
            </div>
          </div>
          <div className='footer__nav-section'>
            <div>
              <p className='footer__nav-title'>{t("navigation.subdomains")}</p>
              <ul className='footer__nav-list'>
                <li>
                  <Link
                    href='https://cv.arolariu.ro'
                    className='footer__nav-link'>
                    <code>cv.arolariu.ro</code>
                  </Link>
                </li>
                {SITE_NAME === "arolariu.ro" ? (
                  <li>
                    <Link
                      href='https://dev.arolariu.ro'
                      className='footer__nav-link'>
                      <code>dev.arolariu.ro</code>
                    </Link>
                  </li>
                ) : (
                  <li>
                    <Link
                      href='https://arolariu.ro'
                      className='footer__nav-link'>
                      <code>arolariu.ro</code>
                    </Link>
                  </li>
                )}
                <li>
                  <Link
                    href='https://api.arolariu.ro'
                    className='footer__nav-link'>
                    <code>api.arolariu.ro</code>
                  </Link>
                </li>
                <li>
                  <Link
                    href='https://docs.arolariu.ro'
                    className='footer__nav-link'>
                    <code>docs.arolariu.ro</code>
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <p className='footer__nav-title'>{t("navigation.about")}</p>
              <ul className='footer__nav-list'>
                <li>
                  <Link
                    href='/about'
                    className='footer__nav-link'>
                    {t("navigation.what")}
                  </Link>
                </li>
                <li>
                  <Link
                    href='/acknowledgements'
                    className='footer__nav-link'>
                    {t("navigation.acknowledgements")}
                  </Link>
                </li>
                <li>
                  <Link
                    href='/terms-of-service'
                    className='footer__nav-link'>
                    {t("navigation.termsOfService")}
                  </Link>
                </li>
                <li>
                  <Link
                    href='/privacy-policy'
                    className='footer__nav-link'>
                    {t("navigation.privacyPolicy")}
                  </Link>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Footer metadata information */}
        <div className='footer__meta'>
          <p className='footer__copyright'>
            &copy; {t("copyright")} 2022-{new Date().getFullYear()} Alexandru-Razvan Olariu. <br />
            <span className='ml-4'>
              {t("sourceCode")}
              <Link
                href='https://github.com/arolariu/arolariu.ro/'
                target='_blank'
                className='footer__source-link'>
                {t("sourceCodeAnchor")}
              </Link>
            </span>
          </p>
          <div className='footer__social'>
            <Link
              href='https://github.com/arolariu'
              target='_blank'
              about='GitHub'
              aria-label={t("socialLinks.github")}>
              <TbBrandGithub className='footer__social-icon' />
            </Link>
            <Link
              href='https://linkedin.com/in/olariu-alexandru'
              target='_blank'
              about='LinkedIn'
              aria-label={t("socialLinks.linkedin")}>
              <TbBrandLinkedin className='footer__social-icon' />
            </Link>
          </div>
        </div>
        <div className='footer__build-info'>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className='footer__build-tooltip'>{`${t("builtOn")} ${TIMESTAMP.split("T")[0]}`}</span>
              </TooltipTrigger>
              <TooltipContent className='footer__tooltip-content'>
                <code className='footer__build-tooltip'>{new Date(TIMESTAMP).toUTCString()}</code>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <br />
          <span>
            {t("commitSha")}{" "}
            <Link
              href={`https://github.com/arolariu/arolariu.ro/commit/${COMMIT_SHA}`}
              target='_blank'
              className='footer__commit-link'>
              <code>{COMMIT_SHA.slice(0, 20)}</code>
            </Link>
          </span>
        </div>
      </div>
    </footer>
  );
}

/**
 * Memoized Footer component to prevent unnecessary re-renders.
 * The footer content is mostly static, so memoization provides performance benefits.
 */
const Footer = memo(FooterComponent);
Footer.displayName = "Footer";

export default Footer;
