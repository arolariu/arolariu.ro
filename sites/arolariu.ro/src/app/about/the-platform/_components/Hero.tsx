"use client";

import {BackgroundBeams} from "@arolariu/components/background-beams";
import {Button} from "@arolariu/components/button";
import {GradientText} from "@arolariu/components/gradient-text";
import {motion, useScroll, useTransform} from "motion/react";
import {useTranslations} from "next-intl";
import Link from "next/link";
import {useRef} from "react";
import {TbArrowRight, TbBrandGithub, TbCode, TbRocket, TbSparkles} from "react-icons/tb";
import styles from "./Hero.module.scss";

/**
 * Hero component for the Platform page.
 * Features a stunning full-height hero with animated background beams,
 * gradient text, floating elements, and scroll-based parallax effects.
 * @returns The Hero component, CSR'ed.
 */
export default function Hero(): React.JSX.Element {
  const t = useTranslations("About.Platform.hero");
  const ref = useRef<HTMLElement>(null);
  const {scrollYProgress} = useScroll({
    target: ref,
    offset: ["start start", "end start"],
  });

  const y = useTransform(scrollYProgress, [0, 1], [0, 200]);
  const opacity = useTransform(scrollYProgress, [0, 0.5], [1, 0]);
  const scale = useTransform(scrollYProgress, [0, 0.5], [1, 0.95]);

  return (
    <section
      ref={ref}
      className={styles["section"]}>
      {/* Background Layers */}
      <main className={styles["bgLayers"]}>
        {/* Gradient base */}
        <main className={styles["bgGradient"]} />

        {/* Animated gradient orbs */}
        <motion.div
          className={styles["bgOrbs"]}
          initial={{opacity: 0}}
          animate={{opacity: 1}}
          transition={{duration: 1.5}}>
          {/* Primary orb - top left */}
          <motion.div
            className={styles["orbPrimary"]}
            animate={{
              scale: [1, 1.2, 1],
              x: [0, 50, 0],
              y: [0, -30, 0],
              rotate: [0, 10, 0],
            }}
            transition={{
              duration: 12,
              repeat: Number.POSITIVE_INFINITY,
              repeatType: "reverse",
              ease: "easeInOut",
            }}
          />

          {/* Secondary orb - bottom right */}
          <motion.div
            className={styles["orbSecondary"]}
            animate={{
              scale: [1, 1.3, 1],
              x: [0, -60, 0],
              y: [0, 40, 0],
              rotate: [0, -15, 0],
            }}
            transition={{
              duration: 15,
              repeat: Number.POSITIVE_INFINITY,
              repeatType: "reverse",
              ease: "easeInOut",
            }}
          />

          {/* Accent orb - center */}
          <motion.div
            className={styles["orbAccent"]}
            animate={{
              scale: [1, 1.1, 1],
              opacity: [0.5, 0.8, 0.5],
            }}
            transition={{
              duration: 8,
              repeat: Number.POSITIVE_INFINITY,
              repeatType: "reverse",
              ease: "easeInOut",
            }}
          />
        </motion.div>

        {/* Grid pattern overlay */}
        <main className={styles["bgGrid"]} />

        {/* Background beams */}
        <BackgroundBeams className='opacity-40' />
      </main>

      {/* Main Content */}
      <motion.div
        className={styles["content"]}
        style={{y, opacity, scale}}>
        <main className={styles["contentInner"]}>
          {/* Status Badge */}
          <motion.div
            initial={{opacity: 0, y: 30}}
            animate={{opacity: 1, y: 0}}
            transition={{duration: 0.6, delay: 0.1}}>
            <motion.span
              className={styles["statusBadge"]}
              whileHover={{
                scale: 1.05,
                backgroundColor: "rgba(var(--primary-rgb), 0.15)",
              }}
              transition={{duration: 0.2}}>
              <motion.span
                className={styles["statusDot"]}
                animate={{scale: [1, 1.2, 1]}}
                transition={{duration: 2, repeat: Number.POSITIVE_INFINITY}}>
                <span className={styles["statusDotPing"]} />
                <span className={styles["statusDotInner"]} />
              </motion.span>
              <span>{t("statusBadge")}</span>
              <TbSparkles className={styles["statusIcon"]} />
            </motion.span>
          </motion.div>

          {/* Main Heading */}
          <motion.div
            initial={{opacity: 0, y: 30}}
            animate={{opacity: 1, y: 0}}
            transition={{duration: 0.6, delay: 0.2}}
            className={styles["titleWrapper"]}>
            <h1 className={styles["title"]}>
              <motion.span
                className={styles["titleLine"]}
                animate={{
                  color: ["hsl(var(--foreground))", "hsl(var(--primary))", "hsl(var(--foreground))"],
                }}
                transition={{duration: 6, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut"}}>
                {t("title")}
              </motion.span>
              <GradientText
                text='arolariu.ro'
                neon
                className={styles["gradientTitle"]}
                gradient='linear-gradient(90deg, #3b82f6 0%, #8b5cf6 25%, #d946ef 50%, #8b5cf6 75%, #3b82f6 100%)'
              />
            </h1>
          </motion.div>

          {/* Subtitle */}
          <motion.p
            className={styles["subtitle"]}
            initial={{opacity: 0, y: 30}}
            animate={{opacity: 1, y: 0}}
            transition={{duration: 0.6, delay: 0.3}}>
            {t("description")}
          </motion.p>

          {/* Feature Pills */}
          <motion.div
            className={styles["featurePills"]}
            initial={{opacity: 0, y: 20}}
            animate={{opacity: 1, y: 0}}
            transition={{duration: 0.6, delay: 0.4}}>
            {[
              {icon: TbCode, label: t("trust.openSource")},
              {icon: TbRocket, label: t("trust.privacyFirst")},
              {icon: TbSparkles, label: t("trust.freeForever")},
            ].map((pill, index) => (
              <motion.span
                key={pill.label}
                className={styles["featurePill"]}
                initial={{opacity: 0, scale: 0.8}}
                animate={{opacity: 1, scale: 1}}
                transition={{duration: 0.4, delay: 0.5 + index * 0.1}}
                whileHover={{
                  scale: 1.05,
                  backgroundColor: "rgba(var(--primary-rgb), 0.1)",
                }}>
                <pill.icon className={styles["featurePillIcon"]} />
                {pill.label}
              </motion.span>
            ))}
          </motion.div>

          {/* CTA Buttons */}
          <motion.div
            className={styles["cta"]}
            initial={{opacity: 0, y: 30}}
            animate={{opacity: 1, y: 0}}
            transition={{duration: 0.6, delay: 0.6}}>
            <motion.div
              whileHover={{scale: 1.05}}
              whileTap={{scale: 0.95}}>
              <Button
                asChild
                size='lg'
                className={styles["ctaButton"]}>
                <Link href='/domains'>
                  <TbRocket className={styles["ctaIcon"]} />
                  <span>{t("cta.exploreFeatures")}</span>
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

            <motion.div
              whileHover={{scale: 1.05}}
              whileTap={{scale: 0.95}}>
              <Button
                asChild
                size='lg'
                variant='outline'
                className={styles["ctaButton"]}>
                <Link
                  href='https://github.com/arolariu/arolariu.ro'
                  target='_blank'
                  rel='noopener noreferrer'>
                  <TbBrandGithub className={styles["ctaIcon"]} />
                  <span>{t("cta.viewSource")}</span>
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

          {/* Scroll Indicator */}
          <motion.div
            className={styles["scrollIndicator"]}
            initial={{opacity: 0}}
            animate={{opacity: 1}}
            transition={{duration: 0.6, delay: 1}}>
            <motion.div
              className={styles["scrollInner"]}
              animate={{y: [0, 10, 0]}}
              transition={{duration: 2, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut"}}>
              <span className={styles["scrollText"]}>{t("scrollIndicator")}</span>
              <main className={styles["scrollMouse"]}>
                <motion.div
                  className={styles["scrollDot"]}
                  animate={{y: [0, 16, 0]}}
                  transition={{duration: 2, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut"}}
                />
              </main>
            </motion.div>
          </motion.div>
        </main>
      </motion.div>

      {/* Bottom gradient fade */}
      <main className={styles["bottomFade"]} />
    </section>
  );
}
