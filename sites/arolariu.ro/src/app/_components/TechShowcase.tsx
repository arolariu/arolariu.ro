"use client";

import {motion, useInView} from "motion/react";
import {useTranslations} from "next-intl";
import {useRef} from "react";
import {
  TbBrandAzure,
  TbBrandDocker,
  TbBrandGithub,
  TbBrandNextjs,
  TbBrandReact,
  TbBrandSvelte,
  TbBrandTailwind,
  TbBrandTypescript,
  TbCode,
  TbDatabase,
  TbServer,
  TbTestPipe,
} from "react-icons/tb";

const technologies = [
  {name: "Next.js", icon: TbBrandNextjs},
  {name: "React", icon: TbBrandReact},
  {name: ".NET", icon: TbServer},
  {name: "TypeScript", icon: TbBrandTypescript},
  {name: "Azure", icon: TbBrandAzure},
  {name: "Docker", icon: TbBrandDocker},
  {name: "Tailwind", icon: TbBrandTailwind},
  {name: "Svelte", icon: TbBrandSvelte},
  {name: "GitHub", icon: TbBrandGithub},
  {name: "SQL Server", icon: TbDatabase},
  {name: "Playwright", icon: TbTestPipe},
  {name: "C#", icon: TbCode},
];

/**
 * Clean single-row infinite scrolling tech logo marquee.
 */
export default function TechShowcase(): React.JSX.Element {
  const t = useTranslations("Home.techShowcase");
  const ref = useRef<HTMLElement>(null);
  const isInView = useInView(ref, {once: true, margin: "-50px"});

  return (
    <section
      ref={ref}
      className='relative w-full overflow-hidden py-12'>
      {/* Section title */}
      <motion.p
        className='text-muted-foreground mb-8 text-center text-sm font-medium uppercase tracking-widest'
        initial={{opacity: 0}}
        animate={isInView ? {opacity: 1} : {}}
        transition={{duration: 0.5}}>
        {t("title")}
      </motion.p>

      {/* Marquee container */}
      <div className='relative'>
        {/* Fade edges */}
        <div className='from-background pointer-events-none absolute top-0 left-0 z-10 h-full w-24 bg-gradient-to-r to-transparent' />
        <div className='from-background pointer-events-none absolute top-0 right-0 z-10 h-full w-24 bg-gradient-to-l to-transparent' />

        {/* Scrolling logos */}
        <motion.div
          className='flex gap-16'
          initial={{opacity: 0}}
          animate={
            isInView
              ? {
                  opacity: 1,
                  x: [0, -1200],
                }
              : {}
          }
          transition={{
            opacity: {duration: 0.5},
            x: {
              duration: 25,
              repeat: Infinity,
              ease: "linear",
            },
          }}>
          {/* Triple the logos for seamless loop */}
          {[...technologies, ...technologies, ...technologies].map((tech, index) => (
            <div
              key={`tech-${index}`}
              className='flex shrink-0 items-center gap-3'>
              <tech.icon className='text-muted-foreground h-8 w-8' />
              <span className='text-muted-foreground whitespace-nowrap text-sm font-medium'>{tech.name}</span>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
