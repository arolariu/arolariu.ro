/** @format */

"use client";

import {motion, useInView, type Variants} from "motion/react";
import {useTranslations} from "next-intl";
import {useRef} from "react";
import {TbBook2, TbBrain, TbCalculator, TbCheck, TbTestPipe, TbUsers} from "react-icons/tb";

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
      icon: <TbCalculator className='h-8 w-8' />,
      description: t("competences.algorithmicSkills.description"),
    },
    {
      title: t("competences.testDrivenDevelopment.title"),
      icon: <TbTestPipe className='h-8 w-8' />,
      description: t("competences.testDrivenDevelopment.description"),
    },
    {
      title: t("competences.domainDrivenDesign.title"),
      icon: <TbBook2 className='h-8 w-8' />,
      description: t("competences.domainDrivenDesign.description"),
    },
    {
      title: t("competences.agileMethodologies.title"),
      icon: <TbUsers className='h-8 w-8' />,
      description: t("competences.agileMethodologies.description"),
    },
    {
      title: t("competences.customerCentric.title"),
      icon: <TbBrain className='h-8 w-8' />,
      description: t("competences.customerCentric.description"),
    },
    {
      title: t("competences.engineeringExcellence.title"),
      icon: <TbCheck className='h-8 w-8' />,
      description: t("competences.engineeringExcellence.description"),
    },
  ];

  return (
    <section className='mx-auto max-w-6xl px-4 py-20 md:px-8'>
      <motion.div
        initial={{opacity: 0, y: 20}}
        animate={inView ? {opacity: 1, y: 0} : {opacity: 0, y: 20}}
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
        className='grid gap-8 md:grid-cols-2 lg:grid-cols-3'>
        {skills.map((skill) => (
          <motion.div
            key={skill.title}
            variants={itemVariants}
            className='group'
            whileHover={{
              scale: 1.03,
              transition: {duration: 0.2},
            }}>
            <div className='border-border/50 bg-card hover:border-primary/30 hover:bg-card/80 relative h-full overflow-hidden rounded-xl border p-6 shadow-md transition-all duration-300 hover:shadow-xl'>
              <div className='from-primary to-primary/30 absolute top-0 left-0 h-1 w-full bg-linear-to-r' />
              <div className='mb-4 flex items-center gap-4'>
                <div className='bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground rounded-lg p-3 transition-colors duration-300'>
                  {skill.icon}
                </div>
                <h3 className='group-hover:text-glow text-xl font-semibold'>{skill.title}</h3>
              </div>
              <p className='text-muted-foreground'>{skill.description}</p>
            </div>
          </motion.div>
        ))}
      </motion.div>
    </section>
  );
}
