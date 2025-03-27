/** @format */

"use client";

import {Badge} from "@arolariu/components";
import {motion} from "motion/react";
import {useTranslations} from "next-intl";
import {useState} from "react";
import {TbAward, TbCheck, TbChevronDown, TbChevronUp, TbExternalLink} from "react-icons/tb";
import {useInView} from "react-intersection-observer";

type CertificationType = {
  name: string;
  code: string;
  issuer: string;
  issueDate: string;
  description: string;
  coreSkills: string[];
  link: string;
};

/**
 * @description This component renders a section showcasing professional certifications.
 * @returns A section containing certification cards with interactive elements
 */
export default function Certifications() {
  const t = useTranslations("About.Author.Certifications");
  const [ref, inView] = useInView({
    triggerOnce: false,
    threshold: 0.1,
  });

  const [hoveredCert, setHoveredCert] = useState<number | null>(null);
  const [expandedCerts, setExpandedCerts] = useState<number[]>([]);

  const toggleExpand = (index: number) => {
    if (expandedCerts.includes(index)) {
      setExpandedCerts(expandedCerts.filter((i) => i !== index));
    } else {
      setExpandedCerts([...expandedCerts, index]);
    }
  };

  const certifications = [
    {
      name: t("certificates.az900.name"),
      code: t("certificates.az900.code"),
      issuer: t("certificates.az900.issuer"),
      issueDate: t("certificates.az900.issuerDate"),
      description: t("certificates.az900.description"),
      coreSkills: t("certificates.az900.coreSkills")
        .split("#")
        .filter((skill) => skill.trim().length > 3),
      link: "https://learn.microsoft.com/en-us/certifications/azure-fundamentals/",
    },
    {
      name: t("certificates.ai900.name"),
      code: t("certificates.ai900.code"),
      issuer: t("certificates.ai900.issuer"),
      issueDate: t("certificates.ai900.issuerDate"),
      description: t("certificates.ai900.description"),
      coreSkills: t("certificates.ai900.coreSkills")
        .split("#")
        .filter((skill) => skill.trim().length > 3),
      link: "https://learn.microsoft.com/en-us/certifications/azure-ai-fundamentals/",
    },
  ] satisfies CertificationType[];

  const containerVariants = {
    hidden: {opacity: 0},
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15,
      },
    },
  };

  const itemVariants = {
    hidden: {opacity: 0, y: 20},
    visible: {opacity: 1, y: 0, transition: {duration: 0.6}},
  };

  return (
    <section
      ref={ref}
      className='bg-muted/30 px-4 py-20 md:px-8'>
      <div className='mx-auto max-w-6xl'>
        <motion.div
          initial={{opacity: 0, y: 20}}
          animate={{opacity: 1, y: 0}}
          transition={{duration: 0.6}}
          className='mb-16 text-center'>
          <h2 className='blue-underline relative mb-4 inline-block text-3xl font-bold md:text-4xl'>Certifications</h2>
          <p className='mx-auto max-w-2xl text-muted-foreground'>
            Professional certifications and credentials that Alexandru has earned throughout his career.
          </p>
        </motion.div>

        <motion.div
          variants={containerVariants}
          initial='hidden'
          animate={inView ? "visible" : "hidden"}
          className='grid gap-8 md:grid-cols-3'>
          {certifications.map((cert, index) => (
            <motion.div
              key={cert.code}
              variants={itemVariants}
              className='group relative'
              onHoverStart={() => setHoveredCert(index)}
              onHoverEnd={() => setHoveredCert(null)}
              whileHover={{
                scale: 1.03,
                transition: {duration: 0.2},
              }}>
              <div className='relative h-[600px] overflow-hidden rounded-xl border border-border/50 bg-card p-6 shadow-md transition-all duration-300 hover:border-primary/30 hover:shadow-xl'>
                <div className='mb-4 flex items-start justify-between'>
                  <div className='rounded-lg bg-primary/10 p-3 text-primary'>
                    <TbAward className='h-6 w-6' />
                  </div>
                  <Badge
                    variant='outline'
                    className='border-primary text-primary'>
                    {cert.code}
                  </Badge>
                </div>

                <h3 className='group-hover:text-glow mb-2 text-xl font-semibold'>{cert.name}</h3>

                <div className='mb-4 flex items-center text-sm text-muted-foreground'>
                  <span>{cert.issuer}</span>
                  <span className='mx-2'>•</span>
                  <span>{cert.issueDate}</span>
                </div>

                <div className='custom-scrollbar h-[350px] overflow-y-auto pr-2'>
                  <p className='mb-4 text-sm text-muted-foreground'>{cert.description}</p>

                  {expandedCerts.includes(index) && (
                    <div className='mt-4'>
                      <h4 className='mb-2 text-sm font-semibold'>Core Skills Demonstrated:</h4>
                      <div className='space-y-2'>
                        {cert.coreSkills.map((skill, i) => (
                          <motion.div
                            key={`${skill.slice(0, 10)}`}
                            className='flex items-center'
                            initial={{opacity: 0, x: -10}}
                            animate={{opacity: 1, x: 0}}
                            transition={{delay: i * 0.1, duration: 0.3}}>
                            <TbCheck className='mr-2 h-4 w-4 flex-shrink-0 text-primary' />
                            <span className='text-sm'>{skill}</span>
                          </motion.div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className='absolute bottom-6 left-6 right-6 mt-4 flex items-center justify-between'>
                  <motion.a
                    href={cert.link}
                    target='_blank'
                    rel='noopener noreferrer'
                    className='inline-flex items-center text-sm text-primary hover:underline'
                    whileHover={{x: 5}}>
                    View certification
                    <TbExternalLink className='ml-1 h-3 w-3' />
                  </motion.a>

                  <motion.button
                    onClick={() => toggleExpand(index)}
                    className='flex items-center text-sm text-primary'
                    whileHover={{scale: 1.1}}>
                    {expandedCerts.includes(index) ? (
                      <>
                        <span className='mr-1'>Less</span>
                        <TbChevronUp className='h-4 w-4' />
                      </>
                    ) : (
                      <>
                        <span className='mr-1'>More</span>
                        <TbChevronDown className='h-4 w-4' />
                      </>
                    )}
                  </motion.button>
                </div>

                <motion.div
                  className='absolute bottom-0 left-0 h-1 bg-primary'
                  initial={{width: "0%"}}
                  animate={{width: hoveredCert === index ? "100%" : "0%"}}
                  transition={{duration: 0.3}}
                />
              </div>

              {hoveredCert === index && (
                <motion.div
                  className='absolute inset-0 -z-10 rounded-xl bg-primary/5 blur-xl'
                  initial={{opacity: 0}}
                  animate={{opacity: 1}}
                  exit={{opacity: 0}}
                  transition={{duration: 0.3}}
                />
              )}
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
