"use client";

import {Button} from "@arolariu/components/button";
import {Card, CardContent} from "@arolariu/components/card";
import {AnimatePresence, motion, useInView, type Variants} from "motion/react";
import {useTranslations} from "next-intl";
import {useCallback, useRef, useState} from "react";
import {TbArrowLeft, TbBook, TbBuildingCommunity, TbCalendar, TbInfoCircle, TbMap, TbSchool} from "react-icons/tb";
import styles from "./Education.module.scss";

type EducationType = {
  degree: string;
  institution: string;
  location: string;
  period: string;
  description: string;
  status: string;
  coursesTitle: string;
  courses: string[];
  aboutTheProgramCta: string;
  aboutTheProgramTitle: string;
  aboutTheProgramDescription: string;
  aboutTheProgramLearningsTitle: string;
  aboutTheProgramLearnings: string[];
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
  hidden: {opacity: 0, y: 20},
  visible: {opacity: 1, y: 0, transition: {duration: 0.6}},
};

/**
 * @description Component that displays the educational background of the author.
 * @returns A section containing the author's education information with animated cards.
 */
export default function Education(): React.JSX.Element {
  const t = useTranslations("About.Author.Education");
  const sectionRef = useRef<HTMLDivElement | null>(null);
  const inView = useInView(sectionRef, {amount: 0.1, once: false});
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [isFlipped, setIsFlipped] = useState<number[]>([]);

  const toggleFlip = useCallback(
    (index: number) => {
      if (isFlipped.includes(index)) {
        setIsFlipped(isFlipped.filter((i) => i !== index));
      } else {
        setIsFlipped([...isFlipped, index]);
      }
    },
    [isFlipped],
  );

  const education = [
    {
      degree: t("university.malmoSweden.degree"),
      institution: t("university.malmoSweden.institution"),
      location: t("university.malmoSweden.location"),
      period: t("university.malmoSweden.period"),
      description: t("university.malmoSweden.description"),
      status: t("university.malmoSweden.status"),
      coursesTitle: t("university.malmoSweden.keyCourses_title"),
      courses: t("university.malmoSweden.keyCourses")
        .split("#")
        .filter((course) => course.trim().length > 3),
      aboutTheProgramCta: t("university.malmoSweden.aboutTheProgram_cta"),
      aboutTheProgramTitle: t("university.malmoSweden.aboutTheProgram_title"),
      aboutTheProgramDescription: t("university.malmoSweden.aboutTheProgram_description"),
      aboutTheProgramLearningsTitle: t("university.malmoSweden.aboutTheProgram_learnings_title"),
      aboutTheProgramLearnings: t("university.malmoSweden.aboutTheProgram_learnings")
        .split("#")
        .filter((learning) => learning.trim().length > 3),
    },
    {
      degree: t("university.aseBucharest.degree"),
      institution: t("university.aseBucharest.institution"),
      location: t("university.aseBucharest.location"),
      period: t("university.aseBucharest.period"),
      description: t("university.aseBucharest.description"),
      status: t("university.aseBucharest.status"),
      coursesTitle: t("university.aseBucharest.keyCourses_title"),
      courses: t("university.aseBucharest.keyCourses")
        .split("#")
        .filter((course) => course.trim().length > 3),
      aboutTheProgramCta: t("university.aseBucharest.aboutTheProgram_cta"),
      aboutTheProgramTitle: t("university.aseBucharest.aboutTheProgram_title"),
      aboutTheProgramDescription: t("university.aseBucharest.aboutTheProgram_description"),
      aboutTheProgramLearningsTitle: t("university.aseBucharest.aboutTheProgram_learnings_title"),
      aboutTheProgramLearnings: t("university.aseBucharest.aboutTheProgram_learnings")
        .split("#")
        .filter((learning) => learning.trim().length > 3),
    },
  ] satisfies EducationType[];

  // Stable handlers to avoid inline arrow functions in JSX
  const handleCardMouseEnter = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const idx = (e.currentTarget as HTMLDivElement).dataset["index"];
    setActiveIndex(idx ? Number(idx) : null);
  }, []);

  const handleCardMouseLeave = useCallback(() => {
    setActiveIndex(null);
  }, []);

  const handleToggleFlipClick = useCallback(
    (e: React.MouseEvent<HTMLElement>) => {
      const {index} = (e.currentTarget as HTMLElement).dataset;
      if (index) {
        toggleFlip(Number(index));
      }
    },
    [toggleFlip],
  );

  return (
    <section className={styles["section"]}>
      <motion.div
        initial={{opacity: 0, y: 20}}
        animate={{opacity: 1, y: 0}}
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
        className={styles["educationList"]}>
        {education.map((item, index) => (
          <motion.div
            key={item.degree}
            variants={itemVariants}
            className={styles["cardWrapper"]}
            data-index={index}
            onMouseEnter={handleCardMouseEnter}
            onMouseLeave={handleCardMouseLeave}>
            <div className={styles["cardContainer"]}>
              <AnimatePresence
                initial={false}
                mode='wait'>
                {isFlipped.includes(index) === false ? (
                  <motion.div
                    key={`${item.degree}-front`}
                    initial={{opacity: 0}}
                    animate={{opacity: 1}}
                    exit={{opacity: 0}}
                    transition={{duration: 0.3}}
                    className={styles["card"]}>
                    <Card className={styles["cardInner"]}>
                      <CardContent className={styles["cardContent"]}>
                        <div className={styles["cardLeft"]}>
                          <motion.div
                            className={styles["schoolIconWrapper"]}
                            whileHover={{scale: 1.1, rotate: 5}}
                            data-index={index}
                            onClick={handleToggleFlipClick}>
                            <TbSchool className={styles["schoolIcon"]} />
                          </motion.div>
                          <h3 className={styles["degree"]}>{item.degree}</h3>
                          <div className={styles["metaItem"]}>
                            <TbCalendar className={styles["metaIcon"]} />
                            <span>{item.period}</span>
                          </div>
                          <div className={styles["metaItem"]}>
                            <TbMap className={styles["metaIcon"]} />
                            <span>{item.location}</span>
                          </div>
                          <div className={styles["metaItem"]}>
                            <TbBuildingCommunity className={styles["metaIcon"]} />
                            <span>{item.institution}</span>
                          </div>
                        </div>
                        <div className={styles["cardRight"]}>
                          <h4 className={styles["coursesHeader"]}>
                            <TbBook className={styles["coursesIcon"]} />
                            {item.coursesTitle}
                          </h4>
                          <ul className={styles["courseList"]}>
                            {item.courses.slice(0, 5).map((course) => (
                              <motion.li
                                key={`${item.degree}-${course}`}
                                className={styles["courseItem"]}
                                initial={{opacity: 0.7}}
                                whileHover={{
                                  opacity: 1,
                                  x: 5,
                                  transition: {duration: 0.2},
                                }}>
                                <span className={styles["courseBullet"]}>•</span>
                                <span>{course}</span>
                              </motion.li>
                            ))}
                          </ul>
                          <span className={styles["description"]}>{item.description}</span>

                          <Button
                            variant='ghost'
                            size='sm'
                            className={styles["ctaButton"]}
                            data-index={index}
                            onClick={handleToggleFlipClick}>
                            <TbInfoCircle className={styles["ctaIcon"]} />
                            {item.aboutTheProgramCta}
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ) : (
                  <motion.div
                    key={`${item.degree}-back`}
                    initial={{opacity: 0}}
                    animate={{opacity: 1}}
                    exit={{opacity: 0}}
                    transition={{duration: 0.3}}
                    className={styles["card"]}>
                    <Card className={styles["cardInner"]}>
                      <CardContent className={styles["backCard"]}>
                        <div className={styles["backHeader"]}>
                          <h3 className={styles["backTitle"]}>{item.institution}</h3>
                          <Button
                            variant='ghost'
                            size='sm'
                            className={styles["backButton"]}
                            data-index={index}
                            onClick={handleToggleFlipClick}>
                            <TbArrowLeft className={styles["backIcon"]} />
                          </Button>
                        </div>

                        <div className={styles["scrollContent"]}>
                          <div className={styles["scrollSection"]}>
                            <h4 className={styles["scrollSectionTitle"]}>{item.aboutTheProgramTitle}</h4>
                            <p>{item.aboutTheProgramDescription}</p>
                          </div>

                          <div className={styles["scrollSection"]}>
                            <h4 className={styles["scrollSectionTitle"]}>{item.aboutTheProgramLearningsTitle}</h4>
                            <ul className={styles["courseList"]}>
                              {item.aboutTheProgramLearnings.map((learning) => (
                                <motion.li
                                  key={learning.slice(0, 20)}
                                  className={styles["courseItem"]}
                                  initial={{opacity: 0.7}}
                                  whileHover={{
                                    opacity: 1,
                                    x: 5,
                                    transition: {duration: 0.2},
                                  }}>
                                  <span className={styles["courseBullet"]}>•</span>
                                  <span>{learning}</span>
                                </motion.li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            {activeIndex === index && !isFlipped.includes(index) && (
              <motion.div
                className={styles["glowEffect"]}
                initial={{opacity: 0}}
                animate={{opacity: 1}}
                exit={{opacity: 0}}
                transition={{duration: 0.3}}
              />
            )}
          </motion.div>
        ))}
      </motion.div>
    </section>
  );
}
