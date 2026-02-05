"use client";

import {motion, useInView, type Variants} from "motion/react";
import {useTranslations} from "next-intl";
import {useRef} from "react";
import {TbAntenna, TbBook, TbBulb, TbCode, TbDeviceGamepad} from "react-icons/tb";
import styles from "./Biography.module.scss";

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
  hidden: {opacity: 0, y: 20},
  visible: {opacity: 1, y: 0, transition: {duration: 0.8}},
};

/**
 * @description Renders a section with the author's biography, displaying animated content
 * with colorful background elements. The component uses Framer Motion for
 * animations and the built-in motion/react useInView hook to trigger animations
 * when the component enters the viewport.
 * The biography content is organized in sections, each with an icon and text
 * loaded from internationalization strings. The component creates a visually
 * engaging presentation with gradients, blur effects, and staggered animations.
 * @returns A section containing the animated biography content
 */
export default function Biography(): React.JSX.Element {
  const t = useTranslations("About.Author.Biography");
  const sectionRef = useRef<HTMLDivElement | null>(null);
  const inView = useInView(sectionRef, {amount: 0.1, once: false});

// Map bio section keys to SCSS icon class names
const iconClassMap = {
  first: "iconBlue",
  second: "iconGreen",
  third: "iconPurple",
  fourth: "iconAmber",
  fifth: "iconPink",
} as const;

type BioSectionKey = keyof typeof iconClassMap;

  const bioSections: Array<{key: BioSectionKey; icon: React.ReactNode; content: string}> = [
    {
      key: "first",
      icon: <TbCode className={styles["iconBlue"]} />,
      content: t("FirstPoint", {age: (new Date().getFullYear() - 2000).toString()}),
    },
    {
      key: "second",
      icon: <TbDeviceGamepad className={styles["iconGreen"]} />,
      content: t("SecondPoint"),
    },
    {
      key: "third",
      icon: <TbBulb className={styles["iconPurple"]} />,
      content: t("ThirdPoint"),
    },
    {
      key: "fourth",
      icon: <TbBook className={styles["iconAmber"]} />,
      content: t("FourthPoint"),
    },
    {
      key: "fifth",
      icon: <TbAntenna className={styles["iconPink"]} />,
      content: t("FifthPoint"),
    },
  ];

  return (
    <section className={styles["section"]}>
      <div className={styles["bgOrbs"]}>
        <motion.div
          className={styles["orbBlue"]}
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.3, 0.5, 0.3],
          }}
          transition={{duration: 8, repeat: Number.POSITIVE_INFINITY}}
        />
        <motion.div
          className={styles["orbPurple"]}
          animate={{
            scale: [1.2, 1, 1.2],
            opacity: [0.3, 0.5, 0.3],
          }}
          transition={{duration: 8, repeat: Number.POSITIVE_INFINITY, delay: 2}}
        />
      </div>

      <motion.div
        ref={sectionRef}
        variants={containerVariants}
        initial='hidden'
        animate={inView ? "visible" : "hidden"}
        className={styles["content"]}>
        <motion.div
          variants={itemVariants}
          className={styles["header"]}>
          <h2 className={`blue-underline ${styles["title"]}`}>{t("title")}</h2>
        </motion.div>

        <motion.div variants={itemVariants}>
          <div className={styles["card"]}>
            <div className={styles["accentTop"]} />
            {bioSections.map((section) => (
              <motion.div
                key={section.content.slice(0, 20)}
                className={styles["bioItem"]}>
                <span>{section.icon}</span>
                <span className={styles["bioText"]}>{section.content}</span>
              </motion.div>
            ))}

            <motion.div
              className={styles["accentBottom"]}
              initial={{width: "0%"}}
              whileInView={{width: "100%"}}
              transition={{duration: 1.5, ease: "easeOut"}}
              viewport={{once: false}}
            />
          </div>
        </motion.div>
      </motion.div>
    </section>
  );
}
