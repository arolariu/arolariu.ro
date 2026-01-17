"use client";

import {Card, CardContent} from "@arolariu/components/card";
import {motion, useInView} from "motion/react";
import {useTranslations} from "next-intl";
import {useRef} from "react";
import {TbCalendar, TbCode, TbShieldCheck, TbStack2} from "react-icons/tb";

const stats = [
  {key: "yearsActive", icon: TbCalendar, color: "from-blue-500 to-cyan-500"},
  {key: "linesOfCode", icon: TbCode, color: "from-purple-500 to-pink-500"},
  {key: "technologies", icon: TbStack2, color: "from-amber-500 to-orange-500"},
  {key: "testCoverage", icon: TbShieldCheck, color: "from-green-500 to-emerald-500"},
] as const;

/**
 * Stats section displaying key metrics about the platform.
 */
export default function Stats(): React.JSX.Element {
  const t = useTranslations("About.Hub.stats");
  const ref = useRef<HTMLElement>(null);
  const isInView = useInView(ref, {once: true, margin: "-100px"});

  return (
    <section
      ref={ref}
      className='relative w-full px-4 py-20'>
      <div className='mx-auto max-w-6xl'>
        {/* Section header */}
        <motion.div
          className='mb-12 text-center'
          initial={{opacity: 0, y: 20}}
          animate={isInView ? {opacity: 1, y: 0} : {}}
          transition={{duration: 0.6}}>
          <h2 className='blue-underline mb-4 inline-block text-3xl font-bold sm:text-4xl'>{t("title")}</h2>
          <p className='text-muted-foreground mx-auto max-w-2xl text-lg'>{t("subtitle")}</p>
        </motion.div>

        {/* Stats grid */}
        <div className='grid gap-6 sm:grid-cols-2 lg:grid-cols-4'>
          {stats.map((stat, index) => (
            <motion.div
              key={stat.key}
              initial={{opacity: 0, scale: 0.9}}
              animate={isInView ? {opacity: 1, scale: 1} : {}}
              transition={{delay: 0.2 + index * 0.1, duration: 0.5}}>
              <Card className='group hover:border-primary/30 h-full overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-lg'>
                <CardContent className='relative p-6 text-center'>
                  {/* Background gradient */}
                  <div
                    className={`absolute inset-0 bg-gradient-to-br ${stat.color} opacity-0 transition-opacity duration-300 group-hover:opacity-5`}
                  />

                  {/* Icon */}
                  <div className='relative mx-auto mb-4 flex justify-center'>
                    <div className={`rounded-xl bg-gradient-to-br ${stat.color} p-3`}>
                      <stat.icon className='h-6 w-6 text-white' />
                    </div>
                  </div>

                  {/* Value */}
                  <motion.div
                    className={`mb-2 bg-gradient-to-r ${stat.color} bg-clip-text text-4xl font-bold text-transparent`}
                    initial={{opacity: 0}}
                    animate={isInView ? {opacity: 1} : {}}
                    transition={{delay: 0.4 + index * 0.1}}>
                    {t(`items.${stat.key}.value`)}
                  </motion.div>

                  {/* Label */}
                  <h3 className='mb-1 text-lg font-semibold'>{t(`items.${stat.key}.label`)}</h3>

                  {/* Description */}
                  <p className='text-muted-foreground text-sm'>{t(`items.${stat.key}.description`)}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
