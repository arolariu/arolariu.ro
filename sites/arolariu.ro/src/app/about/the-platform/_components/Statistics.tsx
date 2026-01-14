"use client";

import {Badge} from "@arolariu/components/badge";
import {Card, CardContent} from "@arolariu/components/card";
import {CountingNumber} from "@arolariu/components/counting-number";
import {motion, useInView} from "motion/react";
import {useTranslations} from "next-intl";
import {useRef, useState} from "react";
import {TbBrandGithub, TbCode, TbDatabase, TbGlobe, TbServer, TbStar, TbUsers, TbWorld} from "react-icons/tb";

interface StatConfig {
  id: string;
  icon: React.ComponentType<{className?: string}>;
  gradient: string;
}

const statConfigs: StatConfig[] = [
  {id: "projects", icon: TbCode, gradient: "from-blue-500 to-cyan-500"},
  {id: "commits", icon: TbBrandGithub, gradient: "from-purple-500 to-violet-500"},
  {id: "linesOfCode", icon: TbDatabase, gradient: "from-green-500 to-emerald-500"},
  {id: "apis", icon: TbServer, gradient: "from-orange-500 to-amber-500"},
  {id: "users", icon: TbUsers, gradient: "from-pink-500 to-rose-500"},
  {id: "countries", icon: TbWorld, gradient: "from-indigo-500 to-blue-500"},
  {id: "stars", icon: TbStar, gradient: "from-yellow-500 to-amber-500"},
  {id: "contributors", icon: TbGlobe, gradient: "from-teal-500 to-cyan-500"},
];

/**
 * Statistics component displaying platform metrics with animated counters.
 * Features CountingNumber for animated number display.
 * @returns The Statistics component, CSR'ed.
 */
export default function Statistics(): React.JSX.Element {
  const t = useTranslations("About.Platform.statistics");
  const ref = useRef<HTMLElement>(null);
  const isInView = useInView(ref, {once: true, margin: "-100px"});
  const [hoveredStat, setHoveredStat] = useState<string | null>(null);

  return (
    <section
      ref={ref}
      className='relative py-24'>
      {/* Background */}
      <div className='absolute inset-0 -z-10'>
        <div className='from-background via-muted/20 to-background absolute inset-0 bg-gradient-to-b' />
        <div className='absolute inset-0 bg-[linear-gradient(to_right,#80808008_1px,transparent_1px),linear-gradient(to_bottom,#80808008_1px,transparent_1px)] bg-[size:32px_32px]' />
      </div>

      <div className='container mx-auto px-4'>
        {/* Section Header */}
        <motion.div
          className='mx-auto mb-16 max-w-3xl text-center'
          initial={{opacity: 0, y: 30}}
          animate={isInView ? {opacity: 1, y: 0} : {}}
          transition={{duration: 0.6}}>
          <motion.div
            initial={{opacity: 0, scale: 0.9}}
            animate={isInView ? {opacity: 1, scale: 1} : {}}
            transition={{duration: 0.5}}>
            <Badge
              variant='outline'
              className='mb-4 px-4 py-1 text-sm'>
              {t("badge")}
            </Badge>
          </motion.div>
          <h2 className='mb-6 text-4xl font-bold tracking-tight md:text-5xl'>
            {t("title")}{" "}
            <span className='bg-gradient-to-r from-green-500 via-blue-500 to-purple-500 bg-clip-text text-transparent'>{t("titleHighlight")}</span>
          </h2>
          <p className='text-muted-foreground text-lg md:text-xl'>{t("description")}</p>
        </motion.div>

        {/* Statistics Grid */}
        <div className='mx-auto grid max-w-6xl gap-6 sm:grid-cols-2 lg:grid-cols-4'>
          {statConfigs.map((stat, index) => (
            <motion.div
              key={stat.id}
              initial={{opacity: 0, y: 30}}
              animate={isInView ? {opacity: 1, y: 0} : {}}
              transition={{duration: 0.5, delay: index * 0.1}}
              // eslint-disable-next-line react/jsx-no-bind -- simple page
              onHoverStart={() => setHoveredStat(stat.id)}
              // eslint-disable-next-line react/jsx-no-bind -- simple page
              onHoverEnd={() => setHoveredStat(null)}>
              <Card
                className={`group relative h-full overflow-hidden transition-all duration-300 ${
                  hoveredStat === stat.id ? "border-primary shadow-lg shadow-primary/10" : "hover:border-primary/30"
                }`}>
                {/* Gradient overlay */}
                <motion.div
                  className={`absolute inset-0 bg-gradient-to-br ${stat.gradient} opacity-0 transition-opacity duration-300`}
                  style={{opacity: hoveredStat === stat.id ? 0.1 : 0}}
                />

                <CardContent className='relative flex flex-col items-center p-6 text-center'>
                  {/* Icon */}
                  <motion.div
                    className={`mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br ${stat.gradient}`}
                    animate={{
                      scale: hoveredStat === stat.id ? 1.1 : 1,
                      rotate: hoveredStat === stat.id ? 5 : 0,
                    }}
                    transition={{duration: 0.3}}>
                    <stat.icon className='h-7 w-7 text-white' />
                  </motion.div>

                  {/* Animated Number */}
                  <div className='text-primary mb-2 text-4xl font-bold'>
                    <CountingNumber
                      number={Number(t(`items.${stat.id}.value` as Parameters<typeof t>[0]))}
                      inView
                    />
                    {t(`items.${stat.id}.suffix` as Parameters<typeof t>[0])}
                  </div>

                  {/* Label */}
                  <h3 className='mb-1 text-lg font-semibold'>{t(`items.${stat.id}.label` as Parameters<typeof t>[0])}</h3>
                  <p className='text-muted-foreground text-sm'>{t(`items.${stat.id}.description` as Parameters<typeof t>[0])}</p>
                </CardContent>

                {/* Animated border */}
                <motion.div
                  className={`absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r ${stat.gradient}`}
                  initial={{scaleX: 0}}
                  animate={{scaleX: hoveredStat === stat.id ? 1 : 0}}
                  transition={{duration: 0.3}}
                  style={{transformOrigin: "left"}}
                />
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
