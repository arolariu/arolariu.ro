"use client";

import {Badge, Button, Card, CardContent, CardFooter, CardHeader} from "@arolariu/components";
import {motion, useInView} from "motion/react";
import {useTranslations} from "next-intl";
import Image from "next/image";
import Link from "next/link";
import {useRef} from "react";
import {TbArrowRight, TbCheck} from "react-icons/tb";
import styles from "./Navigation.module.scss";

type NavigationKey = "platform" | "author";

// Map navigation keys to SCSS gradient class names
const gradientClassMap = {
  platform: "gradientPlatform",
  author: "gradientAuthor",
} as const;

const navigationItems: Array<{
  key: NavigationKey;
  href: string;
  image: string;
}> = [
  {
    key: "platform",
    href: "/about/the-platform",
    image: "/images/about/platform-thumbnail.svg",
  },
  {
    key: "author",
    href: "/about/the-author",
    image: "/images/about/author-thumbnail.svg",
  },
];

/**
 * Enhanced navigation section with preview cards linking to sub-pages.
 */
export default function Navigation(): React.JSX.Element {
  const t = useTranslations("About.Hub.navigation");
  const ref = useRef<HTMLElement>(null);
  const isInView = useInView(ref, {once: true, margin: "-100px"});

  return (
    <section
      ref={ref}
      className={styles["section"]}>
      <div className={styles["container"]}>
        {/* Section header */}
        <motion.div
          className={styles["header"]}
          initial={{opacity: 0, y: 20}}
          animate={isInView ? {opacity: 1, y: 0} : {}}
          transition={{duration: 0.6}}>
          <h2 className={styles["title"]}>{t("title")}</h2>
          <p className={styles["subtitle"]}>{t("subtitle")}</p>
        </motion.div>

        {/* Navigation cards */}
        <div className={styles["grid"]}>
          {navigationItems.map((item, index) => (
            <motion.div
              key={item.key}
              initial={{opacity: 0, x: index === 0 ? -30 : 30}}
              animate={isInView ? {opacity: 1, x: 0} : {}}
              transition={{delay: 0.3 + index * 0.15, duration: 0.5}}>
              <Card className={styles["card"]}>
                {/* Gradient overlay */}
                <div
                  className={`${styles["cardGradient"]} ${styles[gradientClassMap[item.key]]}`}
                  aria-hidden='true'
                />

                <CardHeader className={styles["cardHeader"]}>
                  {/* Image container */}
                  <div className={styles["imageWrapper"]}>
                    <Image
                      src={item.image}
                      alt={t(`${item.key}.title`)}
                      width={120}
                      height={120}
                      className={styles["image"]}
                    />
                  </div>
                </CardHeader>

                <CardContent className={styles["cardContent"]}>
                  <div className={styles["cardContentInner"]}>
                    <div className={styles["cardTextCenter"]}>
                      <h3 className={styles["cardTitle"]}>{t(`${item.key}.title`)}</h3>
                      <p className={styles["cardSubtitle"]}>{t(`${item.key}.subtitle`)}</p>
                    </div>

                    {/* Feature list */}
                    <ul className={styles["featureList"]}>
                      {[0, 1, 2].map((featureIndex) => (
                        <li
                          key={featureIndex}
                          className={styles["featureItem"]}>
                          <Badge
                            variant='secondary'
                            className={styles["featureBadge"]}>
                            <TbCheck className={styles["featureIcon"]} />
                          </Badge>
                          <span>{t(`${item.key}.features.${featureIndex}`)}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </CardContent>

                <CardFooter className={styles["cardFooter"]}>
                  <Button
                    asChild
                    className={styles["ctaButton"]}
                    size='lg'>
                    <Link href={item.href}>
                      {t(`${item.key}.cta`)}
                      <TbArrowRight className={styles["ctaIcon"]} />
                    </Link>
                  </Button>
                </CardFooter>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
