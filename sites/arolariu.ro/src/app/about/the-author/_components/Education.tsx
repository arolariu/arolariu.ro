"use client";

import {Button} from "@arolariu/components/button";
import {Card, CardContent} from "@arolariu/components/card";
import {AnimatePresence, motion, useInView, type Variants} from "motion/react";
import {useTranslations} from "next-intl";
import {useCallback, useRef, useState} from "react";
import {TbArrowLeft, TbBook, TbBuildingCommunity, TbCalendar, TbInfoCircle, TbMap, TbSchool} from "react-icons/tb";

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
    <section className='mx-auto max-w-6xl px-4 py-20 md:px-8'>
      <motion.div
        initial={{opacity: 0, y: 20}}
        animate={{opacity: 1, y: 0}}
        transition={{duration: 0.6}}
        className='mb-16 text-center'>
        <h2 className='blue-underline relative mb-4 inline-block text-3xl font-bold md:text-4xl'>{t("title")}</h2>
        <p className='text-muted-foreground mx-auto max-w-2xl'>{t("subtitle")}</p>
      </motion.div>

      <motion.div
        ref={sectionRef}
        variants={containerVariants}
        initial='hidden'
        animate={inView ? "visible" : "hidden"}
        className='space-y-12'>
        {education.map((item, index) => (
          <motion.div
            key={item.degree}
            variants={itemVariants}
            className='perspective relative'
            data-index={index}
            onMouseEnter={handleCardMouseEnter}
            onMouseLeave={handleCardMouseLeave}>
            <div className='perspective 2xsm:h-[800px] relative w-full md:h-[400px]'>
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
                    className='absolute inset-0 h-full w-full'>
                    <Card className='h-full overflow-hidden border-none shadow-lg transition-all duration-300 hover:shadow-xl'>
                      <CardContent className='grid h-full w-full grid-cols-1 md:grid-cols-3'>
                        <div className='flex h-full w-full flex-col items-center justify-center p-6 text-center md:col-span-1'>
                          <motion.div
                            className='bg-primary/20 mb-4 flex h-20 w-20 cursor-pointer items-center justify-center rounded-full'
                            whileHover={{scale: 1.1, rotate: 5}}
                            data-index={index}
                            onClick={handleToggleFlipClick}>
                            <TbSchool className='text-primary h-10 w-10' />
                          </motion.div>
                          <h3 className='text-glow text-xl font-bold'>{item.degree}</h3>
                          <div className='text-muted-foreground mt-2 flex items-center justify-center'>
                            <TbCalendar className='mr-2 h-4 w-4' />
                            <span>{item.period}</span>
                          </div>
                          <div className='text-muted-foreground mt-1 flex items-center justify-center'>
                            <TbMap className='mr-2 h-4 w-4' />
                            <span>{item.location}</span>
                          </div>
                          <div className='text-muted-foreground mt-1 flex items-center justify-center'>
                            <TbBuildingCommunity className='mr-2 h-4 w-4' />
                            <span>{item.institution}</span>
                          </div>
                        </div>
                        <div className='flex h-full w-full flex-col p-6 md:col-span-2'>
                          <h4 className='mb-4 flex items-center text-lg font-semibold'>
                            <TbBook className='text-primary mr-2 h-5 w-5' />
                            {item.coursesTitle}
                          </h4>
                          <ul className='space-y-2'>
                            {item.courses.slice(0, 5).map((course) => (
                              <motion.li
                                key={`${item.degree}-${course}`}
                                className='flex items-start'
                                initial={{opacity: 0.7}}
                                whileHover={{
                                  opacity: 1,
                                  x: 5,
                                  transition: {duration: 0.2},
                                }}>
                                <span className='text-primary mr-2'>•</span>
                                <span>{course}</span>
                              </motion.li>
                            ))}
                          </ul>
                          <span className='text-muted-foreground mt-4'>{item.description}</span>

                          <Button
                            variant='ghost'
                            size='sm'
                            className='text-primary mt-4 w-fit'
                            data-index={index}
                            onClick={handleToggleFlipClick}>
                            <TbInfoCircle className='mr-2 h-4 w-4' />
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
                    className='absolute inset-0 h-full w-full'>
                    <Card className='h-full overflow-hidden border-none shadow-lg transition-all duration-300 hover:shadow-xl'>
                      <CardContent className='flex h-full flex-col p-6'>
                        <div className='mb-6 flex items-start justify-between'>
                          <h3 className='text-glow text-xl font-bold'>{item.institution}</h3>
                          <Button
                            variant='ghost'
                            size='sm'
                            className='text-primary'
                            data-index={index}
                            onClick={handleToggleFlipClick}>
                            <TbArrowLeft className='mr-2 h-4 w-4' />
                          </Button>
                        </div>

                        <div className='custom-scrollbar grow space-y-4 overflow-auto pr-2'>
                          <div>
                            <h4 className='mb-2 text-lg font-semibold'>{item.aboutTheProgramTitle}</h4>
                            <p>{item.aboutTheProgramDescription}</p>
                          </div>

                          <div>
                            <h4 className='mb-2 text-lg font-semibold'>{item.aboutTheProgramLearningsTitle}</h4>
                            <ul className='space-y-2'>
                              {item.aboutTheProgramLearnings.map((learning) => (
                                <motion.li
                                  key={learning.slice(0, 20)}
                                  className='flex items-start'
                                  initial={{opacity: 0.7}}
                                  whileHover={{
                                    opacity: 1,
                                    x: 5,
                                    transition: {duration: 0.2},
                                  }}>
                                  <span className='text-primary mr-2'>•</span>
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
                className='bg-primary/5 absolute inset-0 -z-10 rounded-xl blur-xl'
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
