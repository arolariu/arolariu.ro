"use client";

import {Badge} from "@arolariu/components/badge";
import {motion, useInView, type Variants} from "motion/react";
import {useTranslations} from "next-intl";
import {useRef} from "react";
import {TbAward, TbCheck, TbExternalLink} from "react-icons/tb";
import styles from "./Certifications.module.scss";

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
      className={styles["section"]}>
      <div className={styles["container"]}>
        <motion.div
          initial={{opacity: 0, y: 20}}
          animate={{opacity: 1, y: 0}}
          transition={{duration: 0.6}}
          className={styles["header"]}>
          <h2 className={`blue-underline ${styles["title"]}`}>{t("title")}</h2>
          <p className={styles["subtitle"]}>{t("subtitle")}</p>
        </motion.div>

        <motion.div
          variants={containerVariants}
          initial='hidden'
          animate={inView ? "visible" : "hidden"}
          className={styles["grid"]}>
          {certifications.map((cert) => (
            <motion.div
              key={cert.code}
              variants={itemVariants}
              className={styles["cardWrapper"]}
              whileHover={{
                scale: 1.03,
                transition: {duration: 0.2},
              }}>
              <div className={styles["card"]}>
                <div className={styles["cardHeader"]}>
                  <div className={styles["awardIconWrapper"]}>
                    <TbAward className={styles["awardIcon"]} />
                  </div>
                  <Badge
                    variant='outline'
                    className={styles["codeBadge"]}>
                    {cert.code}
                  </Badge>
                </div>

                <h3 className={styles["cardTitle"]}>{cert.name}</h3>

                <div className={styles["issuerInfo"]}>
                  <span>{cert.issuer}</span>
                  <span className={styles["issuerSeparator"]}>•</span>
                  <span>{cert.issueDate}</span>
                </div>

                <div className={styles["scrollContent"]}>
                  <p className={styles["description"]}>{cert.description}</p>

                  <div className={styles["skillsSection"]}>
                    <h4 className={styles["skillsTitle"]}>{t("coreSkillsLabel")}</h4>
                    <div className={styles["skillsList"]}>
                      {cert.coreSkills.map((skill, i) => (
                        <motion.div
                          key={`${skill.slice(0, 10)}`}
                          className={styles["skillItem"]}
                          initial={{opacity: 0, x: -10}}
                          animate={{opacity: 1, x: 0}}
                          transition={{delay: i * 0.1, duration: 0.3}}>
                          <TbCheck className={styles["skillIcon"]} />
                          <span className={styles["skillText"]}>{skill}</span>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className={styles["cardFooter"]}>
                  <motion.a
                    href={cert.link}
                    target='_blank'
                    rel='noopener noreferrer'
                    className={styles["viewLink"]}
                    whileHover={{x: 5}}>
                    {t("viewCertification")}
                    <TbExternalLink className={styles["viewLinkIcon"]} />
                  </motion.a>
                </div>

                <motion.div
                  className={styles["progressBar"]}
                  initial={{width: "0%"}}
                  transition={{duration: 0.3}}
                />
              </div>

              <motion.div
                className={styles["glowEffect"]}
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
