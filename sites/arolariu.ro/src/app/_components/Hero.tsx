/** @format */

import {RichText} from "@/presentation/Text";
import {motion} from "motion/react";
import {useTranslations} from "next-intl";
import Link from "next/link";
import TechSphere from "../_effects/TechSphere";

/**
 * The hero section of the homepage, CSR'ed.
 * This component renders the hero section of the homepage.
 * It displays a title, subtitle, and a call-to-action button.
 * The hero section is animated using the `motion` library.
 * @returns The hero section of the homepage, CSR'ed.
 */
export default function HeroSection(): React.JSX.Element {
  const t = useTranslations("Home");
  return (
    <section className='relative min-h-screen overflow-hidden py-20'>
      <article className='mx-auto grid grid-cols-1 items-center gap-12 px-4 lg:grid-cols-2'>
        {/* Left side */}
        <motion.div
          initial={{opacity: 0, scale: 0.8}}
          animate={{opacity: 1, scale: 1}}
          transition={{duration: 0.8, delay: 0.3}}
          className='relative z-10'>
          <h1 className='2xsm:text-center mt-6 text-4xl font-normal text-white sm:mt-10 sm:text-5xl md:text-left lg:text-6xl xl:text-8xl'>
            <span className='bg-linear-to-r from-cyan-500 to-purple-500 bg-clip-text text-transparent'>{t("title")}</span>
          </h1>
          <p className='2xsm:text-center mt-4 max-w-lg text-xl text-gray-500 md:text-left lg:max-w-2xl'>
            <RichText
              sectionKey='Home'
              textKey='subtitle'
            />
          </p>
          <div className='2xsm:ml-[26%] relative mt-8 inline-flex md:ml-0'>
            <div className='absolute -inset-px rounded-full bg-linear-to-r from-cyan-500 to-purple-500 transition-all duration-200 group-hover:shadow-lg group-hover:shadow-cyan-500/50' />
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
        </motion.div>
        {/* Right side */}
        <motion.div
          initial={{opacity: 0, scale: 0.8}}
          animate={{opacity: 1, scale: 1}}
          transition={{duration: 0.8, delay: 0.3}}
          className='relative flex flex-col items-center justify-center'>
          <div className='relative mx-auto w-full max-w-[400px]'>
            <motion.div
              className='bg-primary/20 absolute -top-20 -left-20 h-40 w-40 rounded-full blur-3xl'
              animate={{
                scale: [1, 1.2, 1],
                opacity: [0.3, 0.5, 0.3],
              }}
              transition={{
                duration: 8,
                repeat: Number.POSITIVE_INFINITY,
                repeatType: "reverse",
              }}
            />
            <motion.div
              className='absolute -right-20 -bottom-20 h-40 w-40 rounded-full bg-purple-500/20 blur-3xl'
              animate={{
                scale: [1, 1.2, 1],
                opacity: [0.3, 0.5, 0.3],
              }}
              transition={{
                duration: 6,
                repeat: Number.POSITIVE_INFINITY,
                repeatType: "reverse",
              }}
            />

            <div className='hidden lg:block'>
              <TechSphere />
            </div>

            {/* Mobile-only animation */}
            <div className='block w-full sm:hidden'>
              <div className='relative flex h-60 w-full items-center justify-center'>
                <motion.div
                  className='bg-primary/20 absolute h-32 w-32 rounded-full blur-xl'
                  animate={{
                    scale: [1, 1.2, 1],
                    opacity: [0.3, 0.5, 0.3],
                  }}
                  transition={{
                    duration: 4,
                    repeat: Number.POSITIVE_INFINITY,
                    repeatType: "reverse",
                  }}
                />
              </div>
            </div>
          </div>
        </motion.div>
      </article>
    </section>
  );
}
