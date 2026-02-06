"use client";

import {Accordion, AccordionContent, AccordionItem, AccordionTrigger} from "@arolariu/components/accordion";
import {motion, useInView} from "motion/react";
import {useTranslations} from "next-intl";
import {useRef} from "react";
import {TbQuestionMark} from "react-icons/tb";
import styles from "./Faq.module.scss";

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
      className={styles["section"]}>
      <main className={styles["container"]}>
        {/* Section header */}
        <motion.div
          className={styles["header"]}
          initial={{opacity: 0, y: 20}}
          animate={isInView ? {opacity: 1, y: 0} : {}}
          transition={{duration: 0.6}}>
          <main className={styles["iconWrapper"]}>
            <main className={styles["iconInner"]}>
              <TbQuestionMark className={styles["icon"]} />
            </main>
          </main>
          <h2 className={`blue-underline ${styles["title"]}`}>{t("title")}</h2>
          <p className={styles["subtitle"]}>{t("subtitle")}</p>
        </motion.div>

        {/* Accordion */}
        <motion.div
          initial={{opacity: 0, y: 20}}
          animate={isInView ? {opacity: 1, y: 0} : {}}
          transition={{delay: 0.3, duration: 0.5}}>
          <Accordion
            type='single'
            collapsible
            className={styles["accordion"]}>
            {questions.map((q, index) => (
              <motion.div
                key={q}
                initial={{opacity: 0, x: -20}}
                animate={isInView ? {opacity: 1, x: 0} : {}}
                transition={{delay: 0.4 + index * 0.1, duration: 0.4}}>
                <AccordionItem
                  value={q}
                  className={styles["accordionItem"]}>
                  <AccordionTrigger className={styles["accordionTrigger"]}>
                    <span className={styles["question"]}>{t(`questions.${q}.question`)}</span>
                  </AccordionTrigger>
                  <AccordionContent>
                    <p className={styles["answer"]}>{t(`questions.${q}.answer`)}</p>
                  </AccordionContent>
                </AccordionItem>
              </motion.div>
            ))}
          </Accordion>
        </motion.div>
      </main>
    </section>
  );
}
