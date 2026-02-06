"use client";

import {Button} from "@arolariu/components";
import {motion, useInView} from "motion/react";
import {useTranslations} from "next-intl";
import Link from "next/link";
import {useRef} from "react";
import {TbBrandGithub, TbMail} from "react-icons/tb";
import styles from "./CallToAction.module.scss";

/**
 * Call-to-action section at the bottom of the About hub page.
 */
export default function CallToAction(): React.JSX.Element {
  const t = useTranslations("About.Hub.cta");
  const ref = useRef<HTMLElement>(null);
  const isInView = useInView(ref, {once: true, margin: "-100px"});

  return (
    <section
      ref={ref}
      className={styles["section"]}>
      {/* Animated background */}
      <main className={styles["bgOrbs"]}>
        <motion.div
          className={styles["orbBlue"]}
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.3, 0.5, 0.3],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
        <motion.div
          className={styles["orbPurple"]}
          animate={{
            scale: [1.2, 1, 1.2],
            opacity: [0.3, 0.5, 0.3],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      </main>

      {/* Grid pattern */}
      <main
        className={styles["gridPattern"]}
        aria-hidden='true'
      />

      {/* Content */}
      <main className={styles["content"]}>
        <motion.div
          initial={{opacity: 0, y: 20}}
          animate={isInView ? {opacity: 1, y: 0} : {}}
          transition={{duration: 0.6}}>
          <h2 className={styles["title"]}>
            <span className={styles["titleGradient"]}>{t("title")}</span>
          </h2>
          <p className={styles["subtitle"]}>{t("subtitle")}</p>
        </motion.div>

        {/* CTA buttons */}
        <motion.div
          className={styles["cta"]}
          initial={{opacity: 0, y: 20}}
          animate={isInView ? {opacity: 1, y: 0} : {}}
          transition={{delay: 0.2, duration: 0.5}}>
          <Button
            asChild
            size='lg'
            className={styles["ctaButton"]}>
            <a
              href='https://github.com/arolariu/arolariu.ro'
              target='_blank'
              rel='noopener noreferrer'>
              <TbBrandGithub className={styles["ctaIcon"]} />
              {t("primary")}
            </a>
          </Button>
          <Button
            asChild
            variant='outline'
            size='lg'
            className={styles["ctaButton"]}>
            <Link href='/about/the-author#contact'>
              <TbMail className={styles["ctaIcon"]} />
              {t("secondary")}
            </Link>
          </Button>
        </motion.div>

        {/* Footer text */}
        <motion.p
          className={styles["footer"]}
          initial={{opacity: 0}}
          animate={isInView ? {opacity: 1} : {}}
          transition={{delay: 0.4, duration: 0.5}}>
          {t("footer")}
        </motion.p>
      </main>
    </section>
  );
}
