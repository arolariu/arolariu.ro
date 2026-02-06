"use client";

import {Card, CardContent, CardDescription, CardHeader, CardTitle} from "@arolariu/components/card";
import {motion, useInView, type Variants} from "motion/react";
import {useTranslations} from "next-intl";
import {useCallback, useRef, useState} from "react";
import {TbBrandGithub, TbBrandLinkedin, TbCheck, TbCopy, TbExternalLink, TbMail, TbWorld} from "react-icons/tb";
import styles from "./Contact.module.scss";

const contactLinks = [
  {
    id: "email",
    label: "admin@arolariu.ro",
    icon: <TbMail className='h-5 w-5' />,
    href: "mailto:admin@arolariu.ro",
    color: "#D14836",
  },
  {
    id: "linkedin",
    label: "/olariu-alexandru",
    icon: <TbBrandLinkedin className='h-5 w-5' />,
    href: "https://www.linkedin.com/in/olariu-alexandru/",
    color: "#0077B5",
  },
  {
    id: "github",
    label: "/arolariu",
    icon: <TbBrandGithub className='h-5 w-5' />,
    href: "https://github.com/arolariu",
    color: "#333",
  },
  {
    id: "website",
    label: "arolariu.ro",
    icon: <TbWorld className='h-5 w-5' />,
    href: "https://arolariu.ro",
    color: "#1e90ff",
  },
];

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
 * @description CSR'ed component that displays the author's contact information and collaboration interests.
 * @returns A section containing cards with contact information and collaboration opportunities
 */
export default function Contact(): React.JSX.Element {
  const t = useTranslations("About.Author.Contact");
  const sectionRef = useRef<HTMLDivElement | null>(null);
  const inView = useInView(sectionRef, {amount: 0.1, once: false});
  const [copiedEmail, setCopiedEmail] = useState<boolean>(false);
  const [hoveredLink, setHoveredLink] = useState<string | null>(null);

  const copyEmail = useCallback(() => {
    navigator.clipboard.writeText("admin@arolariu.ro");
    setCopiedEmail(true);
    setTimeout(() => setCopiedEmail(false), 2000);
  }, []);

  const handleLinkMouseEnter = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const {id} = (e.currentTarget as HTMLDivElement).dataset;
    if (id) {
      setHoveredLink(id);
    }
  }, []);

  const handleLinkMouseLeave = useCallback(() => {
    setHoveredLink(null);
  }, []);

  return (
    <section className={styles["section"]}>
      <motion.div
        initial={{opacity: 0, y: 20}}
        animate={{opacity: 1, y: 0}}
        transition={{duration: 0.6}}
        className={styles["header"]}>
        <h2 className={`blue-underline ${styles["title"]}`}>{t("title")}</h2>
        <span className={styles["subtitle"]}>{t("subtitle")}</span>
      </motion.div>

      <motion.div
        ref={sectionRef}
        variants={containerVariants}
        initial='hidden'
        animate={inView ? "visible" : "hidden"}
        className={styles["grid"]}>
        <motion.div variants={itemVariants}>
          <Card className={styles["card"]}>
            <main className={styles["cardAccent"]} />

            <CardHeader>
              <CardTitle className={styles["cardTitle"]}>{t("socials.title")}</CardTitle>
              <CardDescription>{t("socials.subtitle")}</CardDescription>
            </CardHeader>

            <CardContent className={styles["linksContainer"]}>
              <main className={styles["linksGrid"]}>
                {contactLinks.map((link, index) => (
                  <motion.div
                    key={link.id}
                    initial={{opacity: 0, x: -20}}
                    animate={{opacity: 1, x: 0}}
                    transition={{delay: index * 0.1, duration: 0.5}}
                    data-id={link.id}
                    onMouseEnter={handleLinkMouseEnter}
                    onMouseLeave={handleLinkMouseLeave}
                    className={styles["linkItemWrapper"]}>
                    <main
                      className={`${styles["linkBg"]} ${hoveredLink === link.id ? styles["linkBgActive"] : ""}`}
                      style={{backgroundColor: link.color}}
                    />

                    <main className={styles["linkContent"]}>
                      <main className={styles["linkInfo"]}>
                        <main
                          className={styles["linkIconWrapper"]}
                          style={{
                            backgroundColor: hoveredLink === link.id ? link.color : "rgba(var(--primary), 0.1)",
                            color: hoveredLink === link.id ? "white" : "hsl(var(--primary))",
                          }}>
                          {link.icon}
                        </main>
                        <span className={styles["linkLabel"]}>{link.label}</span>
                      </main>

                      <main className={styles["linkActions"]}>
                        {link.id === "email" && (
                          <motion.button
                            onClick={copyEmail}
                            className={styles["actionButton"]}
                            whileHover={{scale: 1.1}}
                            whileTap={{scale: 0.95}}>
                            {copiedEmail ? <TbCheck className={styles["actionIcon"]} /> : <TbCopy className={styles["actionIcon"]} />}
                          </motion.button>
                        )}

                        <motion.a
                          href={link.href}
                          target={link.id === "email" ? undefined : "_blank"}
                          rel={link.id === "email" ? undefined : "noopener noreferrer"}
                          className={styles["actionButton"]}
                          whileHover={{scale: 1.1}}
                          whileTap={{scale: 0.95}}>
                          <TbExternalLink className={styles["actionIcon"]} />
                        </motion.a>
                      </main>

                      <motion.div
                        className={styles["linkProgress"]}
                        initial={{width: "0%"}}
                        animate={{width: hoveredLink === link.id ? "100%" : "0%"}}
                        transition={{duration: 0.3}}
                      />
                    </main>
                  </motion.div>
                ))}
              </main>

              <main className={styles["linksFooter"]}>
                <span className={styles["linksFooterText"]}>{t("socials.footer")}</span>
              </main>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={itemVariants}>
          <Card className={styles["collaborateCard"]}>
            <main className={styles["gridPattern"]} />
            <main className={styles["cardAccent"]} />

            <CardHeader>
              <CardTitle className={styles["cardTitle"]}>{t("collaborate.title")}</CardTitle>
              <CardDescription>{t("collaborate.subtitle")}</CardDescription>
            </CardHeader>

            <CardContent>
              <main className={styles["disciplinesGrid"]}>
                {[
                  t("collaborate.discipline1"),
                  t("collaborate.discipline2"),
                  t("collaborate.discipline3"),
                  t("collaborate.discipline4"),
                ].map((field, index) => (
                  <motion.div
                    key={field}
                    initial={{opacity: 0, scale: 0.8}}
                    animate={{opacity: 1, scale: 1}}
                    transition={{delay: index * 0.1, duration: 2.5}}
                    whileHover={{scale: 1.05, transition: {duration: 0.3}}}
                    className={styles["disciplineItem"]}>
                    <span className={styles["disciplineText"]}>{field}</span>
                  </motion.div>
                ))}
              </main>

              <p className={styles["footerText"]}>{t("collaborate.footer")}</p>

              <motion.div
                initial={{opacity: 0}}
                animate={{opacity: 1}}
                transition={{delay: 0.5, duration: 1}}
                className={styles["ctaWrapper"]}>
                <motion.div
                  animate={{
                    scale: [1, 1.05, 1],
                    rotate: [0, 2, 0, -2, 0],
                  }}
                  transition={{
                    duration: 4,
                    repeat: Number.POSITIVE_INFINITY,
                    repeatType: "reverse",
                  }}>
                  <h3 className={styles["ctaText"]}>{t("footer")}</h3>
                </motion.div>
              </motion.div>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>
    </section>
  );
}
