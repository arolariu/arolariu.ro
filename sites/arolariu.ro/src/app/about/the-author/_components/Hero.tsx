/** @format */

"use client";

import {TypewriterTextSmooth} from "@arolariu/components";
import {motion, useScroll, useTransform} from "motion/react";
import {useTranslations} from "next-intl";
import Image from "next/image";
import {useRef} from "react";

/**
 * @description A dynamic hero section component for the author's page.
 * This component displays the author's profile image, name, and subtitle with animation effects.
 * It creates a parallax scrolling effect where the content moves and fades as the user scrolls down.
 * The title is rendered with a typewriter effect and gradient text.
 * @returns A section containing the author's image, animated title, and subtitle
 */
export default function Hero(): React.JSX.Element {
  const t = useTranslations("About.Author");
  const ref = useRef(null);
  const {scrollYProgress} = useScroll({
    target: ref,
    offset: ["start start", "end start"],
  });

  const y = useTransform(scrollYProgress, [0, 1], ["0%", "50%"]);
  const opacity = useTransform(scrollYProgress, [0, 0.5], [1, 0]);

  const words = t("title")
    .split(" ")
    .map((word) => ({
      text: word,
      className: "text-xl text-center inline-block text-transparent bg-clip-text bg-linear-to-r from-blue-500 to-purple-500",
    }));

  return (
    <section
      ref={ref}
      className='relative flex h-screen flex-col items-center justify-center overflow-hidden'>
      <motion.div
        style={{y, opacity}}
        className='z-10 mx-auto max-w-4xl space-y-8 px-4 text-center'>
        <motion.div
          initial={{scale: 0.8, opacity: 0}}
          animate={{scale: 1, opacity: 1}}
          transition={{delay: 0.2, duration: 0.8}}
          className='glow-effect border-primary/20 relative mx-auto mb-6 h-32 w-32 overflow-hidden rounded-full border-4 md:h-40 md:w-40'>
          <Image
            src='/images/about/the-author/author.jpeg'
            alt='Alexandru Olariu'
            fill
            className='object-cover'
            quality={100}
            priority
          />
        </motion.div>

        <motion.div className='text-center'>
          <TypewriterTextSmooth
            words={words}
            className='text-center text-4xl font-bold md:text-6xl'
            cursorClassName='hidden'
          />
        </motion.div>

        <motion.div
          initial={{opacity: 0, y: 20}}
          animate={{opacity: 1, y: 0}}
          transition={{delay: 1.5, duration: 0.8}}
          className='blue-underline'>
          <span className='max-w-2xl text-lg md:text-xl'>{t("subtitle")}</span>
        </motion.div>
      </motion.div>
    </section>
  );
}
