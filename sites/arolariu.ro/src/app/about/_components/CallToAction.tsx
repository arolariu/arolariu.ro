"use client";

import {Button} from "@arolariu/components";
import {motion, useInView} from "motion/react";
import {useTranslations} from "next-intl";
import Link from "next/link";
import {useRef} from "react";
import {TbBrandGithub, TbMail} from "react-icons/tb";

/**
 * Call-to-action section at the bottom of the About hub page.
 */
export default function CallToAction(): React.JSX.Element {
  const t = useTranslations("About.Hub.cta");
  const ref = useRef<HTMLElement>(null);
  const isInView = useInView(ref, {once: true, margin: "-100px"});

  return (
    <section
      ref={ref}
      className='relative w-full overflow-hidden px-4 py-24'>
      {/* Animated background */}
      <div className='pointer-events-none absolute inset-0'>
        <motion.div
          className='absolute top-1/4 left-1/4 h-72 w-72 rounded-full bg-gradient-to-br from-blue-500/20 to-cyan-500/20 blur-3xl'
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.3, 0.5, 0.3],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
        <motion.div
          className='absolute right-1/4 bottom-1/4 h-72 w-72 rounded-full bg-gradient-to-br from-purple-500/20 to-pink-500/20 blur-3xl'
          animate={{
            scale: [1.2, 1, 1.2],
            opacity: [0.3, 0.5, 0.3],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      </div>

      {/* Grid pattern */}
      <div
        className='pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(100,100,100,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(100,100,100,0.03)_1px,transparent_1px)] bg-[size:50px_50px]'
        aria-hidden='true'
      />

      {/* Content */}
      <div className='relative mx-auto max-w-4xl text-center'>
        <motion.div
          initial={{opacity: 0, y: 20}}
          animate={isInView ? {opacity: 1, y: 0} : {}}
          transition={{duration: 0.6}}>
          <h2 className='mb-4 text-4xl font-bold sm:text-5xl'>
            <span className='from-gradient-from via-gradient-via to-gradient-to bg-gradient-to-r bg-clip-text text-transparent'>
              {t("title")}
            </span>
          </h2>
          <p className='text-muted-foreground mx-auto mb-10 max-w-2xl text-lg leading-relaxed'>{t("subtitle")}</p>
        </motion.div>

        {/* CTA buttons */}
        <motion.div
          className='flex flex-col items-center justify-center gap-4 sm:flex-row'
          initial={{opacity: 0, y: 20}}
          animate={isInView ? {opacity: 1, y: 0} : {}}
          transition={{delay: 0.2, duration: 0.5}}>
          <Button
            asChild
            size='lg'
            className='group min-w-[180px]'>
            <a
              href='https://github.com/arolariu/arolariu.ro'
              target='_blank'
              rel='noopener noreferrer'>
              <TbBrandGithub className='mr-2 h-5 w-5 transition-transform group-hover:scale-110' />
              {t("primary")}
            </a>
          </Button>
          <Button
            asChild
            variant='outline'
            size='lg'
            className='min-w-[180px]'>
            <Link href='/about/the-author#contact'>
              <TbMail className='mr-2 h-5 w-5' />
              {t("secondary")}
            </Link>
          </Button>
        </motion.div>

        {/* Footer text */}
        <motion.p
          className='text-muted-foreground mt-12 text-sm'
          initial={{opacity: 0}}
          animate={isInView ? {opacity: 1} : {}}
          transition={{delay: 0.4, duration: 0.5}}>
          {t("footer")}
        </motion.p>
      </div>
    </section>
  );
}
