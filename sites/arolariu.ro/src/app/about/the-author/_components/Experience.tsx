"use client";

import {Badge} from "@arolariu/components/badge";
import {Button} from "@arolariu/components/button";
import {motion} from "motion/react";
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

  return (
    <section className={styles["section"]}>
      <div className={styles["container"]}>
        <motion.div
          initial={{opacity: 0, y: 20}}
          animate={{opacity: 1, y: 0}}
          transition={{duration: 0.6}}
          className={styles["header"]}>
          <h2 className={`blue-underline ${styles["title"]}`}>{t("title")}</h2>
          <p className={styles["subtitle"]}>{t("subtitle")}</p>
        </motion.div>

        <div className={styles["grid"]}>
          {/* Timeline Navigation */}
          <div className={styles["timelineNav"]}>
            <div className={styles["timelineLine"]} />

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
                  <div className={activeExpIndex === index ? styles["timelineIconActive"] : styles["timelineIconInactive"]}>
                    <div className={activeExpIndex === index ? styles["timelineIconInnerActive"] : styles["timelineIconInnerInactive"]}>
                      <TbBriefcase className={styles["timelineIconSvg"]} />
                    </div>
                  </div>

                  <div className={styles["timelineContent"]}>
                    <h3 className={activeExpIndex === index ? styles["timelineCompanyActive"] : styles["timelineCompany"]}>
                      {experience.company}
                    </h3>
                    <p className={styles["timelineRole"]}>{experience.role}</p>
                    <div className={styles["timelineMeta"]}>
                      <TbCalendar className={styles["timelineMetaIcon"]} />
                      <span>{experience.period}</span>
                    </div>
                  </div>
                </Button>
              </motion.div>
            ))}
          </div>

          {/* Timeline Content */}
          <div className={styles["experienceCard"]}>
            {experiences.map((experience, index) => {
              const isActive = activeExpIndex === index;
              const xOffset = index > activeExpIndex ? 20 : -20;
              return (
                <motion.div
                  key={`${experience.company}-${experience.period}`}
                  initial={{opacity: 0, x: 20}}
                  animate={{
                    opacity: isActive ? 1 : 0,
                    x: isActive ? 0 : xOffset,
                    pointerEvents: isActive ? "auto" : "none",
                  }}
                  transition={{duration: 0.3}}
                  className={`${styles["card"]} ${isActive ? styles["cardActive"] : styles["cardInactive"]}`}
                  style={{
                    gridArea: "1 / 1 / 2 / 2",
                    zIndex: isActive ? 1 : 0,
                  }}>
                  <div className={styles["cardAccentTop"]} />

                  <div className={styles["cardHeader"]}>
                    <div>
                      <h3 className={styles["cardTitle"]}>{experience.role}</h3>
                      <div className={styles["cardCompany"]}>
                        <span>{experience.company}</span>
                      </div>
                      <div className={styles["cardLocation"]}>
                        <TbMap className={styles["cardMetaIcon"]} />
                        <span>{experience.location}</span>
                      </div>
                    </div>

                    <div className={styles["logoWrapper"]}>
                      <motion.div className={styles["logoInner"]}>{experience.logo}</motion.div>
                    </div>
                  </div>

                  <p className={styles["cardDescription"]}>{experience.description}</p>

                  {experience.responsibilities.length > 0 && (
                    <div className={styles["cardSection"]}>
                      <h4 className={styles["cardSectionTitle"]}>{t("responsibilitiesLabel")}</h4>
                      <ul className={styles["list"]}>
                        {experience.responsibilities.map((responsability, i) => (
                          <li
                            key={`${responsability.slice(0, 20)}`}
                            className={styles["listItem"]}>
                            <motion.div
                              initial={{opacity: 0, x: -10}}
                              animate={isActive ? {opacity: 1, x: 0} : {opacity: 0, x: -10}}
                              transition={{delay: i * 0.05, duration: 0.3}}
                              style={{display: "flex", alignItems: "flex-start"}}>
                              <TbChevronRight className={styles["listIcon"]} />
                              <span>{responsability}</span>
                            </motion.div>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {experience.achievements.length > 0 && (
                    <div className={styles["cardSection"]}>
                      <h4 className={styles["cardSectionTitle"]}>{t("achievementsLabel")}</h4>
                      <ul className={styles["list"]}>
                        {experience.achievements.map((achievement, i) => (
                          <li
                            key={`${achievement.slice(0, 20)}`}
                            className={styles["listItem"]}>
                            <motion.div
                              initial={{opacity: 0, x: -10}}
                              animate={isActive ? {opacity: 1, x: 0} : {opacity: 0, x: -10}}
                              transition={{delay: i * 0.05, duration: 0.3}}
                              style={{display: "flex", alignItems: "flex-start"}}>
                              <TbChevronRight className={styles["listIcon"]} />
                              <span>{achievement}</span>
                            </motion.div>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div>
                    <h4 className={styles["cardSectionTitle"]}>{t("techSkillsLabel")}</h4>
                    <div className={styles["skills"]}>
                      {experience.skills.map((skill, i) => (
                        <motion.div
                          key={`${skill.slice(0, 20)}`}
                          initial={{opacity: 0, scale: 0.8}}
                          animate={isActive ? {opacity: 1, scale: 1} : {opacity: 0, scale: 0.8}}
                          transition={{delay: i * 0.02, duration: 0.3}}>
                          <Badge
                            variant='secondary'
                            className={styles["skillBadge"]}>
                            {skill}
                          </Badge>
                        </motion.div>
                      ))}
                    </div>
                  </div>

                  <motion.div
                    className={styles["cardAccentBottom"]}
                    initial={{width: "0%"}}
                    animate={isActive ? {width: "100%"} : {width: "0%"}}
                    transition={{duration: 3, delay: 0.3}}
                  />
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
