"use client";

import {Avatar, AvatarFallback, AvatarImage} from "@arolariu/components/avatar";
import {Card, CardContent} from "@arolariu/components/card";
import {motion, useInView, type Variants} from "motion/react";
import {useTranslations} from "next-intl";
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
  const t = useTranslations("About.Author.Perspectives");
  const sectionRef = useRef<HTMLElement | null>(null);
  const inView = useInView(sectionRef, {amount: 0.1, once: true});

  const perspectives = [
    {
      author: t("perspectiveFromX.author"),
      avatar: t("perspectiveFromX.avatar"),
      position: t("perspectiveFromX.position"),
      company: t("perspectiveFromX.company"),
      quote: t("perspectiveFromX.quote"),
    },
    {
      author: t("perspectiveFromY.author"),
      avatar: t("perspectiveFromY.avatar"),
      position: t("perspectiveFromY.position"),
      company: t("perspectiveFromY.company"),
      quote: t("perspectiveFromY.quote"),
    },
    {
      author: t("perspectiveFromZ.author"),
      avatar: t("perspectiveFromZ.avatar"),
      position: t("perspectiveFromZ.position"),
      company: t("perspectiveFromZ.company"),
      quote: t("perspectiveFromZ.quote"),
    },
    {
      author: t("perspectiveFromXX.author"),
      avatar: t("perspectiveFromXX.avatar"),
      position: t("perspectiveFromXX.position"),
      company: t("perspectiveFromXX.company"),
      quote: t("perspectiveFromXX.quote"),
    },
    {
      author: t("perspectiveFromXY.author"),
      avatar: t("perspectiveFromXY.avatar"),
      position: t("perspectiveFromXY.position"),
      company: t("perspectiveFromXY.company"),
      quote: t("perspectiveFromXY.quote"),
    },
    {
      author: t("perspectiveFromXZ.author"),
      avatar: t("perspectiveFromXZ.avatar"),
      position: t("perspectiveFromXZ.position"),
      company: t("perspectiveFromXZ.company"),
      quote: t("perspectiveFromXZ.quote"),
    },
    {
      author: t("perspectiveFromYX.author"),
      avatar: t("perspectiveFromYX.avatar"),
      position: t("perspectiveFromYX.position"),
      company: t("perspectiveFromYX.company"),
      quote: t("perspectiveFromYX.quote"),
    },
    {
      author: t("perspectiveFromYY.author"),
      avatar: t("perspectiveFromYY.avatar"),
      position: t("perspectiveFromYY.position"),
      company: t("perspectiveFromYY.company"),
      quote: t("perspectiveFromYY.quote"),
    },
    {
      author: t("perspectiveFromYZ.author"),
      avatar: t("perspectiveFromYZ.avatar"),
      position: t("perspectiveFromYZ.position"),
      company: t("perspectiveFromYZ.company"),
      quote: t("perspectiveFromYZ.quote"),
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
            {t("title")}
            <span className={styles["titleUnderline"]} />
          </h2>
          <p className={styles["subtitle"]}>{t("subtitle")}</p>
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
