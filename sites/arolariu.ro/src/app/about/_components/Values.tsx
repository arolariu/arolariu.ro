"use client";

import {Card, CardContent} from "@arolariu/components/card";
import {motion, useInView} from "motion/react";
import {useTranslations} from "next-intl";
import {useRef} from "react";
import {TbAccessible, TbBook, TbCode, TbRocket, TbShield, TbUsers} from "react-icons/tb";

const values = [
  {key: "engineering", icon: TbCode, color: "text-blue-500", bg: "bg-blue-500/10"},
  {key: "learning", icon: TbBook, color: "text-amber-500", bg: "bg-amber-500/10"},
  {key: "community", icon: TbUsers, color: "text-green-500", bg: "bg-green-500/10"},
  {key: "privacy", icon: TbShield, color: "text-purple-500", bg: "bg-purple-500/10"},
  {key: "performance", icon: TbRocket, color: "text-pink-500", bg: "bg-pink-500/10"},
  {key: "accessibility", icon: TbAccessible, color: "text-cyan-500", bg: "bg-cyan-500/10"},
] as const;

/**
 * Values section displaying the core values that guide development.
 */
export default function Values(): React.JSX.Element {
  const t = useTranslations("About.Hub.values");
  const ref = useRef<HTMLElement>(null);
  const isInView = useInView(ref, {once: true, margin: "-100px"});

  return (
    <section
      ref={ref}
      className='relative w-full bg-gradient-to-b from-transparent via-blue-500/5 to-transparent px-4 py-20'>
      <div className='mx-auto max-w-6xl'>
        {/* Section header */}
        <motion.div
          className='mb-16 text-center'
          initial={{opacity: 0, y: 20}}
          animate={isInView ? {opacity: 1, y: 0} : {}}
          transition={{duration: 0.6}}>
          <h2 className='blue-underline mb-4 inline-block text-3xl font-bold sm:text-4xl'>{t("title")}</h2>
          <p className='text-muted-foreground mx-auto max-w-2xl text-lg'>{t("subtitle")}</p>
        </motion.div>

        {/* Values grid */}
        <div className='grid gap-6 sm:grid-cols-2 lg:grid-cols-3'>
          {values.map((value, index) => (
            <motion.div
              key={value.key}
              initial={{opacity: 0, y: 30}}
              animate={isInView ? {opacity: 1, y: 0} : {}}
              transition={{delay: 0.2 + index * 0.1, duration: 0.5}}>
              <Card className='group hover:border-primary/30 h-full transition-all duration-300 hover:-translate-y-1 hover:shadow-lg'>
                <CardContent className='p-6'>
                  <div className='mb-4 flex items-center gap-4'>
                    <div className={`${value.bg} rounded-xl p-3 transition-transform duration-300 group-hover:scale-110`}>
                      <value.icon className={`h-6 w-6 ${value.color}`} />
                    </div>
                    <h3 className='text-lg font-semibold'>{t(`items.${value.key}.title`)}</h3>
                  </div>
                  <p className='text-muted-foreground text-sm leading-relaxed'>{t(`items.${value.key}.description`)}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
