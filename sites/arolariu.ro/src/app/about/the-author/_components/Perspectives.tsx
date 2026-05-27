"use client";

import {Avatar, AvatarFallback, AvatarImage} from "@arolariu/components/avatar";
import {Card, CardContent} from "@arolariu/components/card";
import {motion, useInView, type Variants} from "motion/react";
import {useTranslations} from "next-intl-selector";
import {useRef} from "react";
import {TbQuote} from "react-icons/tb";
import styles from "./Perspectives.module.scss";

type PerspectiveType = {
  author: string;
  avatar: string;
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
      author: t((m) => m.About.Author.Perspectives.perspectiveFromX.author),
      avatar: t((m) => m.About.Author.Perspectives.perspectiveFromX.avatar),
      position: t((m) => m.About.Author.Perspectives.perspectiveFromX.position),
      company: t((m) => m.About.Author.Perspectives.perspectiveFromX.company),
      quote: t((m) => m.About.Author.Perspectives.perspectiveFromX.quote),
    },
    {
      author: t((m) => m.About.Author.Perspectives.perspectiveFromY.author),
      avatar: t((m) => m.About.Author.Perspectives.perspectiveFromY.avatar),
      position: t((m) => m.About.Author.Perspectives.perspectiveFromY.position),
      company: t((m) => m.About.Author.Perspectives.perspectiveFromY.company),
      quote: t((m) => m.About.Author.Perspectives.perspectiveFromY.quote),
    },
    {
      author: t((m) => m.About.Author.Perspectives.perspectiveFromZ.author),
      avatar: t((m) => m.About.Author.Perspectives.perspectiveFromZ.avatar),
      position: t((m) => m.About.Author.Perspectives.perspectiveFromZ.position),
      company: t((m) => m.About.Author.Perspectives.perspectiveFromZ.company),
      quote: t((m) => m.About.Author.Perspectives.perspectiveFromZ.quote),
    },
    {
      author: t((m) => m.About.Author.Perspectives.perspectiveFromXX.author),
      avatar: t((m) => m.About.Author.Perspectives.perspectiveFromXX.avatar),
      position: t((m) => m.About.Author.Perspectives.perspectiveFromXX.position),
      company: t((m) => m.About.Author.Perspectives.perspectiveFromXX.company),
      quote: t((m) => m.About.Author.Perspectives.perspectiveFromXX.quote),
    },
    {
      author: t((m) => m.About.Author.Perspectives.perspectiveFromXY.author),
      avatar: t((m) => m.About.Author.Perspectives.perspectiveFromXY.avatar),
      position: t((m) => m.About.Author.Perspectives.perspectiveFromXY.position),
      company: t((m) => m.About.Author.Perspectives.perspectiveFromXY.company),
      quote: t((m) => m.About.Author.Perspectives.perspectiveFromXY.quote),
    },
    {
      author: t((m) => m.About.Author.Perspectives.perspectiveFromXZ.author),
      avatar: t((m) => m.About.Author.Perspectives.perspectiveFromXZ.avatar),
      position: t((m) => m.About.Author.Perspectives.perspectiveFromXZ.position),
      company: t((m) => m.About.Author.Perspectives.perspectiveFromXZ.company),
      quote: t((m) => m.About.Author.Perspectives.perspectiveFromXZ.quote),
    },
    {
      author: t((m) => m.About.Author.Perspectives.perspectiveFromYX.author),
      avatar: t((m) => m.About.Author.Perspectives.perspectiveFromYX.avatar),
      position: t((m) => m.About.Author.Perspectives.perspectiveFromYX.position),
      company: t((m) => m.About.Author.Perspectives.perspectiveFromYX.company),
      quote: t((m) => m.About.Author.Perspectives.perspectiveFromYX.quote),
    },
    {
      author: t((m) => m.About.Author.Perspectives.perspectiveFromYY.author),
      avatar: t((m) => m.About.Author.Perspectives.perspectiveFromYY.avatar),
      position: t((m) => m.About.Author.Perspectives.perspectiveFromYY.position),
      company: t((m) => m.About.Author.Perspectives.perspectiveFromYY.company),
      quote: t((m) => m.About.Author.Perspectives.perspectiveFromYY.quote),
    },
    {
      author: t((m) => m.About.Author.Perspectives.perspectiveFromYZ.author),
      avatar: t((m) => m.About.Author.Perspectives.perspectiveFromYZ.avatar),
      position: t((m) => m.About.Author.Perspectives.perspectiveFromYZ.position),
      company: t((m) => m.About.Author.Perspectives.perspectiveFromYZ.company),
      quote: t((m) => m.About.Author.Perspectives.perspectiveFromYZ.quote),
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
            {t((m) => m.About.Author.Perspectives.title)}
            <span className={styles["titleUnderline"]} />
          </h2>
          <p className={styles["subtitle"]}>{t((m) => m.About.Author.Perspectives.subtitle)}</p>
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
                      <AvatarImage
                        src={perspective.avatar}
                        alt={perspective.author}
                      />
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
