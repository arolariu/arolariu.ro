"use client";

import {TypewriterTextSmooth} from "@arolariu/components";
import {motion, useScroll, useTransform} from "motion/react";
import {useTranslations} from "next-intl";
import Image from "next/image";
import {useRef} from "react";
import styles from "./Hero.module.scss";

/**
 * @description A dynamic hero section component for the author's page.
 * This component displays the author's profile image, name, and subtitle with animation effects.
 * It creates a parallax scrolling effect where the content moves and fades as the user scrolls down.
 * The title is rendered with a typewriter effect and gradient text.
 * @returns A section containing the author's image, animated title, and subtitle
 */
export default function Hero(): React.JSX.Element {
  const t = useTranslations("About.Author");
  const ref = useRef(null);
  const {scrollYProgress} = useScroll({
    target: ref,
    offset: ["start start", "end start"],
  });

  const y = useTransform(scrollYProgress, [0, 1], ["0%", "50%"]);
  const opacity = useTransform(scrollYProgress, [0, 0.5], [1, 0]);

  const words = t("title")
    .split(" ")
    .map((word) => ({
      text: word,
      className: styles["gradientWord"],
    }));

  return (
    <section
      ref={ref}
      className={styles["section"]}>
      <motion.div
        style={{y, opacity}}
        className={styles["content"]}>
        <div className={styles["contentInner"]}>
          <motion.div
            initial={{scale: 0.8, opacity: 0}}
            animate={{scale: 1, opacity: 1}}
            transition={{delay: 0.2, duration: 0.8}}
            className={styles["profileImage"]}>
            <Image
              src='/images/about/the-author/author.jpeg'
              alt='Alexandru Olariu'
              fill
              className={styles["imageObjectCover"]}
              quality={100}
              priority
            />
          </motion.div>

          <motion.div className={styles["titleWrapper"]}>
            <TypewriterTextSmooth
              words={words}
              className={styles["title"]}
              cursorClassName={styles["cursorHidden"]}
            />
          </motion.div>

          <motion.div
            initial={{opacity: 0, y: 20}}
            animate={{opacity: 1, y: 0}}
            transition={{delay: 1.5, duration: 0.8}}
            className='blue-underline'>
            <span className={styles["subtitle"]}>{t("subtitle")}</span>
          </motion.div>
        </div>
      </motion.div>
    </section>
  );
}
