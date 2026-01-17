"use client";

import {Card, CardContent} from "@arolariu/components/card";
import {motion, useInView} from "motion/react";
import {useTranslations} from "next-intl";
import {useRef} from "react";
import {TbBulb, TbHeart, TbTargetArrow} from "react-icons/tb";

const pillars = [
  {key: "innovation", icon: TbBulb, color: "from-blue-500 to-cyan-500"},
  {key: "quality", icon: TbTargetArrow, color: "from-green-500 to-emerald-500"},
  {key: "openness", icon: TbHeart, color: "from-pink-500 to-rose-500"},
] as const;

/**
 * Mission section displaying the platform's purpose and core pillars.
 */
export default function Mission(): React.JSX.Element {
  const t = useTranslations("About.Hub.mission");
  const ref = useRef<HTMLElement>(null);
  const isInView = useInView(ref, {once: true, margin: "-100px"});

  return (
    <section
      ref={ref}
      className='relative w-full px-4 py-20'>
      <div className='mx-auto max-w-6xl'>
        {/* Section header */}
        <motion.div
          className='mb-16 text-center'
          initial={{opacity: 0, y: 20}}
          animate={isInView ? {opacity: 1, y: 0} : {}}
          transition={{duration: 0.6}}>
          <h2 className='blue-underline mb-6 inline-block text-3xl font-bold sm:text-4xl'>{t("title")}</h2>
          <motion.p
            className='mx-auto mb-4 max-w-xl bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-2xl font-semibold text-transparent sm:text-3xl'
            initial={{opacity: 0, scale: 0.95}}
            animate={isInView ? {opacity: 1, scale: 1} : {}}
            transition={{delay: 0.2, duration: 0.5}}>
            {t("statement")}
          </motion.p>
          <p className='text-muted-foreground mx-auto max-w-3xl text-lg leading-relaxed'>{t("description")}</p>
        </motion.div>

        {/* Pillars grid */}
        <div className='grid gap-6 md:grid-cols-3'>
          {pillars.map((pillar, index) => (
            <motion.div
              key={pillar.key}
              initial={{opacity: 0, y: 30}}
              animate={isInView ? {opacity: 1, y: 0} : {}}
              transition={{delay: 0.3 + index * 0.1, duration: 0.5}}>
              <Card className='group bg-card/50 hover:border-primary/30 relative h-full overflow-hidden border backdrop-blur-sm transition-all duration-300 hover:shadow-lg'>
                <div
                  className={`absolute inset-0 bg-gradient-to-br ${pillar.color} opacity-0 transition-opacity duration-300 group-hover:opacity-5`}
                />
                <CardContent className='p-6'>
                  <div className={`mb-4 inline-flex rounded-xl bg-gradient-to-br ${pillar.color} p-3`}>
                    <pillar.icon className='h-6 w-6 text-white' />
                  </div>
                  <h3 className='mb-2 text-xl font-semibold'>{t(`pillars.${pillar.key}.title`)}</h3>
                  <p className='text-muted-foreground text-sm leading-relaxed'>{t(`pillars.${pillar.key}.description`)}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
