/** @format */

import Feature from "@/components/Features/Feature";
import {BackgroundBeams} from "@/components/ui/background-beams";
import {TypewriterEffect} from "@/components/ui/typewriter";
import {useTranslations} from "next-intl";
import Link from "next/link";
import {SiCsharp, SiGithubactions, SiMicrosoftazure, SiNextdotjs, SiOpentelemetry, SiSvelte} from "react-icons/si";

/**
 * The home page component.
 * @returns The home page component.
 */
export default function Home() {
  const t = useTranslations("Home");

  return (
    <main>
      <BackgroundBeams />
      <section className='py-12 sm:pb-16 lg:pb-20 xl:pb-24'>
        <article className='relative mx-auto max-w-full px-4 sm:px-6 lg:px-8 2xl:max-w-[120rem]'>
          <div>
            <h1 className='mt-6 text-4xl font-normal text-white 2xsm:text-center sm:mt-10 sm:text-5xl md:text-left lg:text-6xl xl:text-8xl'>
              <span className='bg-gradient-to-r from-cyan-500 to-purple-500 bg-clip-text text-transparent'>
                {t("title")}
              </span>
            </h1>
            <p className='mt-4 max-w-lg text-xl text-gray-500 2xsm:text-center md:text-left lg:max-w-2xl'>
              {t.rich("subtitle", {
                br: (chunks) => (
                  <>
                    <br />
                    {chunks}
                  </>
                ),
              })}
            </p>
            <div className='relative mt-8 inline-flex 2xsm:ml-[26%] md:ml-0'>
              <div className='absolute -inset-px rounded-full bg-gradient-to-r from-cyan-500 to-purple-500 transition-all duration-200 group-hover:shadow-lg group-hover:shadow-cyan-500/50' />
              <Link
                href='/domains'
                title=''
                className='relative inline-flex rounded-full border border-transparent bg-black px-8 py-3 text-white'>
                {t("cta")}
              </Link>
            </div>

            <div>
              <div className='mt-8 inline-flex items-center border-t border-gray-800 pt-6 dark:border-gray-300'>
                <svg
                  className='h-6 w-6'
                  viewBox='0 0 24 24'
                  fill='none'
                  strokeWidth='1.5'
                  xmlns='http://www.w3.org/2000/svg'>
                  <path
                    d='M13 7.00003H21M21 7.00003V15M21 7.00003L13 15L9 11L3 17'
                    stroke='url(#a)'
                    strokeLinecap='round'
                    strokeLinejoin='round'
                  />
                </svg>

                <span className='2xsm:text-center md:text-left'>{t("appreciation")}</span>
              </div>
            </div>
          </div>
        </article>
      </section>
      <section className='py-12 sm:pb-16 lg:pb-20 xl:pb-24'>
        <article className='mx-auto max-w-screen-xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8 lg:py-16'>
          <div className='text-center text-3xl font-bold sm:text-4xl'>
            <TypewriterEffect
              words={t("1stPanel.title")
                .split(" ")
                .map((word) => {
                  return {text: word};
                })}
            />
          </div>
          <p className='mt-4 text-center text-gray-500'>{t("1stPanel.subtitle")}</p>

          <div className='mt-8 grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3'>
            <Feature
              link='https://nextjs.org'
              title='Next.JS v14'
              description='The platform is built using NextJS - the most popular React framework for production.'>
              <SiNextdotjs className='inline h-10 w-10' />
            </Feature>

            <Feature
              link='https://portal.azure.com'
              title='Microsoft Azure'
              description='The Microsoft Azure cloud is used to host the platform and all of its services. This ensures that the platform is always available and that it can scale on demand.'>
              <SiMicrosoftazure className='inline h-10 w-10' />
            </Feature>

            <Feature
              link='https://learn.microsoft.com/en-us/dotnet'
              title='.NET 8 Ecosystem'
              description='The backend services are built using the latest LTS version of .NET 8'>
              <SiCsharp className='inline h-10 w-10' />
            </Feature>

            <Feature
              link='https://svelte.dev'
              title='Svelte'
              description='The `cv.arolariu.ro` platform is built exclusively using Svelte and SvelteKit (v5).'>
              <SiSvelte className='inline h-10 w-10' />
            </Feature>

            <Feature
              link='https://opentelemetry.io'
              title='OpenTelemetry'
              description='Everything is instrumented using OpenTelemetry. This allows for a unified telemetry experience across the board. (3PO: metrics, logs, traces)'>
              <SiOpentelemetry className='inline h-10 w-10' />
            </Feature>

            <Feature
              link='https://github.com/features/actions'
              title='GitHub Actions (DevOps)'
              description='The DevOps experience is powered by GitHub Actions. (CI/CD, Testing, etc.)'>
              <SiGithubactions className='inline h-10 w-10' />
            </Feature>
          </div>
          <Link
            href='/about'
            className='mx-auto mt-8 block text-center'>
            <button
              type='button'
              className='text-md btn btn-primary text-white'>
              Interesting? Click here to learn more...
            </button>
          </Link>
        </article>
      </section>
    </main>
  );
}
