"use client";

import {Accordion, AccordionContent, AccordionItem, AccordionTrigger} from "@arolariu/components/accordion";
import {motion, useInView} from "motion/react";
import {useTranslations} from "next-intl";
import {useRef} from "react";
import {TbQuestionMark} from "react-icons/tb";

const questions = ["q1", "q2", "q3", "q4"] as const;

/**
 * FAQ section with accordion-style questions and answers.
 */
export default function Faq(): React.JSX.Element {
  const t = useTranslations("About.Hub.faq");
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
          <div className='mb-4 flex justify-center'>
            <div className='rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 p-3'>
              <TbQuestionMark className='h-6 w-6 text-white' />
            </div>
          </div>
          <h2 className='blue-underline mb-4 inline-block text-3xl font-bold sm:text-4xl'>{t("title")}</h2>
          <p className='text-muted-foreground mx-auto max-w-2xl text-lg'>{t("subtitle")}</p>
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
                    <span className='pr-4 text-left font-semibold'>{t(`questions.${q}.question`)}</span>
                  </AccordionTrigger>
                  <AccordionContent>
                    <p className='text-muted-foreground leading-relaxed'>{t(`questions.${q}.answer`)}</p>
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
