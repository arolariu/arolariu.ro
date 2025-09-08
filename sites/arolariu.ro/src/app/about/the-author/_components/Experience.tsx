/** @format */

"use client";

import {Badge} from "@arolariu/components/badge";
import {AnimatePresence, motion} from "motion/react";
import {useTranslations} from "next-intl";
import React, {useCallback, useState} from "react";
import {CgMicrosoft} from "react-icons/cg";
import {SiIntel, SiUbisoft} from "react-icons/si";
import {TbBriefcase, TbCalendar, TbChevronRight, TbMap} from "react-icons/tb";

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
      logo: <CgMicrosoft className='text-muted-foreground h-10 w-10' />,
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
      logo: <CgMicrosoft className='text-muted-foreground h-10 w-10' />,
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
      logo: <CgMicrosoft className='text-muted-foreground h-10 w-10' />,
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
      logo: <SiIntel className='text-muted-foreground h-10 w-10' />,
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
      logo: <SiUbisoft className='text-muted-foreground h-10 w-10' />,
    },
  ] satisfies ExperienceType[];

  const currentExperience = experiences.at(activeExpIndex)!;

  return (
    <section className='bg-muted/30 px-4 py-20 md:px-8'>
      <div className='mx-auto max-w-6xl'>
        <motion.div
          initial={{opacity: 0, y: 20}}
          animate={{opacity: 1, y: 0}}
          transition={{duration: 0.6}}
          className='mb-16 text-center'>
          <h2 className='blue-underline relative mb-4 inline-block text-3xl font-bold md:text-4xl'>{t("title")}</h2>
          <p className='text-muted-foreground mx-auto max-w-2xl'>{t("subtitle")}</p>
        </motion.div>

        <div className='grid gap-8 md:grid-cols-[1fr_2fr]'>
          {/* Timeline Navigation */}
          <div className='relative'>
            <div className='bg-border/50 absolute top-0 bottom-0 left-8 w-px' />

            {experiences.map((experience, index) => (
              <motion.div
                key={`${experience.company}-${experience.period}`}
                className='relative mb-8 last:mb-0'
                initial={{opacity: 0, x: -20}}
                animate={{opacity: 1, x: 0}}
                transition={{delay: index * 0.1, duration: 0.5}}>
                <button
                  type='button'
                  data-index={index}
                  onClick={handleExperienceClick}
                  className={`relative flex items-start pl-16 ${activeExpIndex === index ? "opacity-100" : "opacity-70 hover:opacity-100"} transition-opacity duration-300`}>
                  <div
                    className={`absolute left-0 z-10 flex h-16 w-16 items-center justify-center rounded-full transition-all duration-300 ${activeExpIndex === index ? "bg-primary/20" : "bg-muted"}`}>
                    <div
                      className={`flex h-10 w-10 items-center justify-center rounded-full ${activeExpIndex === index ? "bg-primary text-white" : "bg-background text-muted-foreground"}`}>
                      <TbBriefcase className='h-5 w-5' />
                    </div>
                  </div>

                  <div className='text-left'>
                    <h3 className={`text-xl font-bold transition-colors duration-300 ${activeExpIndex === index ? "text-glow" : ""}`}>
                      {experience.company}
                    </h3>
                    <p className='text-muted-foreground'>{experience.role}</p>
                    <div className='text-muted-foreground mt-1 flex items-center text-sm'>
                      <TbCalendar className='mr-1 h-3 w-3' />
                      <span>{experience.period}</span>
                    </div>
                  </div>
                </button>
              </motion.div>
            ))}
          </div>

          {/* Timeline Content */}
          <div className='relative h-full'>
            <AnimatePresence mode='wait'>
              <motion.div
                initial={{opacity: 0, x: 20}}
                animate={{opacity: 1, x: 0}}
                exit={{opacity: 0, x: -20}}
                transition={{duration: 0.3}}
                className='border-border/50 bg-card relative top-0 left-0 h-full w-full overflow-hidden rounded-xl border p-6 shadow-lg'>
                <div className='absolute top-0 left-0 h-1 w-full bg-linear-to-r from-pink-500 via-purple-500 to-blue-500' />

                <div className='mb-6 flex items-start justify-between'>
                  <div>
                    <h3 className='text-glow text-2xl font-bold'>{currentExperience.role}</h3>
                    <div className='text-muted-foreground mt-1 flex items-center'>
                      <span className='font-medium'>{currentExperience.company}</span>
                    </div>
                    <div className='text-muted-foreground mt-1 flex items-center text-sm'>
                      <TbMap className='mr-1 h-3 w-3' />
                      <span>{currentExperience.location}</span>
                    </div>
                  </div>

                  <div className='bg-background flex h-16 w-16 items-center justify-center rounded-lg'>
                    <motion.div className='bg-background text-muted-foreground flex h-10 w-10 items-center justify-center rounded-full transition-colors duration-300'>
                      {currentExperience.logo}
                    </motion.div>
                  </div>
                </div>

                <p className='text-muted-foreground mb-6'>{currentExperience.description}</p>

                <div className='mb-6'>
                  <h4 className='mb-3 text-lg font-semibold'>Responsibilites</h4>
                  <ul className='space-y-2'>
                    {currentExperience.responsibilities.map((responsability, i) => (
                      <motion.li
                        key={`${responsability.slice(0, 20)}`}
                        className='flex items-start'
                        initial={{opacity: 0, x: -10}}
                        animate={{opacity: 1, x: 0}}
                        transition={{delay: i * 0.1, duration: 0.3}}>
                        <TbChevronRight className='text-primary mt-1 mr-2 h-4 w-4 shrink-0' />
                        <span>{responsability}</span>
                      </motion.li>
                    ))}
                  </ul>
                </div>

                <div className='mb-6'>
                  <h4 className='mb-3 text-lg font-semibold'>Achievements</h4>
                  <ul className='space-y-2'>
                    {currentExperience.achievements.map((achievement, i) => (
                      <motion.li
                        key={`${achievement.slice(0, 20)}`}
                        className='flex items-start'
                        initial={{opacity: 0, x: -10}}
                        animate={{opacity: 1, x: 0}}
                        transition={{delay: i * 0.1, duration: 0.3}}>
                        <TbChevronRight className='text-primary mt-1 mr-2 h-4 w-4 shrink-0' />
                        <span>{achievement}</span>
                      </motion.li>
                    ))}
                  </ul>
                </div>

                <div>
                  <h4 className='mb-3 text-lg font-semibold'>Technologies & Skills</h4>
                  <div className='flex flex-wrap gap-2'>
                    {currentExperience.skills.map((skill, i) => (
                      <motion.div
                        key={`${skill.slice(0, 20)}`}
                        initial={{opacity: 0, scale: 0.8}}
                        animate={{opacity: 1, scale: 1}}
                        transition={{delay: i * 0.5, duration: 0.3}}>
                        <Badge
                          variant='secondary'
                          className='hover:bg-primary font-normal transition-colors duration-300 hover:text-white'>
                          {skill}
                        </Badge>
                      </motion.div>
                    ))}
                  </div>
                </div>

                <motion.div
                  className='absolute bottom-0 left-0 h-1 bg-linear-to-r from-blue-500 via-purple-500 to-pink-500'
                  initial={{width: "0%"}}
                  animate={{width: "100%"}}
                  transition={{duration: 3, delay: 0.3}}
                />
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </section>
  );
}
