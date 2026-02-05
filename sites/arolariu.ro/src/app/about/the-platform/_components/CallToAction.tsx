"use client";

import {BackgroundBeams} from "@arolariu/components/background-beams";
import {Button} from "@arolariu/components/button";
import {motion, useInView} from "motion/react";
import {useTranslations} from "next-intl";
import Link from "next/link";
import {useRef} from "react";
import {TbArrowRight, TbBrandGithub, TbMail, TbRocket, TbUser} from "react-icons/tb";
import styles from "./CallToAction.module.scss";

const trustAccentClassMap = {
  openSource: "trustAccentBlue",
  privacyFirst: "trustAccentPurple",
  freeToUse: "trustAccentOrange",
} as const;

const trustIds = ["openSource", "privacyFirst", "freeToUse"] as const;

/**
 * Call-to-Action component for the Platform page footer.
 * Features an engaging CTA section with animated background and multiple action buttons.
 * @returns The CallToAction component, CSR'ed.
 */
export default function CallToAction(): React.JSX.Element {
  const t = useTranslations("About.Platform.callToAction");
  const ref = useRef<HTMLElement>(null);
  const isInView = useInView(ref, {once: true, margin: "-100px"});

  return (
    <section
      ref={ref}
      className={styles["section"]}>
      {/* Background */}
      <div className={styles["bgLayer"]}>
        {/* Gradient base */}
        <div className={styles["bgGradient"]} />

        {/* Animated gradient orbs */}
        <motion.div
          className={styles["bgOrbs"]}
          initial={{opacity: 0}}
          animate={isInView ? {opacity: 1} : {}}
          transition={{duration: 1}}>
          <motion.div
            className={styles["orbPrimary"]}
            animate={{
              scale: [1, 1.2, 1],
              x: [0, 30, 0],
              y: [0, -20, 0],
            }}
            transition={{
              duration: 10,
              repeat: Number.POSITIVE_INFINITY,
              repeatType: "reverse",
            }}
          />
          <motion.div
            className={styles["orbSecondary"]}
            animate={{
              scale: [1, 1.3, 1],
              x: [0, -40, 0],
              y: [0, 30, 0],
            }}
            transition={{
              duration: 12,
              repeat: Number.POSITIVE_INFINITY,
              repeatType: "reverse",
            }}
          />
        </motion.div>

        {/* Grid pattern */}
        <div className={styles["bgGrid"]} />

        {/* Background beams */}
        <BackgroundBeams className={styles["beamsWrapper"]} />
      </div>

      <div className={styles["container"]}>
        <div className={styles["contentWrapper"]}>
          {/* Heading */}
          <motion.div
            initial={{opacity: 0, y: 30}}
            animate={isInView ? {opacity: 1, y: 0} : {}}
            transition={{duration: 0.6}}>
            <h2 className={styles["title"]}>
              {t("title")} <span className={styles["titleHighlight"]}>{t("titleHighlight")}?</span>
            </h2>
          </motion.div>

          {/* Description */}
          <motion.p
            className={styles["description"]}
            initial={{opacity: 0, y: 30}}
            animate={isInView ? {opacity: 1, y: 0} : {}}
            transition={{duration: 0.6, delay: 0.1}}>
            {t("description")}
          </motion.p>

          {/* CTA Buttons */}
          <motion.div
            className={styles["ctaButtons"]}
            initial={{opacity: 0, y: 30}}
            animate={isInView ? {opacity: 1, y: 0} : {}}
            transition={{duration: 0.6, delay: 0.2}}>
            {/* Primary CTA */}
            <motion.div
              whileHover={{scale: 1.05}}
              whileTap={{scale: 0.95}}>
              <Button
                asChild
                size='lg'
                className={styles["ctaButton"]}>
                <Link href='/domains'>
                  <TbRocket className={styles["ctaIcon"]} />
                  <span>{t("cta.exploreApplications")}</span>
                  <TbArrowRight className={styles["ctaArrow"]} />
                  <motion.span
                    className={styles["ctaOverlay"]}
                    initial={{x: "-100%", opacity: 0}}
                    whileHover={{x: "100%", opacity: 1}}
                    transition={{duration: 0.6}}
                  />
                </Link>
              </Button>
            </motion.div>

            {/* Secondary CTAs */}
            <motion.div
              whileHover={{scale: 1.05}}
              whileTap={{scale: 0.95}}>
              <Button
                asChild
                size='lg'
                variant='outline'
                className={styles["ctaButton"]}>
                <Link href='/auth/sign-up'>
                  <TbUser className={styles["ctaIcon"]} />
                  <span>{t("cta.createAccount")}</span>
                  <motion.span
                    className={styles["ctaOverlay"]}
                    initial={{x: "-100%", opacity: 0}}
                    whileHover={{x: "100%", opacity: 1}}
                    transition={{duration: 0.6}}
                  />
                </Link>
              </Button>
            </motion.div>
          </motion.div>

          {/* Secondary Links */}
          <motion.div
            className={styles["secondaryLinks"]}
            initial={{opacity: 0}}
            animate={isInView ? {opacity: 1} : {}}
            transition={{duration: 0.6, delay: 0.4}}>
            <Link
              href='https://github.com/arolariu/arolariu.ro'
              target='_blank'
              rel='noopener noreferrer'
              className={styles["secondaryLink"]}>
              <TbBrandGithub className={styles["secondaryLinkIcon"]} />
              <span>{t("links.viewSource")}</span>
            </Link>
            <span className={styles["linkDivider"]}>|</span>
            <Link
              href='/about/the-author'
              className={styles["secondaryLink"]}>
              <TbUser className={styles["secondaryLinkIcon"]} />
              <span>{t("links.meetAuthor")}</span>
            </Link>
            <span className={styles["linkDivider"]}>|</span>
            <Link
              href='mailto:contact@arolariu.ro'
              className={styles["secondaryLink"]}>
              <TbMail className={styles["secondaryLinkIcon"]} />
              <span>{t("links.getInTouch")}</span>
            </Link>
          </motion.div>

          {/* Trust Indicators */}
          <motion.div
            className={styles["trustGrid"]}
            initial={{opacity: 0, y: 30}}
            animate={isInView ? {opacity: 1, y: 0} : {}}
            transition={{duration: 0.6, delay: 0.5}}>
            {trustIds.map((trustId, index) => (
              <motion.div
                key={trustId}
                className={styles["trustCard"]}
                initial={{opacity: 0, y: 20}}
                animate={isInView ? {opacity: 1, y: 0} : {}}
                transition={{duration: 0.5, delay: 0.6 + index * 0.1}}
                whileHover={{scale: 1.05, transition: {duration: 0.2}}}>
                <div className={`${styles["trustAccent"]} ${styles[trustAccentClassMap[trustId]]}`} />
                <h3 className={styles["trustTitle"]}>{t(`trust.${trustId}.title` as Parameters<typeof t>[0])}</h3>
                <p className={styles["trustDescription"]}>{t(`trust.${trustId}.description` as Parameters<typeof t>[0])}</p>
              </motion.div>
            ))}
          </motion.div>

          {/* Final Message */}
          <motion.div
            className={styles["footer"]}
            initial={{opacity: 0}}
            animate={isInView ? {opacity: 1} : {}}
            transition={{duration: 0.6, delay: 0.8}}>
            <p className={styles["footerText"]}>
              {t("footer")}{" "}
              <Link
                href='/about/the-author'
                className={styles["footerLink"]}>
                Alexandru-Razvan Olariu
              </Link>
              {t("footerRole")}
            </p>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
