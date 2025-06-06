/** @format */

import logo from "@/app/logo.svg";
import {COMMIT_SHA, SITE_NAME, TIMESTAMP} from "@/lib/utils.generic";
import {useTranslations} from "next-intl";
import {getTranslations} from "next-intl/server";
import Image from "next/image";
import Link from "next/link";
import React from "react";
import {SiGithub, SiLinkedin} from "react-icons/si";

const FooterHero = () => {
  const t = useTranslations("Footer");
  const description = t.rich("subtitle", {
    br: (chunks: React.ReactNode) => (
      <>
        <br />
        {chunks}
      </>
    ),
  });
  const siteName = SITE_NAME.toUpperCase();

  return (
    <div className='md:col-span-1 lg:col-span-2'>
      <Link
        href='/'
        aria-label='Go home'
        title='AROLARIU.RO'
        className='2xsm:ml-[20%] inline-flex transform items-center transition-all duration-300 ease-in-out hover:scale-110 hover:text-yellow-500 md:ml-0'>
        <Image
          src={logo}
          alt='The `arolariu.ro` logo.'
          className='rounded-full'
          width={40}
          height={40}
        />
        <span className='ml-2 text-xl font-bold tracking-wide uppercase'>{siteName}</span>
      </Link>
      <div className='2xsm:px-4 2xsm:text-center mt-4 text-sm md:px-0 md:text-left'>
        <p className='prose 2xsm:text-center text-pretty text-white md:text-start'>{description}</p>
      </div>
    </div>
  );
};

const FooterNavigation = () => {
  const t = useTranslations("Footer.navigation");

  return (
    <div className='2xsm:flex-col 2xsm:text-center flex gap-8 lg:flex-row lg:text-left'>
      <div>
        <p className='cursor-default font-semibold tracking-wide text-white hover:text-yellow-500'>{t("subdomains")}</p>
        <ul className='mt-2 space-y-2'>
          {SITE_NAME === "arolariu.ro" ? (
            <li>
              <Link
                href='https://dev.arolariu.ro'
                className='text-deep-purple-50 hover:text-teal-accent-400 transition-colors duration-300'>
                <code>dev.arolariu.ro</code>
              </Link>
            </li>
          ) : (
            <li>
              <Link
                href='https://arolariu.ro'
                className='text-deep-purple-50 hover:text-teal-accent-400 transition-colors duration-300'>
                <code>arolariu.ro</code>
              </Link>
            </li>
          )}
          <li>
            <Link
              href='https://api.arolariu.ro'
              className='text-deep-purple-50 hover:text-teal-accent-400 transition-colors duration-300'>
              <code>api.arolariu.ro</code>
            </Link>
          </li>
          <li>
            <Link
              href='https://docs.arolariu.ro'
              className='text-deep-purple-50 hover:text-teal-accent-400 transition-colors duration-300'>
              <code>docs.arolariu.ro</code>
            </Link>
          </li>
        </ul>
      </div>
      <div>
        <p className='cursor-default font-semibold tracking-wide text-white hover:text-yellow-500'>{t("about")}</p>
        <ul className='mt-2 space-y-2'>
          <li>
            <Link
              href='/about'
              className='text-deep-purple-50 hover:text-teal-accent-400 transition-colors duration-300'>
              {t("what")}
            </Link>
          </li>
          <li>
            <Link
              href='/acknowledgements'
              className='text-deep-purple-50 hover:text-teal-accent-400 transition-colors duration-300'>
              {t("acknowledgements")}
            </Link>
          </li>
          <li>
            <Link
              href='/terms-of-service'
              className='text-deep-purple-50 hover:text-teal-accent-400 transition-colors duration-300'>
              {t("termsOfService")}
            </Link>
          </li>
          <li>
            <Link
              href='/privacy-policy'
              className='text-deep-purple-50 hover:text-teal-accent-400 transition-colors duration-300'>
              {t("privacyPolicy")}
            </Link>
          </li>
        </ul>
      </div>
    </div>
  );
};

/**
 * The footer component.
 * @returns The footer component.
 */
export default async function Footer(): Promise<React.JSX.Element> {
  const t = await getTranslations("Footer");

  return (
    <footer className='relative bottom-0 w-full bg-indigo-700'>
      <svg
        className='absolute top-0 -mt-5 h-6 w-full text-indigo-700 sm:-mt-10 sm:h-16'
        preserveAspectRatio='none'
        viewBox='0 0 1440 54'>
        <path
          fill='currentColor'
          d='M0 22L120 16.7C240 11 480 1.00001 720 0.700012C960 1.00001 1200 11 1320 16.7L1440 22V54H1320C1200 54 960 54 720 54C480 54 240 54 120 54H0V22Z'
        />
      </svg>

      <div className='mx-auto pt-12 text-white md:px-24 lg:max-w-(--breakpoint-xl) lg:px-8'>
        <div className='mb-8 grid gap-8 sm:grid-cols-2 lg:grid-cols-3'>
          <FooterHero />
          <FooterNavigation />
        </div>

        {/* Footer metadata information */}
        <div className='flex flex-row flex-wrap justify-between gap-8 border-t py-5'>
          <p className='2xsm:text-center 2xsm:mx-auto text-sm md:mx-0 md:text-left'>
            © {t("copyright")} 2022-{new Date().getFullYear()} Alexandru-Razvan Olariu. <br />
            <span className='ml-4'>
              {t("sourceCode")}
              <Link
                href='https://github.com/arolariu/arolariu.ro/'
                target='_blank'
                className='text-yellow-500 italic'>
                {t("sourceCodeAnchor")}
              </Link>
            </span>
          </p>
          <div className='2xsm:mx-auto flex flex-row items-center space-x-8 md:mx-0'>
            <Link
              href='https://github.com/arolariu'
              target='_blank'
              about='GitHub'
              aria-label="Select this link to navigate to the author's GitHub page.">
              <SiGithub className='h-7 w-7 hover:text-yellow-500' />
            </Link>
            <Link
              href='https://linkedin.com/in/olariu-alexandru'
              target='_blank'
              about='LinkedIn'
              aria-label="Select this link to navigate to the author's LinkedIn page.">
              <SiLinkedin className='h-7 w-7 hover:text-yellow-500' />
            </Link>
          </div>
        </div>
        <p className='2xsm:text-center text-sm text-slate-300 md:text-end'>
          {t("builtOn")}
          <code
            className='tooltip md:tooltip-left 2xsm:tooltip-top cursor-help'
            data-tip={new Date(TIMESTAMP)}>
            {TIMESTAMP.split("T")[0]}
          </code>
          <br />
          <span>
            Commit SHA: <code>{COMMIT_SHA}</code>
          </span>
        </p>
      </div>
    </footer>
  );
}
