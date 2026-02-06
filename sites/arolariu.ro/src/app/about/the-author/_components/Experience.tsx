"use client";

import {Badge} from "@arolariu/components/badge";
import {Button} from "@arolariu/components/button";
import {AnimatePresence, motion} from "motion/react";
import {useTranslations} from "next-intl";
import React, {useCallback, useState} from "react";
import {CgMicrosoft} from "react-icons/cg";
import {SiIntel, SiUbisoft} from "react-icons/si";
import {TbBriefcase, TbCalendar, TbChevronRight, TbMap} from "react-icons/tb";
import styles from "./Experience.module.scss";

type ExperienceType = {
  company: string;
  role: string;
  period: string;
  location: string;
  description: string;
  responsibilities: string[];
  achievements: string[];
  skills: string[];
  logo: React.JSX.Element;
};

/**
 * @description Component that displays a timeline of professional experiences.
 * This component renders an interactive timeline of work experiences, with a navigation
 * panel on the left side and detailed information about the selected experience on the right.
 *
 * It uses framer-motion for animations and next-intl for translations.
 *
 * The component fetches experience data from translation files and displays them in a
 * responsive layout. Users can click on different experiences in the timeline to view
 * detailed information about each role, including responsibilities, achievements, and skills.
 * @returns A section element containing the experience timeline and detailed work card
 */
export default function Experience(): React.JSX.Element {
  const t = useTranslations("About.Author.Experiences");
  const [activeExpIndex, setActiveExpIndex] = useState<number>(0);
  const handleExperienceClick = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    const idxStr = e.currentTarget?.dataset?.["index"];
    const idx = typeof idxStr === "string" ? Number(idxStr) : Number.NaN;
    if (!Number.isNaN(idx)) {
      setActiveExpIndex(idx);
    }
  }, []);

  const experiences = [
    {
      company: t("microsoft3.company"),
      role: t("microsoft3.title"),
      period: t("microsoft3.period"),
      location: t("microsoft3.location"),
      description: t("microsoft3.description"),
      responsibilities: t("microsoft3.responsibilites")
        .split("#")
        .filter((item) => item.trim().length > 3),
      achievements: t("microsoft3.achievements")
        .split("#")
        .filter((item) => item.trim().length > 3),
      skills: t("microsoft3.techAndSkills")
        .split("#")
        .filter((item) => item.trim().length > 0),
      logo: <CgMicrosoft className={styles["logoIcon"]} />,
    },
    {
      company: t("microsoft2.company"),
      role: t("microsoft2.title"),
      period: t("microsoft2.period"),
      location: t("microsoft2.location"),
      description: t("microsoft2.description"),
      responsibilities: t("microsoft2.responsibilites")
        .split("#")
        .filter((item) => item.trim().length > 3),
      achievements: t("microsoft2.achievements")
        .split("#")
        .filter((item) => item.trim().length > 3),
      skills: t("microsoft2.techAndSkills")
        .split("#")
        .filter((item) => item.trim().length > 0),
      logo: <CgMicrosoft className={styles["logoIcon"]} />,
    },
    {
      company: t("microsoft1.company"),
      role: t("microsoft1.title"),
      period: t("microsoft1.period"),
      location: t("microsoft1.location"),
      description: t("microsoft1.description"),
      responsibilities: t("microsoft1.responsibilites")
        .split("#")
        .filter((item) => item.trim().length > 3),
      achievements: t("microsoft1.achievements")
        .split("#")
        .filter((item) => item.trim().length > 3),
      skills: t("microsoft1.techAndSkills")
        .split("#")
        .filter((item) => item.trim().length > 0),
      logo: <CgMicrosoft className={styles["logoIcon"]} />,
    },
    {
      company: t("intel.company"),
      role: t("intel.title"),
      period: t("intel.period"),
      location: t("intel.location"),
      description: t("intel.description"),
      responsibilities: t("intel.responsibilites")
        .split("#")
        .filter((item) => item.trim().length > 3),
      achievements: t("intel.achievements")
        .split("#")
        .filter((item) => item.trim().length > 3),
      skills: t("intel.techAndSkills")
        .split("#")
        .filter((item) => item.trim().length > 0),
      logo: <SiIntel className={styles["logoIcon"]} />,
    },
    {
      company: t("ubisoft.company"),
      role: t("ubisoft.title"),
      period: t("ubisoft.period"),
      location: t("ubisoft.location"),
      description: t("ubisoft.description"),
      responsibilities: t("ubisoft.responsibilites")
        .split("#")
        .filter((item) => item.trim().length > 3),
      achievements: t("ubisoft.achievements")
        .split("#")
        .filter((item) => item.trim().length > 3),
      skills: t("ubisoft.techAndSkills")
        .split("#")
        .filter((item) => item.trim().length > 0),
      logo: <SiUbisoft className={styles["logoIcon"]} />,
    },
  ] satisfies ExperienceType[];

  const currentExperience = experiences.at(activeExpIndex)!;

  return (
    <section className={styles["section"]}>
      <main className={styles["container"]}>
        <motion.div
          initial={{opacity: 0, y: 20}}
          animate={{opacity: 1, y: 0}}
          transition={{duration: 0.6}}
          className={styles["header"]}>
          <h2 className={`blue-underline ${styles["title"]}`}>{t("title")}</h2>
          <p className={styles["subtitle"]}>{t("subtitle")}</p>
        </motion.div>

        <main className={styles["grid"]}>
          {/* Timeline Navigation */}
          <main className={styles["timelineNav"]}>
            <main className={styles["timelineLine"]} />

            {experiences.map((experience, index) => (
              <motion.div
                key={`${experience.company}-${experience.period}`}
                className={styles["timelineItem"]}
                initial={{opacity: 0, x: -20}}
                animate={{opacity: 1, x: 0}}
                transition={{delay: index * 0.1, duration: 0.5}}>
                <Button
                  variant='ghost'
                  data-index={index}
                  onClick={handleExperienceClick}
                  className={activeExpIndex === index ? styles["timelineButtonActive"] : styles["timelineButtonInactive"]}>
                  <main className={activeExpIndex === index ? styles["timelineIconActive"] : styles["timelineIconInactive"]}>
                    <main className={activeExpIndex === index ? styles["timelineIconInnerActive"] : styles["timelineIconInnerInactive"]}>
                      <TbBriefcase className={styles["timelineIconSvg"]} />
                    </main>
                  </main>

                  <main className={styles["timelineContent"]}>
                    <h3 className={activeExpIndex === index ? styles["timelineCompanyActive"] : styles["timelineCompany"]}>
                      {experience.company}
                    </h3>
                    <p className={styles["timelineRole"]}>{experience.role}</p>
                    <main className={styles["timelineMeta"]}>
                      <TbCalendar className={styles["timelineMetaIcon"]} />
                      <span>{experience.period}</span>
                    </main>
                  </main>
                </Button>
              </motion.div>
            ))}
          </main>

          {/* Timeline Content */}
          <main className={styles["experienceCard"]}>
            <AnimatePresence mode='wait'>
              <motion.div
                initial={{opacity: 0, x: 20}}
                animate={{opacity: 1, x: 0}}
                exit={{opacity: 0, x: -20}}
                transition={{duration: 0.3}}
                className={styles["card"]}>
                <main className={styles["cardAccentTop"]} />

                <main className={styles["cardHeader"]}>
                  <main>
                    <h3 className={styles["cardTitle"]}>{currentExperience.role}</h3>
                    <main className={styles["cardCompany"]}>
                      <span>{currentExperience.company}</span>
                    </main>
                    <main className={styles["cardLocation"]}>
                      <TbMap className={styles["cardMetaIcon"]} />
                      <span>{currentExperience.location}</span>
                    </main>
                  </main>

                  <main className={styles["logoWrapper"]}>
                    <motion.div className={styles["logoInner"]}>{currentExperience.logo}</motion.div>
                  </main>
                </main>

                <p className={styles["cardDescription"]}>{currentExperience.description}</p>

                <main className={styles["cardSection"]}>
                  <h4 className={styles["cardSectionTitle"]}>{t("responsibilitiesLabel")}</h4>
                  <ul className={styles["list"]}>
                    {currentExperience.responsibilities.map((responsability, i) => (
                      <motion.li
                        key={`${responsability.slice(0, 20)}`}
                        className={styles["listItem"]}
                        initial={{opacity: 0, x: -10}}
                        animate={{opacity: 1, x: 0}}
                        transition={{delay: i * 0.1, duration: 0.3}}>
                        <TbChevronRight className={styles["listIcon"]} />
                        <span>{responsability}</span>
                      </motion.li>
                    ))}
                  </ul>
                </main>

                <main className={styles["cardSection"]}>
                  <h4 className={styles["cardSectionTitle"]}>{t("achievementsLabel")}</h4>
                  <ul className={styles["list"]}>
                    {currentExperience.achievements.map((achievement, i) => (
                      <motion.li
                        key={`${achievement.slice(0, 20)}`}
                        className={styles["listItem"]}
                        initial={{opacity: 0, x: -10}}
                        animate={{opacity: 1, x: 0}}
                        transition={{delay: i * 0.1, duration: 0.3}}>
                        <TbChevronRight className={styles["listIcon"]} />
                        <span>{achievement}</span>
                      </motion.li>
                    ))}
                  </ul>
                </main>

                <main>
                  <h4 className={styles["cardSectionTitle"]}>{t("techSkillsLabel")}</h4>
                  <main className={styles["skills"]}>
                    {currentExperience.skills.map((skill, i) => (
                      <motion.div
                        key={`${skill.slice(0, 20)}`}
                        initial={{opacity: 0, scale: 0.8}}
                        animate={{opacity: 1, scale: 1}}
                        transition={{delay: i * 0.5, duration: 0.3}}>
                        <Badge
                          variant='secondary'
                          className={styles["skillBadge"]}>
                          {skill}
                        </Badge>
                      </motion.div>
                    ))}
                  </main>
                </main>

                <motion.div
                  className={styles["cardAccentBottom"]}
                  initial={{width: "0%"}}
                  animate={{width: "100%"}}
                  transition={{duration: 3, delay: 0.3}}
                />
              </motion.div>
            </AnimatePresence>
          </main>
        </main>
      </main>
    </section>
  );
}
