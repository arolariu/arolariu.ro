"use client";

import {Badge} from "@arolariu/components/badge";
import {motion, useInView} from "motion/react";
import {useTranslations} from "next-intl";
import {useRef} from "react";
import {TbHeart, TbPackage} from "react-icons/tb";

type Props = {
  lastUpdatedDate: string;
};

/**
 * Hero section for the Acknowledgements page with animated background.
 */
export default function Hero({lastUpdatedDate}: Readonly<Props>): React.JSX.Element {
  const t = useTranslations("Acknowledgements.hero");
  const ref = useRef<HTMLElement>(null);
  const isInView = useInView(ref, {once: true});

  return (
    <section
      ref={ref}
      className='relative flex min-h-[50vh] w-full flex-col items-center justify-center overflow-hidden px-4 py-20'>
      {/* Animated background */}
      <div className='pointer-events-none absolute inset-0 overflow-hidden'>
        <motion.div
          className='absolute -top-40 -left-40 h-80 w-80 rounded-full bg-gradient-to-br from-cyan-500/20 to-blue-500/20 blur-3xl'
          animate={{
            scale: [1, 1.2, 1],
            rotate: [0, 90, 0],
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
        <motion.div
          className='absolute -right-40 -bottom-40 h-80 w-80 rounded-full bg-gradient-to-br from-purple-500/20 to-pink-500/20 blur-3xl'
          animate={{
            scale: [1.2, 1, 1.2],
            rotate: [0, -90, 0],
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      </div>

      {/* Content */}
      <motion.div
        className='relative z-10 flex flex-col items-center text-center'
        initial={{opacity: 0, y: 30}}
        animate={isInView ? {opacity: 1, y: 0} : {}}
        transition={{duration: 0.8}}>
        {/* Badge */}
        <motion.div
          initial={{opacity: 0, scale: 0.9}}
          animate={isInView ? {opacity: 1, scale: 1} : {}}
          transition={{delay: 0.2, duration: 0.5}}>
          <Badge
            variant='secondary'
            className='mb-6 px-4 py-2 text-sm'>
            <TbHeart className='mr-2 h-4 w-4 text-red-500' />
            {t("badge")}
          </Badge>
        </motion.div>

        {/* Title */}
        <motion.h1
          className='mb-6 text-4xl font-bold sm:text-5xl lg:text-6xl'
          initial={{opacity: 0, y: 20}}
          animate={isInView ? {opacity: 1, y: 0} : {}}
          transition={{delay: 0.3, duration: 0.6}}>
          <span className='bg-gradient-to-r from-cyan-500 via-purple-500 to-pink-500 bg-clip-text text-transparent'>{t("title")}</span>
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          className='text-muted-foreground mb-8 max-w-2xl text-lg leading-relaxed'
          initial={{opacity: 0, y: 20}}
          animate={isInView ? {opacity: 1, y: 0} : {}}
          transition={{delay: 0.4, duration: 0.6}}>
          {t("subtitle")}
        </motion.p>

        {/* Last updated */}
        <motion.div
          className='text-muted-foreground flex items-center gap-2 text-sm'
          initial={{opacity: 0}}
          animate={isInView ? {opacity: 1} : {}}
          transition={{delay: 0.6, duration: 0.5}}>
          <TbPackage className='h-4 w-4' />
          <span>{t("lastUpdate", {date: lastUpdatedDate})}</span>
        </motion.div>
      </motion.div>
    </section>
  );
}
