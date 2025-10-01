"use client";

import {Button} from "@arolariu/components/button";
import {motion, useScroll, useTransform} from "motion/react";
import {useRef} from "react";
import {TbCode, TbDeviceLaptop, TbSparkles} from "react-icons/tb";

/**
 * The Hero component is a visually engaging section that introduces the platform.
 * It features a background animation, a title, a subtitle, and two buttons for exploring projects and technologies.
 * @returns The Hero component, CSR'ed.
 */
export default function Hero(): React.JSX.Element {
  const ref = useRef(null);
  const {scrollYProgress} = useScroll({
    target: ref,
    offset: ["start start", "end start"],
  });

  const y = useTransform(scrollYProgress, [0, 1], [0, 300]);
  const opacity = useTransform(scrollYProgress, [0, 0.5], [1, 0]);

  return (
    <section
      ref={ref}
      className='relative overflow-hidden py-20 md:py-32'>
      {/* Background Elements */}
      <div className='absolute inset-0 -z-10'>
        <div className='from-background to-background/50 absolute inset-0 bg-gradient-to-b' />
        <motion.div
          className='absolute top-0 left-0 h-full w-full'
          initial={{opacity: 0}}
          animate={{opacity: 0.1}}
          transition={{duration: 2}}>
          <motion.div
            className='bg-primary/20 absolute top-1/4 left-1/4 h-64 w-64 rounded-full blur-3xl'
            animate={{
              scale: [1, 1.2, 1],
              x: [0, 20, 0],
              y: [0, -20, 0],
            }}
            transition={{
              duration: 8,
              repeat: Number.POSITIVE_INFINITY,
              repeatType: "reverse",
            }}
          />
          <motion.div
            className='bg-secondary/20 absolute right-1/4 bottom-1/3 h-96 w-96 rounded-full blur-3xl'
            animate={{
              scale: [1, 1.3, 1],
              x: [0, -30, 0],
              y: [0, 30, 0],
            }}
            transition={{
              duration: 10,
              repeat: Number.POSITIVE_INFINITY,
              repeatType: "reverse",
            }}
          />
        </motion.div>
        <div className='absolute inset-0'>
          <div className='h-full w-full bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:24px_24px]' />
        </div>
      </div>

      <motion.div
        className='relative z-10 container mx-auto px-4'
        style={{y, opacity}}>
        <div className='space-y-8 text-center'>
          <motion.div
            initial={{opacity: 0, y: 20}}
            animate={{opacity: 1, y: 0}}
            transition={{duration: 0.5}}>
            <motion.span
              className='bg-primary/10 text-primary mb-4 inline-flex items-center gap-2 rounded-full px-4 py-1 text-sm'
              whileHover={{
                scale: 1.05,
                backgroundColor: "rgba(var(--primary), 0.2)",
              }}>
              <motion.span
                className='relative flex h-2 w-2'
                animate={{scale: [1, 1.2, 1]}}
                transition={{duration: 2, repeat: Number.POSITIVE_INFINITY}}>
                <span className='bg-primary absolute inline-flex h-full w-full animate-ping rounded-full opacity-75' />
                <span className='bg-primary relative inline-flex h-2 w-2 rounded-full' />
              </motion.span>
              <span>Playground for new technologies</span>
              <TbSparkles className='text-primary h-3 w-3' />
            </motion.span>
          </motion.div>

          <motion.h1
            className='text-5xl font-bold tracking-tight md:text-6xl lg:text-7xl'
            initial={{opacity: 0, y: 20}}
            animate={{opacity: 1, y: 0}}
            transition={{duration: 0.5, delay: 0.1}}>
            <motion.span
              className='block'
              animate={{
                color: ["hsl(var(--foreground))", "hsl(var(--primary))", "hsl(var(--foreground))"],
              }}
              transition={{duration: 5, repeat: Number.POSITIVE_INFINITY}}>
              Discover
            </motion.span>
            <motion.span
              className='text-primary block'
              initial={{backgroundPosition: "0% 0%"}}
              animate={{
                backgroundPosition: ["0% 0%", "100% 100%"],
              }}
              transition={{duration: 5, repeat: Number.POSITIVE_INFINITY, repeatType: "reverse"}}
              style={{
                backgroundImage: "linear-gradient(45deg, hsl(var(--primary)), hsl(var(--secondary)), hsl(var(--primary)))",
                backgroundSize: "200% 200%",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}>
              arolariu.ro
            </motion.span>
          </motion.h1>

          <motion.p
            className='text-muted-foreground mx-auto max-w-2xl text-xl'
            initial={{opacity: 0, y: 20}}
            animate={{opacity: 1, y: 0}}
            transition={{duration: 0.5, delay: 0.2}}>
            A platform built as a playground for new technologies and learning, developed by Alexandru-Razvan Olariu, a software engineer at
            Microsoft.
          </motion.p>

          <motion.div
            className='flex flex-wrap justify-center gap-4 pt-4'
            initial={{opacity: 0, y: 20}}
            animate={{opacity: 1, y: 0}}
            transition={{duration: 0.5, delay: 0.3}}>
            <motion.div
              whileHover={{scale: 1.05}}
              whileTap={{scale: 0.95}}>
              <Button
                size='lg'
                className='group relative cursor-pointer gap-2 overflow-hidden'>
                <TbCode className='h-4 w-4' />
                <span>Explore Projects</span>
                <motion.span
                  className='bg-primary/10 absolute inset-0'
                  initial={{x: "-100%"}}
                  whileHover={{x: "100%"}}
                  transition={{duration: 0.5}}
                />
              </Button>
            </motion.div>
            <motion.div
              whileHover={{scale: 1.05}}
              whileTap={{scale: 0.95}}>
              <Button
                size='lg'
                variant='outline'
                className='group relative gap-2 overflow-hidden'>
                <TbDeviceLaptop className='h-4 w-4' />
                <span>View Technologies</span>
                <motion.span
                  className='bg-primary/5 absolute inset-0'
                  initial={{x: "-100%"}}
                  whileHover={{x: "100%"}}
                  transition={{duration: 0.5}}
                />
              </Button>
            </motion.div>
          </motion.div>
        </div>
      </motion.div>
    </section>
  );
}
