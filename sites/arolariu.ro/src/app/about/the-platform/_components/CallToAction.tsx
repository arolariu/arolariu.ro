"use client";

import {BackgroundBeams} from "@arolariu/components/background-beams";
import {Button} from "@arolariu/components/button";
import {motion, useInView} from "motion/react";
import {useTranslations} from "next-intl";
import Link from "next/link";
import {useRef} from "react";
import {TbArrowRight, TbBrandGithub, TbMail, TbRocket, TbUser} from "react-icons/tb";

const trustGradients = ["from-blue-500 to-cyan-500", "from-purple-500 to-pink-500", "from-orange-500 to-amber-500"];
const trustIds = ["openSource", "privacyFirst", "freeToUse"];

/**
 * Call-to-Action component for the Platform page footer.
 * Features an engaging CTA section with animated background and multiple action buttons.
 * @returns The CallToAction component, CSR'ed.
 */
export default function CallToAction(): React.JSX.Element {
  const t = useTranslations("About.Platform.callToAction");
  const ref = useRef<HTMLElement>(null);
  const isInView = useInView(ref, {once: true, margin: "-100px"});

  return (
    <section
      ref={ref}
      className='relative overflow-hidden py-24'>
      {/* Background */}
      <div className='absolute inset-0 -z-10'>
        {/* Gradient base */}
        <div className='from-background via-primary/10 to-background absolute inset-0 bg-gradient-to-b' />

        {/* Animated gradient orbs */}
        <motion.div
          className='absolute inset-0'
          initial={{opacity: 0}}
          animate={isInView ? {opacity: 1} : {}}
          transition={{duration: 1}}>
          <motion.div
            className='absolute top-1/4 left-1/4 h-[400px] w-[400px] rounded-full bg-gradient-to-br from-blue-500/20 via-purple-500/10 to-transparent blur-3xl'
            animate={{
              scale: [1, 1.2, 1],
              x: [0, 30, 0],
              y: [0, -20, 0],
            }}
            transition={{
              duration: 10,
              repeat: Number.POSITIVE_INFINITY,
              repeatType: "reverse",
            }}
          />
          <motion.div
            className='absolute right-1/4 bottom-1/4 h-[500px] w-[500px] rounded-full bg-gradient-to-tl from-pink-500/15 via-purple-500/10 to-transparent blur-3xl'
            animate={{
              scale: [1, 1.3, 1],
              x: [0, -40, 0],
              y: [0, 30, 0],
            }}
            transition={{
              duration: 12,
              repeat: Number.POSITIVE_INFINITY,
              repeatType: "reverse",
            }}
          />
        </motion.div>

        {/* Grid pattern */}
        <div className='absolute inset-0 bg-[linear-gradient(to_right,#80808005_1px,transparent_1px),linear-gradient(to_bottom,#80808005_1px,transparent_1px)] bg-[size:48px_48px]' />

        {/* Background beams */}
        <BackgroundBeams className='opacity-30' />
      </div>

      <div className='relative z-10 container mx-auto px-4'>
        <div className='mx-auto max-w-4xl text-center'>
          {/* Heading */}
          <motion.div
            initial={{opacity: 0, y: 30}}
            animate={isInView ? {opacity: 1, y: 0} : {}}
            transition={{duration: 0.6}}>
            <h2 className='mb-6 text-4xl font-bold tracking-tight md:text-5xl lg:text-6xl'>
              {t("title")}{" "}
              <span className='bg-gradient-to-r from-gradient-from via-gradient-via to-gradient-to bg-clip-text text-transparent'>
                {t("titleHighlight")}
              </span>
              ?
            </h2>
          </motion.div>

          {/* Description */}
          <motion.p
            className='text-muted-foreground mx-auto mb-10 max-w-2xl text-lg md:text-xl'
            initial={{opacity: 0, y: 30}}
            animate={isInView ? {opacity: 1, y: 0} : {}}
            transition={{duration: 0.6, delay: 0.1}}>
            {t("description")}
          </motion.p>

          {/* CTA Buttons */}
          <motion.div
            className='flex flex-col items-center justify-center gap-4 sm:flex-row'
            initial={{opacity: 0, y: 30}}
            animate={isInView ? {opacity: 1, y: 0} : {}}
            transition={{duration: 0.6, delay: 0.2}}>
            {/* Primary CTA */}
            <motion.div
              whileHover={{scale: 1.05}}
              whileTap={{scale: 0.95}}>
              <Button
                asChild
                size='lg'
                className='group relative h-14 cursor-pointer gap-3 overflow-hidden px-8 text-lg font-semibold'>
                <Link href='/domains'>
                  <TbRocket className='h-5 w-5 transition-transform group-hover:rotate-12' />
                  <span>{t("cta.exploreApplications")}</span>
                  <TbArrowRight className='h-5 w-5 transition-transform group-hover:translate-x-1' />
                  <motion.span
                    className='from-primary/20 to-primary/5 absolute inset-0 bg-gradient-to-r'
                    initial={{x: "-100%", opacity: 0}}
                    whileHover={{x: "100%", opacity: 1}}
                    transition={{duration: 0.6}}
                  />
                </Link>
              </Button>
            </motion.div>

            {/* Secondary CTAs */}
            <motion.div
              whileHover={{scale: 1.05}}
              whileTap={{scale: 0.95}}>
              <Button
                asChild
                size='lg'
                variant='outline'
                className='group relative h-14 gap-3 overflow-hidden px-8 text-lg font-semibold'>
                <Link href='/auth/sign-up'>
                  <TbUser className='h-5 w-5 transition-transform group-hover:rotate-12' />
                  <span>{t("cta.createAccount")}</span>
                  <motion.span
                    className='bg-primary/5 absolute inset-0'
                    initial={{x: "-100%", opacity: 0}}
                    whileHover={{x: "100%", opacity: 1}}
                    transition={{duration: 0.6}}
                  />
                </Link>
              </Button>
            </motion.div>
          </motion.div>

          {/* Secondary Links */}
          <motion.div
            className='mt-10 flex flex-wrap items-center justify-center gap-6'
            initial={{opacity: 0}}
            animate={isInView ? {opacity: 1} : {}}
            transition={{duration: 0.6, delay: 0.4}}>
            <Link
              href='https://github.com/arolariu/arolariu.ro'
              target='_blank'
              rel='noopener noreferrer'
              className='text-muted-foreground hover:text-primary flex items-center gap-2 transition-colors'>
              <TbBrandGithub className='h-5 w-5' />
              <span>{t("links.viewSource")}</span>
            </Link>
            <span className='text-muted-foreground/30'>|</span>
            <Link
              href='/about/the-author'
              className='text-muted-foreground hover:text-primary flex items-center gap-2 transition-colors'>
              <TbUser className='h-5 w-5' />
              <span>{t("links.meetAuthor")}</span>
            </Link>
            <span className='text-muted-foreground/30'>|</span>
            <Link
              href='mailto:contact@arolariu.ro'
              className='text-muted-foreground hover:text-primary flex items-center gap-2 transition-colors'>
              <TbMail className='h-5 w-5' />
              <span>{t("links.getInTouch")}</span>
            </Link>
          </motion.div>

          {/* Trust Indicators */}
          <motion.div
            className='mt-16 grid gap-8 sm:grid-cols-3'
            initial={{opacity: 0, y: 30}}
            animate={isInView ? {opacity: 1, y: 0} : {}}
            transition={{duration: 0.6, delay: 0.5}}>
            {trustIds.map((trustId, index) => (
              <motion.div
                key={trustId}
                className='bg-muted/30 rounded-xl p-6 backdrop-blur-sm'
                initial={{opacity: 0, y: 20}}
                animate={isInView ? {opacity: 1, y: 0} : {}}
                transition={{duration: 0.5, delay: 0.6 + index * 0.1}}
                whileHover={{scale: 1.05, transition: {duration: 0.2}}}>
                <div className={`mb-3 h-1 w-12 rounded-full bg-gradient-to-r ${trustGradients[index]}`} />
                <h3 className='mb-2 font-semibold'>{t(`trust.${trustId}.title` as Parameters<typeof t>[0])}</h3>
                <p className='text-muted-foreground text-sm'>{t(`trust.${trustId}.description` as Parameters<typeof t>[0])}</p>
              </motion.div>
            ))}
          </motion.div>

          {/* Final Message */}
          <motion.div
            className='mt-16'
            initial={{opacity: 0}}
            animate={isInView ? {opacity: 1} : {}}
            transition={{duration: 0.6, delay: 0.8}}>
            <p className='text-muted-foreground text-sm'>
              {t("footer")}{" "}
              <Link
                href='/about/the-author'
                className='text-primary hover:underline'>
                Alexandru-Razvan Olariu
              </Link>
              {t("footerRole")}
            </p>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
