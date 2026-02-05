import {RichText} from "@/presentation/Text";
import {Separator} from "@arolariu/components";
import {motion} from "motion/react";
import {useTranslations} from "next-intl";
import Link from "next/link";
import TechSphere from "../_effects/TechSphere";
import styles from "./Hero.module.scss";

/**
 * The hero section of the homepage, CSR'ed.
 * This component renders the hero section of the homepage.
 * It displays a title, subtitle, and a call-to-action button.
 * The hero section is animated using the `motion` library.
 * @returns The hero section of the homepage, CSR'ed.
 */
export default function HeroSection(): React.JSX.Element {
  const t = useTranslations("Home");
  return (
    <section className={styles["section"]}>
      <article className={styles["article"]}>
        {/* Left side - h1 always visible for accessibility, container animates scale only */}
        <motion.div
          initial={{scale: 0.8}}
          animate={{scale: 1}}
          transition={{duration: 0.8, delay: 0.3}}
          className={styles["content"]}>
          <h1 className={styles["title"]}>
            <span className={styles["titleGradient"]}>{t("title")}</span>
          </h1>
          <p className={styles["subtitle"]}>
            <RichText
              sectionKey='Home'
              textKey='subtitle'
            />
          </p>
          <div className={styles["ctaWrapper"]}>
            <div className={styles["ctaGlow"]} />
            <Link
              href='/domains'
              title=''
              className={styles["ctaButton"]}>
              {t("cta")}
            </Link>
          </div>

          <div className={styles["appreciation"]}>
            <Separator className={styles["appreciationSeparator"]} />
            <span className={styles["appreciationText"]}>{t("appreciation")}</span>
          </div>
        </motion.div>
        {/* Right side */}
        <motion.div
          initial={{opacity: 0, scale: 0.8}}
          animate={{opacity: 1, scale: 1}}
          transition={{duration: 0.8, delay: 0.3}}
          className={styles["visual"]}>
          <div className={styles["visualContainer"]}>
            <motion.div
              className={styles["orbPrimary"]}
              animate={{
                scale: [1, 1.2, 1],
                opacity: [0.3, 0.5, 0.3],
              }}
              transition={{
                duration: 8,
                repeat: Number.POSITIVE_INFINITY,
                repeatType: "reverse",
              }}
            />
            <motion.div
              className={styles["orbPurple"]}
              animate={{
                scale: [1, 1.2, 1],
                opacity: [0.3, 0.5, 0.3],
              }}
              transition={{
                duration: 6,
                repeat: Number.POSITIVE_INFINITY,
                repeatType: "reverse",
              }}
            />

            <div className={styles["techSphereWrapper"]}>
              <TechSphere />
            </div>

            {/* Mobile-only animation */}
            <div className={styles["mobileAnimation"]}>
              <div className={styles["mobileAnimationInner"]}>
                <motion.div
                  className={styles["mobileOrb"]}
                  animate={{
                    scale: [1, 1.2, 1],
                    opacity: [0.3, 0.5, 0.3],
                  }}
                  transition={{
                    duration: 4,
                    repeat: Number.POSITIVE_INFINITY,
                    repeatType: "reverse",
                  }}
                />
              </div>
            </div>
          </div>
        </motion.div>
      </article>
    </section>
  );
}
