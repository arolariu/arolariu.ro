"use client";

import {Badge} from "@arolariu/components/badge";
import {Button} from "@arolariu/components/button";
import {motion} from "motion/react";
import {useTranslations} from "next-intl-selector";
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
  const t = useTranslations();
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
      company: t((m) => m.About.Author.Experiences.microsoft3.company),
      role: t((m) => m.About.Author.Experiences.microsoft3.title),
      period: t((m) => m.About.Author.Experiences.microsoft3.period),
      location: t((m) => m.About.Author.Experiences.microsoft3.location),
      description: t((m) => m.About.Author.Experiences.microsoft3.description),
      responsibilities: t((m) => m.About.Author.Experiences.microsoft3.responsibilites)
        .split("#")
        .filter((item) => item.trim().length > 3),
      achievements: t((m) => m.About.Author.Experiences.microsoft3.achievements)
        .split("#")
        .filter((item) => item.trim().length > 3),
      skills: t((m) => m.About.Author.Experiences.microsoft3.techAndSkills)
        .split("#")
        .filter((item) => item.trim().length > 0),
      logo: <CgMicrosoft className={styles["logoIcon"]} />,
    },
    {
      company: t((m) => m.About.Author.Experiences.microsoft2.company),
      role: t((m) => m.About.Author.Experiences.microsoft2.title),
      period: t((m) => m.About.Author.Experiences.microsoft2.period),
      location: t((m) => m.About.Author.Experiences.microsoft2.location),
      description: t((m) => m.About.Author.Experiences.microsoft2.description),
      responsibilities: t((m) => m.About.Author.Experiences.microsoft2.responsibilites)
        .split("#")
        .filter((item) => item.trim().length > 3),
      achievements: t((m) => m.About.Author.Experiences.microsoft2.achievements)
        .split("#")
        .filter((item) => item.trim().length > 3),
      skills: t((m) => m.About.Author.Experiences.microsoft2.techAndSkills)
        .split("#")
        .filter((item) => item.trim().length > 0),
      logo: <CgMicrosoft className={styles["logoIcon"]} />,
    },
    {
      company: t((m) => m.About.Author.Experiences.microsoft1.company),
      role: t((m) => m.About.Author.Experiences.microsoft1.title),
      period: t((m) => m.About.Author.Experiences.microsoft1.period),
      location: t((m) => m.About.Author.Experiences.microsoft1.location),
      description: t((m) => m.About.Author.Experiences.microsoft1.description),
      responsibilities: t((m) => m.About.Author.Experiences.microsoft1.responsibilites)
        .split("#")
        .filter((item) => item.trim().length > 3),
      achievements: t((m) => m.About.Author.Experiences.microsoft1.achievements)
        .split("#")
        .filter((item) => item.trim().length > 3),
      skills: t((m) => m.About.Author.Experiences.microsoft1.techAndSkills)
        .split("#")
        .filter((item) => item.trim().length > 0),
      logo: <CgMicrosoft className={styles["logoIcon"]} />,
    },
    {
      company: t((m) => m.About.Author.Experiences.intel.company),
      role: t((m) => m.About.Author.Experiences.intel.title),
      period: t((m) => m.About.Author.Experiences.intel.period),
      location: t((m) => m.About.Author.Experiences.intel.location),
      description: t((m) => m.About.Author.Experiences.intel.description),
      responsibilities: t((m) => m.About.Author.Experiences.intel.responsibilites)
        .split("#")
        .filter((item) => item.trim().length > 3),
      achievements: t((m) => m.About.Author.Experiences.intel.achievements)
        .split("#")
        .filter((item) => item.trim().length > 3),
      skills: t((m) => m.About.Author.Experiences.intel.techAndSkills)
        .split("#")
        .filter((item) => item.trim().length > 0),
      logo: <SiIntel className={styles["logoIcon"]} />,
    },
    {
      company: t((m) => m.About.Author.Experiences.ubisoft.company),
      role: t((m) => m.About.Author.Experiences.ubisoft.title),
      period: t((m) => m.About.Author.Experiences.ubisoft.period),
      location: t((m) => m.About.Author.Experiences.ubisoft.location),
      description: t((m) => m.About.Author.Experiences.ubisoft.description),
      responsibilities: t((m) => m.About.Author.Experiences.ubisoft.responsibilites)
        .split("#")
        .filter((item) => item.trim().length > 3),
      achievements: t((m) => m.About.Author.Experiences.ubisoft.achievements)
        .split("#")
        .filter((item) => item.trim().length > 3),
      skills: t((m) => m.About.Author.Experiences.ubisoft.techAndSkills)
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
          <h2 className={`blue-underline ${styles["title"]}`}>{t((m) => m.About.Author.Experiences.title)}</h2>
          <p className={styles["subtitle"]}>{t((m) => m.About.Author.Experiences.subtitle)}</p>
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
                      <h4 className={styles["cardSectionTitle"]}>{t((m) => m.About.Author.Experiences.responsibilitiesLabel)}</h4>
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
                      <h4 className={styles["cardSectionTitle"]}>{t((m) => m.About.Author.Experiences.achievementsLabel)}</h4>
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
                    <h4 className={styles["cardSectionTitle"]}>{t((m) => m.About.Author.Experiences.techSkillsLabel)}</h4>
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
