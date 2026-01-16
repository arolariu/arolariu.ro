"use client";

import {motion, useInView, type Variants} from "motion/react";
import {useTranslations} from "next-intl";
import {useRef} from "react";
import {TbAntenna, TbBook, TbBulb, TbCode, TbDeviceGamepad} from "react-icons/tb";

const containerVariants: Variants = {
  hidden: {opacity: 0},
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.2,
    },
  },
};

const itemVariants: Variants = {
  hidden: {opacity: 0, y: 20},
  visible: {opacity: 1, y: 0, transition: {duration: 0.8}},
};

/**
 * @description Renders a section with the author's biography, displaying animated content
 * with colorful background elements. The component uses Framer Motion for
 * animations and the built-in motion/react useInView hook to trigger animations
 * when the component enters the viewport.
 * The biography content is organized in sections, each with an icon and text
 * loaded from internationalization strings. The component creates a visually
 * engaging presentation with gradients, blur effects, and staggered animations.
 * @returns A section containing the animated biography content
 */
export default function Biography(): React.JSX.Element {
  const t = useTranslations("About.Author.Biography");
  const sectionRef = useRef<HTMLDivElement | null>(null);
  const inView = useInView(sectionRef, {amount: 0.1, once: false});

  const bioSections = [
    {
      icon: <TbCode className='h-8 w-8 text-accent-primary' />,
      content: t("FirstPoint", {age: (new Date().getFullYear() - 2000).toString()}),
    },
    {
      icon: <TbDeviceGamepad className='h-8 w-8 text-green-500' />,
      content: t("SecondPoint"),
    },
    {
      icon: <TbBulb className='h-8 w-8 text-purple-500' />,
      content: t("ThirdPoint"),
    },
    {
      icon: <TbBook className='h-8 w-8 text-amber-500' />,
      content: t("FourthPoint"),
    },
    {
      icon: <TbAntenna className='h-8 w-8 text-pink-500' />,
      content: t("FifthPoint"),
    },
  ];

  return (
    <section className='relative mx-auto max-w-6xl px-4 py-20 md:px-8'>
      <div className='absolute inset-0'>
        <motion.div
          className='absolute -top-20 -right-20 h-64 w-64 rounded-full bg-blue-500/100 blur-3xl'
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.3, 0.5, 0.3],
          }}
          transition={{duration: 8, repeat: Number.POSITIVE_INFINITY}}
        />
        <motion.div
          className='absolute -bottom-20 -left-20 h-64 w-64 rounded-full bg-purple-500/100 blur-3xl'
          animate={{
            scale: [1.2, 1, 1.2],
            opacity: [0.3, 0.5, 0.3],
          }}
          transition={{duration: 8, repeat: Number.POSITIVE_INFINITY, delay: 2}}
        />
      </div>

      <motion.div
        ref={sectionRef}
        variants={containerVariants}
        initial='hidden'
        animate={inView ? "visible" : "hidden"}
        className='relative z-10 space-y-12'>
        <motion.div
          variants={itemVariants}
          className='text-center'>
          <h2 className='blue-underline relative mb-4 inline-block text-3xl font-bold md:text-4xl'>{t("title")}</h2>
        </motion.div>

        <motion.div
          variants={itemVariants}
          className='prose dark:prose-invert max-w-none'>
          <div className='border-border/50 bg-card/50 relative overflow-hidden rounded-xl border p-6 shadow-lg backdrop-blur-xs md:p-8'>
            <div className='absolute top-0 left-0 h-1 w-full bg-linear-to-r from-blue-500 via-purple-500 to-pink-500' />
            {bioSections.map((section) => (
              <motion.div
                key={section.content.slice(0, 20)}
                className='flex flex-row items-start justify-start gap-4 rounded-lg p-4 text-black transition-all duration-300 dark:text-white'>
                <span className='h-8 w-8 rounded-lg pr-2'>{section.icon}</span>
                <span className='text-lg leading-relaxed'>{section.content}</span>
              </motion.div>
            ))}

            <motion.div
              className='absolute bottom-0 left-0 h-1 bg-linear-to-r from-blue-500 via-purple-500 to-pink-500'
              initial={{width: "0%"}}
              whileInView={{width: "100%"}}
              transition={{duration: 1.5, ease: "easeOut"}}
              viewport={{once: false}}
            />
          </div>
        </motion.div>
      </motion.div>
    </section>
  );
}
