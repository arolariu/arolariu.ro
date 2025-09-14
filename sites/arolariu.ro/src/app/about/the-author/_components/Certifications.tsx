"use client";

import {Badge} from "@arolariu/components/badge";
import {motion, useInView, type Variants} from "motion/react";
import {useTranslations} from "next-intl";
import {useRef} from "react";
import {TbAward, TbCheck, TbExternalLink} from "react-icons/tb";

type CertificationType = {
  name: string;
  code: string;
  issuer: string;
  issueDate: string;
  description: string;
  coreSkills: string[];
  link: string;
};

const containerVariants: Variants = {
  hidden: {opacity: 0},
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.15,
    },
  },
};

const itemVariants: Variants = {
  hidden: {opacity: 0, y: 20},
  visible: {opacity: 1, y: 0, transition: {duration: 0.6}},
};

/**
 * @description This component renders a section showcasing professional certifications.
 * @returns A section containing certification cards with interactive elements
 */
export default function Certifications(): React.JSX.Element {
  const t = useTranslations("About.Author.Certifications");
  const sectionRef = useRef<HTMLElement | null>(null);
  const inView = useInView(sectionRef, {amount: 0.1, once: false});

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

  return (
    <section
      ref={sectionRef}
      className='bg-muted/30 px-4 py-20 md:px-8'>
      <div className='mx-auto max-w-6xl'>
        <motion.div
          initial={{opacity: 0, y: 20}}
          animate={{opacity: 1, y: 0}}
          transition={{duration: 0.6}}
          className='mb-16 text-center'>
          <h2 className='blue-underline relative mb-4 inline-block text-3xl font-bold md:text-4xl'>Certifications</h2>
          <p className='text-muted-foreground mx-auto max-w-2xl'>
            Professional certifications and credentials that Alexandru has earned throughout his career.
          </p>
        </motion.div>

        <motion.div
          variants={containerVariants}
          initial='hidden'
          animate={inView ? "visible" : "hidden"}
          className='grid gap-8 md:grid-cols-2 lg:grid-cols-3'>
          {certifications.map((cert) => (
            <motion.div
              key={cert.code}
              variants={itemVariants}
              className='group relative'
              whileHover={{
                scale: 1.03,
                transition: {duration: 0.2},
              }}>
              <div className='border-border/50 bg-card hover:border-primary/30 relative h-[600px] overflow-hidden rounded-xl border p-6 shadow-md transition-all duration-300 hover:shadow-xl'>
                <div className='mb-4 flex items-start justify-between'>
                  <div className='bg-primary/10 text-primary rounded-lg p-3'>
                    <TbAward className='h-6 w-6' />
                  </div>
                  <Badge
                    variant='outline'
                    className='border-primary text-primary'>
                    {cert.code}
                  </Badge>
                </div>

                <h3 className='group-hover:text-glow mb-2 text-xl font-semibold'>{cert.name}</h3>

                <div className='text-muted-foreground mb-4 flex items-center text-sm'>
                  <span>{cert.issuer}</span>
                  <span className='mx-2'>•</span>
                  <span>{cert.issueDate}</span>
                </div>

                <div className='custom-scrollbar h-[350px] overflow-y-auto pr-2'>
                  <p className='text-muted-foreground mb-4 text-sm'>{cert.description}</p>

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
                          <TbCheck className='text-primary mr-2 h-4 w-4 shrink-0' />
                          <span className='text-sm'>{skill}</span>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className='absolute right-6 bottom-6 left-6 mt-4 flex items-center justify-between'>
                  <motion.a
                    href={cert.link}
                    target='_blank'
                    rel='noopener noreferrer'
                    className='text-primary inline-flex items-center text-sm hover:underline'
                    whileHover={{x: 5}}>
                    View certification
                    <TbExternalLink className='ml-1 h-3 w-3' />
                  </motion.a>
                </div>

                <motion.div
                  className='bg-primary absolute bottom-0 left-0 h-1'
                  initial={{width: "0%"}}
                  transition={{duration: 0.3}}
                />
              </div>

              <motion.div
                className='bg-primary/5 absolute inset-0 -z-10 rounded-xl blur-xl'
                initial={{opacity: 0}}
                animate={{opacity: 1}}
                exit={{opacity: 0}}
                transition={{duration: 0.3}}
              />
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
