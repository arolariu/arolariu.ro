"use client";

import {motion, useInView} from "motion/react";
import {useTranslations} from "next-intl";
import {useRef} from "react";
import {TbBrandAzure, TbBrandGithub, TbBrandNextjs, TbBrandTypescript, TbChartDots, TbServer} from "react-icons/tb";

const bentoItems = [
  {
    key: "nextjs",
    icon: TbBrandNextjs,
    gradient: "from-black to-gray-800",
    iconColor: "text-white",
    span: "col-span-2 row-span-1",
  },
  {
    key: "dotnet",
    icon: TbServer,
    gradient: "from-purple-600 to-purple-800",
    iconColor: "text-white",
    span: "col-span-1 row-span-1",
  },
  {
    key: "azure",
    icon: TbBrandAzure,
    gradient: "from-blue-500 to-blue-700",
    iconColor: "text-white",
    span: "col-span-1 row-span-2",
  },
  {
    key: "otel",
    icon: TbChartDots,
    gradient: "from-amber-500 to-orange-600",
    iconColor: "text-white",
    span: "col-span-1 row-span-1",
  },
  {
    key: "typescript",
    icon: TbBrandTypescript,
    gradient: "from-blue-600 to-blue-800",
    iconColor: "text-white",
    span: "col-span-1 row-span-1",
  },
  {
    key: "opensource",
    icon: TbBrandGithub,
    gradient: "from-gray-700 to-gray-900",
    iconColor: "text-white",
    span: "col-span-1 row-span-1",
  },
] as const;

/**
 * Bento grid layout showcasing key technologies visually.
 */
export default function BentoGrid(): React.JSX.Element {
  const t = useTranslations("Home.bento");
  const ref = useRef<HTMLElement>(null);
  const isInView = useInView(ref, {once: true, margin: "-100px"});

  return (
    <section
      ref={ref}
      className='relative w-full px-4 py-20'>
      <div className='mx-auto max-w-5xl'>
        {/* Bento grid */}
        <div className='grid auto-rows-[140px] grid-cols-2 gap-4 md:grid-cols-3'>
          {bentoItems.map((item, index) => (
            <motion.div
              key={item.key}
              className={`group relative overflow-hidden rounded-2xl bg-gradient-to-br ${item.gradient} ${item.span} cursor-pointer`}
              initial={{opacity: 0, y: 30, scale: 0.95}}
              animate={isInView ? {opacity: 1, y: 0, scale: 1} : {}}
              transition={{delay: 0.1 + index * 0.08, duration: 0.5, ease: "easeOut"}}
              whileHover={{scale: 1.02}}
              whileTap={{scale: 0.98}}>
              {/* Shimmer effect on hover */}
              <div className='absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/10 to-transparent transition-transform duration-700 group-hover:translate-x-full' />

              {/* Content */}
              <div className='relative flex h-full flex-col justify-between p-5'>
                {/* Icon */}
                <motion.div
                  initial={{scale: 1}}
                  whileHover={{scale: 1.1, rotate: 5}}
                  transition={{duration: 0.3}}>
                  <item.icon className={`h-10 w-10 ${item.iconColor}`} />
                </motion.div>

                {/* Text */}
                <div>
                  <h3 className={`text-lg font-bold ${item.iconColor}`}>{t(`${item.key}.title`)}</h3>
                  <p className={`text-sm ${item.iconColor} opacity-70`}>{t(`${item.key}.desc`)}</p>
                </div>
              </div>

              {/* Decorative gradient overlay on hover */}
              <div className='pointer-events-none absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100' />
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
