"use client";

import {motion, useInView, type Variants} from "motion/react";
import {useTranslations} from "next-intl";
import {useRef} from "react";
import {TbBook2, TbBrain, TbCalculator, TbCheck, TbTestPipe, TbUsers} from "react-icons/tb";
import styles from "./Competencies.module.scss";

const containerVariants: Variants = {
  hidden: {opacity: 0},
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const itemVariants: Variants = {
  hidden: {opacity: 0, y: 20},
  visible: {opacity: 1, y: 0, transition: {duration: 0.5}},
};

/**
 * @description Component for displaying the author's professional skill set.
 * This client component renders a grid of skills with animations powered by Framer Motion.
 * Each skill is displayed as a card with an icon, title, and description.
 * The component uses the IntersectionObserver API to trigger animations when the section comes into view.
 * @returns A section element containing the competencies grid with animated entries
 */
export default function Competencies(): React.JSX.Element {
  const t = useTranslations("About.Author.Competencies");
  const sectionRef = useRef<HTMLDivElement | null>(null);
  const inView = useInView(sectionRef, {amount: 0.1, once: false});

  const skills = [
    {
      title: t("competences.algorithmicSkills.title"),
      icon: <TbCalculator className={styles["icon"]} />,
      description: t("competences.algorithmicSkills.description"),
    },
    {
      title: t("competences.testDrivenDevelopment.title"),
      icon: <TbTestPipe className={styles["icon"]} />,
      description: t("competences.testDrivenDevelopment.description"),
    },
    {
      title: t("competences.domainDrivenDesign.title"),
      icon: <TbBook2 className={styles["icon"]} />,
      description: t("competences.domainDrivenDesign.description"),
    },
    {
      title: t("competences.agileMethodologies.title"),
      icon: <TbUsers className={styles["icon"]} />,
      description: t("competences.agileMethodologies.description"),
    },
    {
      title: t("competences.customerCentric.title"),
      icon: <TbBrain className={styles["icon"]} />,
      description: t("competences.customerCentric.description"),
    },
    {
      title: t("competences.engineeringExcellence.title"),
      icon: <TbCheck className={styles["icon"]} />,
      description: t("competences.engineeringExcellence.description"),
    },
  ];

  return (
    <section className={styles["section"]}>
      <motion.div
        initial={{opacity: 0, y: 20}}
        animate={inView ? {opacity: 1, y: 0} : {opacity: 0, y: 20}}
        transition={{duration: 0.6}}
        className={styles["header"]}>
        <h2 className={`blue-underline ${styles["title"]}`}>{t("title")}</h2>
        <p className={styles["subtitle"]}>{t("subtitle")}</p>
      </motion.div>

      <motion.div
        ref={sectionRef}
        variants={containerVariants}
        initial='hidden'
        animate={inView ? "visible" : "hidden"}
        className={styles["grid"]}>
        {skills.map((skill) => (
          <motion.div
            key={skill.title}
            variants={itemVariants}
            className={styles["cardWrapper"]}
            whileHover={{
              scale: 1.03,
              transition: {duration: 0.2},
            }}>
            <div className={styles["card"]}>
              <div className={styles["accentTop"]} />
              <div className={styles["cardHeader"]}>
                <div className={styles["iconWrapper"]}>
                  {skill.icon}
                </div>
                <h3 className={styles["cardTitle"]}>{skill.title}</h3>
              </div>
              <p className={styles["cardDescription"]}>{skill.description}</p>
            </div>
          </motion.div>
        ))}
      </motion.div>
    </section>
  );
}
