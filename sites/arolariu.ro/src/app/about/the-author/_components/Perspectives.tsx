"use client";

import {Avatar, AvatarFallback} from "@arolariu/components/avatar";
import {Card, CardContent} from "@arolariu/components/card";
import {motion, useInView, type Variants} from "motion/react";
import {useTranslations} from "next-intl-selector";
import {useRef} from "react";
import {TbQuote} from "react-icons/tb";
import styles from "./Perspectives.module.scss";

type PerspectiveType = {
  author: string;
  position: string;
  company: string;
  quote: string;
};

const containerVariants: Variants = {
  hidden: {opacity: 0},
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.2,
    },
  },
};

const itemVariants: Variants = {
  hidden: {opacity: 0, y: 30},
  visible: {opacity: 1, y: 0, transition: {duration: 0.6}},
};

/**
 * @description A React component that displays a section of perspectives from various authors.
 * @returns A section element containing a grid of perspective cards with animation effects
 */
export default function Perspectives(): React.JSX.Element {
  const t = useTranslations();
  const sectionRef = useRef<HTMLElement | null>(null);
  const inView = useInView(sectionRef, {amount: 0.1, once: true});

  const perspectives = [
    {
      author: t((m) => m.sections.about.author.perspectives.perspectiveFromX.author),
      position: t((m) => m.sections.about.author.perspectives.perspectiveFromX.position),
      company: t((m) => m.sections.about.author.perspectives.perspectiveFromX.company),
      quote: t((m) => m.sections.about.author.perspectives.perspectiveFromX.quote),
    },
    {
      author: t((m) => m.sections.about.author.perspectives.perspectiveFromY.author),
      position: t((m) => m.sections.about.author.perspectives.perspectiveFromY.position),
      company: t((m) => m.sections.about.author.perspectives.perspectiveFromY.company),
      quote: t((m) => m.sections.about.author.perspectives.perspectiveFromY.quote),
    },
    {
      author: t((m) => m.sections.about.author.perspectives.perspectiveFromZ.author),
      position: t((m) => m.sections.about.author.perspectives.perspectiveFromZ.position),
      company: t((m) => m.sections.about.author.perspectives.perspectiveFromZ.company),
      quote: t((m) => m.sections.about.author.perspectives.perspectiveFromZ.quote),
    },
    {
      author: t((m) => m.sections.about.author.perspectives.perspectiveFromXX.author),
      position: t((m) => m.sections.about.author.perspectives.perspectiveFromXX.position),
      company: t((m) => m.sections.about.author.perspectives.perspectiveFromXX.company),
      quote: t((m) => m.sections.about.author.perspectives.perspectiveFromXX.quote),
    },
    {
      author: t((m) => m.sections.about.author.perspectives.perspectiveFromXY.author),
      position: t((m) => m.sections.about.author.perspectives.perspectiveFromXY.position),
      company: t((m) => m.sections.about.author.perspectives.perspectiveFromXY.company),
      quote: t((m) => m.sections.about.author.perspectives.perspectiveFromXY.quote),
    },
    {
      author: t((m) => m.sections.about.author.perspectives.perspectiveFromXZ.author),
      position: t((m) => m.sections.about.author.perspectives.perspectiveFromXZ.position),
      company: t((m) => m.sections.about.author.perspectives.perspectiveFromXZ.company),
      quote: t((m) => m.sections.about.author.perspectives.perspectiveFromXZ.quote),
    },
    {
      author: t((m) => m.sections.about.author.perspectives.perspectiveFromYX.author),
      position: t((m) => m.sections.about.author.perspectives.perspectiveFromYX.position),
      company: t((m) => m.sections.about.author.perspectives.perspectiveFromYX.company),
      quote: t((m) => m.sections.about.author.perspectives.perspectiveFromYX.quote),
    },
    {
      author: t((m) => m.sections.about.author.perspectives.perspectiveFromYY.author),
      position: t((m) => m.sections.about.author.perspectives.perspectiveFromYY.position),
      company: t((m) => m.sections.about.author.perspectives.perspectiveFromYY.company),
      quote: t((m) => m.sections.about.author.perspectives.perspectiveFromYY.quote),
    },
    {
      author: t((m) => m.sections.about.author.perspectives.perspectiveFromYZ.author),
      position: t((m) => m.sections.about.author.perspectives.perspectiveFromYZ.position),
      company: t((m) => m.sections.about.author.perspectives.perspectiveFromYZ.company),
      quote: t((m) => m.sections.about.author.perspectives.perspectiveFromYZ.quote),
    },
  ] satisfies PerspectiveType[];

  return (
    <section
      ref={sectionRef}
      className={styles["section"]}>
      <div className={styles["container"]}>
        <motion.div
          initial={{opacity: 0, y: 20}}
          animate={inView ? {opacity: 1, y: 0} : {opacity: 0, y: 20}}
          transition={{duration: 0.6}}
          className={styles["header"]}>
          <h2 className={styles["title"]}>
            {t((m) => m.sections.about.author.perspectives.title)}
            <span className={styles["titleUnderline"]} />
          </h2>
          <p className={styles["subtitle"]}>{t((m) => m.sections.about.author.perspectives.subtitle)}</p>
        </motion.div>

        <motion.div
          variants={containerVariants}
          initial='hidden'
          animate={inView ? "visible" : "hidden"}
          className={styles["grid"]}>
          {perspectives.map((perspective) => (
            <motion.div
              key={perspective.quote.slice(0, 20)}
              variants={itemVariants}>
              <Card className={styles["card"]}>
                <CardContent className={styles["cardContent"]}>
                  <div className={styles["quoteIconWrapper"]}>
                    <TbQuote className={styles["quoteIcon"]} />
                  </div>
                  <p className={styles["quote"]}>&ldquo;{perspective.quote}&rdquo;</p>
                  <div className={styles["authorInfo"]}>
                    <Avatar>
                      <AvatarFallback>
                        {perspective.author
                          .split(" ")
                          .map((n) => n[0])
                          .join("")}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className={styles["authorName"]}>{perspective.author}</p>
                      <p className={styles["authorPosition"]}>
                        {perspective.position} - {perspective.company}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
