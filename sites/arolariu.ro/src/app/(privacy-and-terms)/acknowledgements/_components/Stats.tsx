"use client";

import {Card, CardContent} from "@arolariu/components/card";
import {motion, useInView} from "motion/react";
import {useTranslations} from "next-intl";
import {useRef} from "react";
import {TbBox, TbCode, TbLicense, TbTools} from "react-icons/tb";

const stats = [
  {key: "total", icon: TbBox, gradient: "from-cyan-500 to-blue-500"},
  {key: "production", icon: TbCode, gradient: "from-green-500 to-emerald-500"},
  {key: "development", icon: TbTools, gradient: "from-amber-500 to-orange-500"},
  {key: "mitLicense", icon: TbLicense, gradient: "from-purple-500 to-pink-500"},
] as const;

/**
 * Statistics dashboard showing package breakdown.
 */
export default function Stats(): React.JSX.Element {
  const t = useTranslations("Acknowledgements.stats");
  const ref = useRef<HTMLElement>(null);
  const isInView = useInView(ref, {once: true, margin: "-100px"});

  return (
    <section
      ref={ref}
      className='relative w-full px-4 py-16'>
      <div className='mx-auto max-w-6xl'>
        {/* Section header */}
        <motion.div
          className='mb-12 text-center'
          initial={{opacity: 0, y: 20}}
          animate={isInView ? {opacity: 1, y: 0} : {}}
          transition={{duration: 0.6}}>
          <h2 className='mb-4 text-3xl font-bold'>
            <span className='bg-gradient-to-r from-cyan-500 to-purple-500 bg-clip-text text-transparent'>{t("title")}</span>
          </h2>
          <p className='text-muted-foreground mx-auto max-w-2xl'>{t("subtitle")}</p>
        </motion.div>

        {/* Stats grid */}
        <div className='grid gap-6 sm:grid-cols-2 lg:grid-cols-4'>
          {stats.map((stat, index) => (
            <motion.div
              key={stat.key}
              initial={{opacity: 0, y: 30}}
              animate={isInView ? {opacity: 1, y: 0} : {}}
              transition={{delay: 0.2 + index * 0.1, duration: 0.5}}>
              <Card className='group hover:border-primary/30 h-full transition-all duration-300 hover:-translate-y-1 hover:shadow-lg'>
                <CardContent className='flex flex-col items-center p-6 text-center'>
                  {/* Icon */}
                  <div className={`mb-4 rounded-full bg-gradient-to-br ${stat.gradient} p-3`}>
                    <stat.icon className='h-6 w-6 text-white' />
                  </div>

                  {/* Value */}
                  <motion.span
                    className='mb-1 text-4xl font-bold'
                    initial={{opacity: 0, scale: 0.5}}
                    animate={isInView ? {opacity: 1, scale: 1} : {}}
                    transition={{delay: 0.4 + index * 0.1, duration: 0.5, type: "spring"}}>
                    {t(`${stat.key}.value`)}
                  </motion.span>

                  {/* Label */}
                  <span className='mb-1 font-semibold'>{t(`${stat.key}.label`)}</span>

                  {/* Description */}
                  <span className='text-muted-foreground text-sm'>{t(`${stat.key}.description`)}</span>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
