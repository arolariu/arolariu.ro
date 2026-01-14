"use client";

import {Accordion, AccordionContent, AccordionItem, AccordionTrigger} from "@arolariu/components/accordion";
import {motion, useInView} from "motion/react";
import {useTranslations} from "next-intl";
import {useRef} from "react";

const questions = ["q1", "q2", "q3"] as const;

/**
 * FAQ section for the homepage with common questions.
 */
export default function HomeFAQ(): React.JSX.Element {
  const t = useTranslations("Home.faq");
  const ref = useRef<HTMLElement>(null);
  const isInView = useInView(ref, {once: true, margin: "-100px"});

  return (
    <section
      ref={ref}
      className='relative w-full px-4 py-20'>
      <div className='mx-auto max-w-3xl'>
        {/* Section header */}
        <motion.div
          className='mb-12 text-center'
          initial={{opacity: 0, y: 20}}
          animate={isInView ? {opacity: 1, y: 0} : {}}
          transition={{duration: 0.6}}>
          <h2 className='mb-4 text-3xl font-bold sm:text-4xl'>
            <span className='bg-gradient-to-r from-cyan-500 to-purple-500 bg-clip-text text-transparent'>{t("title")}</span>
          </h2>
        </motion.div>

        {/* Accordion */}
        <motion.div
          initial={{opacity: 0, y: 20}}
          animate={isInView ? {opacity: 1, y: 0} : {}}
          transition={{delay: 0.3, duration: 0.5}}>
          <Accordion
            type='single'
            collapsible
            className='w-full'>
            {questions.map((q, index) => (
              <motion.div
                key={q}
                initial={{opacity: 0, x: -20}}
                animate={isInView ? {opacity: 1, x: 0} : {}}
                transition={{delay: 0.4 + index * 0.1, duration: 0.4}}>
                <AccordionItem
                  value={q}
                  className='border-border/50 hover:border-primary/30 border-b transition-colors'>
                  <AccordionTrigger className='hover:no-underline'>
                    <span className='pr-4 text-left font-semibold'>{t(`items.${q}.question`)}</span>
                  </AccordionTrigger>
                  <AccordionContent>
                    <p className='text-muted-foreground leading-relaxed'>{t(`items.${q}.answer`)}</p>
                  </AccordionContent>
                </AccordionItem>
              </motion.div>
            ))}
          </Accordion>
        </motion.div>
      </div>
    </section>
  );
}
