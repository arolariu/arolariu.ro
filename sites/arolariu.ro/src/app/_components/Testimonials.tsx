"use client";

import {Avatar, AvatarFallback} from "@arolariu/components/avatar";
import {Card, CardContent} from "@arolariu/components/card";
import {motion, useInView} from "motion/react";
import {useTranslations} from "next-intl";
import {useRef} from "react";
import {TbQuote} from "react-icons/tb";

const testimonials = ["t1", "t2", "t3"] as const;

/**
 * Testimonials section displaying social proof from colleagues.
 */
export default function Testimonials(): React.JSX.Element {
  const t = useTranslations("Home.testimonials");
  const ref = useRef<HTMLElement>(null);
  const isInView = useInView(ref, {once: true, margin: "-100px"});

  return (
    <section
      ref={ref}
      className='relative w-full bg-gradient-to-b from-transparent via-purple-500/5 to-transparent px-4 py-20'>
      <div className='mx-auto max-w-6xl'>
        {/* Section header */}
        <motion.div
          className='mb-16 text-center'
          initial={{opacity: 0, y: 20}}
          animate={isInView ? {opacity: 1, y: 0} : {}}
          transition={{duration: 0.6}}>
          <h2 className='mb-4 text-3xl font-bold sm:text-4xl'>
            <span className='bg-gradient-to-r from-cyan-500 to-purple-500 bg-clip-text text-transparent'>{t("title")}</span>
          </h2>
          <p className='text-muted-foreground mx-auto max-w-2xl text-lg'>{t("subtitle")}</p>
        </motion.div>

        {/* Testimonials grid */}
        <div className='grid gap-8 md:grid-cols-3'>
          {testimonials.map((key, index) => (
            <motion.div
              key={key}
              initial={{opacity: 0, y: 30}}
              animate={isInView ? {opacity: 1, y: 0} : {}}
              transition={{delay: 0.2 + index * 0.15, duration: 0.5}}>
              <Card className='group hover:border-primary/30 relative h-full transition-all duration-300 hover:-translate-y-1 hover:shadow-lg'>
                {/* Quote icon */}
                <div className='bg-primary absolute -top-4 -left-2 rounded-full p-2'>
                  <TbQuote className='h-5 w-5 text-white' />
                </div>

                <CardContent className='p-6 pt-8'>
                  {/* Quote */}
                  <p className='text-muted-foreground mb-6 text-sm italic leading-relaxed'>"{t(`items.${key}.quote`)}"</p>

                  {/* Author */}
                  <div className='flex items-center gap-3'>
                    <Avatar className='h-10 w-10'>
                      <AvatarFallback className='bg-gradient-to-br from-cyan-500 to-purple-500 text-xs text-white'>
                        {t(`items.${key}.author`)
                          .split(" ")
                          .map((n) => n.charAt(0))
                          .join("")}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className='text-sm font-semibold'>{t(`items.${key}.author`)}</p>
                      <p className='text-muted-foreground text-xs'>{t(`items.${key}.role`)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
