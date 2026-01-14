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
  {name: "GitHub Actions", icon: TbBrandGithub},
  {name: "SQL Server", icon: TbDatabase},
  {name: "Playwright", icon: TbTestPipe},
  {name: "C#", icon: TbCode},
];

/**
 * TechShowcase section with scrolling technology logos.
 */
export default function TechShowcase(): React.JSX.Element {
  const t = useTranslations("Home.techShowcase");
  const ref = useRef<HTMLElement>(null);
  const isInView = useInView(ref, {once: true, margin: "-100px"});

  return (
    <section
      ref={ref}
      className='relative w-full overflow-hidden px-4 py-16'>
      <div className='mx-auto max-w-6xl'>
        {/* Section header */}
        <motion.div
          className='mb-12 text-center'
          initial={{opacity: 0, y: 20}}
          animate={isInView ? {opacity: 1, y: 0} : {}}
          transition={{duration: 0.6}}>
          <h2 className='text-muted-foreground text-lg font-medium uppercase tracking-wider'>{t("title")}</h2>
        </motion.div>

        {/* Scrolling logos - Row 1 */}
        <div className='relative mb-8'>
          <div className='from-background pointer-events-none absolute top-0 left-0 z-10 h-full w-20 bg-gradient-to-r to-transparent' />
          <div className='from-background pointer-events-none absolute top-0 right-0 z-10 h-full w-20 bg-gradient-to-l to-transparent' />

          <motion.div
            className='flex gap-12'
            animate={{x: [0, -1200]}}
            transition={{
              duration: 30,
              repeat: Infinity,
              ease: "linear",
            }}>
            {/* Double the logos for seamless loop */}
            {[...technologies, ...technologies].map((tech, index) => (
              <div
                key={`row1-${index}`}
                className='group flex shrink-0 flex-col items-center gap-2'>
                <div className='hover:border-primary/30 bg-card/50 rounded-xl border p-4 transition-all duration-300 hover:scale-110'>
                  <tech.icon className='text-muted-foreground h-8 w-8 transition-colors group-hover:text-blue-500' />
                </div>
                <span className='text-muted-foreground text-xs opacity-0 transition-opacity group-hover:opacity-100'>{tech.name}</span>
              </div>
            ))}
          </motion.div>
        </div>

        {/* Scrolling logos - Row 2 (reverse direction) */}
        <div className='relative'>
          <div className='from-background pointer-events-none absolute top-0 left-0 z-10 h-full w-20 bg-gradient-to-r to-transparent' />
          <div className='from-background pointer-events-none absolute top-0 right-0 z-10 h-full w-20 bg-gradient-to-l to-transparent' />

          <motion.div
            className='flex gap-12'
            animate={{x: [-1200, 0]}}
            transition={{
              duration: 35,
              repeat: Infinity,
              ease: "linear",
            }}>
            {/* Double and reverse the logos */}
            {[...technologies.slice().reverse(), ...technologies.slice().reverse()].map((tech, index) => (
              <div
                key={`row2-${index}`}
                className='group flex shrink-0 flex-col items-center gap-2'>
                <div className='hover:border-primary/30 bg-card/50 rounded-xl border p-4 transition-all duration-300 hover:scale-110'>
                  <tech.icon className='text-muted-foreground h-8 w-8 transition-colors group-hover:text-purple-500' />
                </div>
                <span className='text-muted-foreground text-xs opacity-0 transition-opacity group-hover:opacity-100'>{tech.name}</span>
              </div>
            ))}
          </motion.div>
        </div>
      </div>
    </section>
  );
}
