"use client";

import {Badge} from "@arolariu/components/badge";
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from "@arolariu/components/card";
import {motion, useInView} from "motion/react";
import {useTranslations} from "next-intl";
import {useCallback, useRef, useState} from "react";
import {TbBrandReact, TbCalendar, TbCheck, TbCloud, TbCode, TbFileInvoice, TbRocket, TbServer, TbSparkles, TbTools} from "react-icons/tb";
import styles from "./Timeline.module.scss";

interface EventConfig {
  id: string;
  icon: React.ComponentType<{className?: string}>;
  colorKey: "blue" | "green" | "purple" | "orange" | "red" | "cyan" | "indigo" | "teal";
}

const iconClassMap = {
  blue: "iconBlue",
  green: "iconGreen",
  purple: "iconPurple",
  orange: "iconOrange",
  red: "iconRed",
  cyan: "iconCyan",
  indigo: "iconIndigo",
  teal: "iconTeal",
} as const;

const borderClassMap = {
  blue: "borderBlue",
  green: "borderGreen",
  purple: "borderPurple",
  orange: "borderOrange",
  red: "borderRed",
  cyan: "borderCyan",
  indigo: "borderIndigo",
  teal: "borderTeal",
} as const;

const detailIconClassMap = {
  blue: "detailIconBlue",
  green: "detailIconGreen",
  purple: "detailIconPurple",
  orange: "detailIconOrange",
  red: "detailIconRed",
  cyan: "detailIconCyan",
  indigo: "detailIconIndigo",
  teal: "detailIconTeal",
} as const;

const eventConfigs: EventConfig[] = [
  {id: "inception", icon: TbCode, colorKey: "blue"},
  {id: "prototype", icon: TbRocket, colorKey: "green"},
  {id: "backend", icon: TbServer, colorKey: "purple"},
  {id: "expansion", icon: TbFileInvoice, colorKey: "orange"},
  {id: "launch", icon: TbCloud, colorKey: "red"},
  {id: "nextjs", icon: TbBrandReact, colorKey: "cyan"},
  {id: "ai", icon: TbSparkles, colorKey: "indigo"},
  {id: "present", icon: TbTools, colorKey: "teal"},
];

/**
 * Enhanced Timeline component displaying the platform's development history.
 * Features interactive cards with detailed milestone information.
 * @returns The Timeline component, CSR'ed.
 */
export default function Timeline(): React.JSX.Element {
  const t = useTranslations("About.Platform.timeline");
  const ref = useRef<HTMLElement>(null);
  const isInView = useInView(ref, {once: true, margin: "-100px"});
  const [hoveredEvent, setHoveredEvent] = useState<string | null>(null);
  const [expandedEvent, setExpandedEvent] = useState<string | null>(null);

  const handleEventClick = useCallback((eventId: string) => {
    setExpandedEvent((prev) => (prev === eventId ? null : eventId));
  }, []);

  return (
    <section
      ref={ref}
      className={styles["section"]}>
      {/* Background */}
      <div className={styles["bgLayer"]}>
        <div className={styles["bgGradient"]} />
      </div>

      <div className={styles["container"]}>
        {/* Section Header */}
        <motion.div
          className={styles["header"]}
          initial={{opacity: 0, y: 30}}
          animate={isInView ? {opacity: 1, y: 0} : {}}
          transition={{duration: 0.6}}>
          <motion.div
            initial={{opacity: 0, scale: 0.9}}
            animate={isInView ? {opacity: 1, scale: 1} : {}}
            transition={{duration: 0.5}}>
            <Badge
              variant='outline'
              className={styles["badge"]}>
              {t("badge")}
            </Badge>
          </motion.div>
          <h2 className={styles["title"]}>
            {t("title")} <span className={styles["titleHighlight"]}>{t("titleHighlight")}</span>
          </h2>
          <p className={styles["description"]}>{t("description")}</p>
        </motion.div>

        {/* Timeline */}
        <div className={styles["timeline"]}>
          {/* Center Line */}
          <motion.div
            className={styles["centerLine"]}
            initial={{scaleY: 0}}
            animate={isInView ? {scaleY: 1} : {}}
            transition={{duration: 1.5, ease: "easeOut"}}
            style={{transformOrigin: "top"}}
          />

          {/* Timeline Events */}
          <div className={styles["events"]}>
            {eventConfigs.map((event, index) => {
              const isLeft = index % 2 === 0;
              const isExpanded = expandedEvent === event.id;

              return (
                <motion.div
                  key={event.id}
                  className={styles["eventWrapper"]}
                  initial={{opacity: 0, y: 50}}
                  animate={isInView ? {opacity: 1, y: 0} : {}}
                  transition={{duration: 0.5, delay: index * 0.15}}>
                  {/* Event Icon on Timeline */}
                  <motion.div
                    className={`${styles["eventIcon"]} ${styles[iconClassMap[event.colorKey]]}`}
                    animate={{
                      scale: hoveredEvent === event.id ? 1.2 : 1,
                      boxShadow: hoveredEvent === event.id ? "0 0 20px rgba(var(--primary-rgb), 0.5)" : "none",
                    }}
                    transition={{duration: 0.3}}>
                    <event.icon className={styles["eventIconInner"]} />
                  </motion.div>

                  {/* Event Card */}
                  <motion.div
                    className={isLeft ? styles["eventCardLeft"] : styles["eventCardRight"]}
                    // eslint-disable-next-line react/jsx-no-bind -- simple page
                    onHoverStart={() => setHoveredEvent(event.id)}
                    // eslint-disable-next-line react/jsx-no-bind -- simple page
                    onHoverEnd={() => setHoveredEvent(null)}
                    whileHover={{scale: 1.02}}
                    transition={{duration: 0.2}}>
                    <Card
                      className={hoveredEvent === event.id ? styles["eventCardActive"] : styles["eventCard"]}
                      // eslint-disable-next-line react/jsx-no-bind -- simple page
                      onClick={() => handleEventClick(event.id)}>
                      {/* Gradient overlay */}
                      <motion.div
                        className={`${styles["eventCardGradient"]} ${styles[iconClassMap[event.colorKey]]}`}
                        style={{opacity: hoveredEvent === event.id ? 0.1 : 0}}
                      />

                      <CardHeader className={styles["eventCardHeader"]}>
                        <div className={styles["mobileEventMeta"]}>
                          <span className={`${styles["mobileEventIcon"]} ${styles[iconClassMap[event.colorKey]]}`}>
                            <event.icon className={styles["mobileEventIconInner"]} />
                          </span>
                          <Badge
                            variant='outline'
                            className={styles["dateBadge"]}>
                            <TbCalendar className={styles["dateIcon"]} />
                            {t(`events.${event.id}.date` as Parameters<typeof t>[0])}
                          </Badge>
                        </div>
                        {/* Date Badge */}
                        <Badge
                          variant='outline'
                          className={`${styles["dateBadge"]} ${styles["dateBadgeDesktop"]}`}>
                          <TbCalendar className={styles["dateIcon"]} />
                          {t(`events.${event.id}.date` as Parameters<typeof t>[0])}
                        </Badge>
                        <CardTitle className={styles["eventTitle"]}>{t(`events.${event.id}.title` as Parameters<typeof t>[0])}</CardTitle>
                        <CardDescription className={styles["eventDescription"]}>
                          {t(`events.${event.id}.description` as Parameters<typeof t>[0])}
                        </CardDescription>
                      </CardHeader>

                      <CardContent className={styles["eventCardContent"]}>
                        {/* Tags */}
                        <div className={styles["tags"]}>
                          {t(`events.${event.id}.tags` as Parameters<typeof t>[0])
                            .split(",")
                            .map((tag) => (
                              <Badge
                                key={tag}
                                variant='secondary'
                                className={styles["tag"]}>
                                {tag}
                              </Badge>
                            ))}
                        </div>

                        {/* Expandable Details */}
                        <motion.div
                          initial={false}
                          animate={{
                            height: isExpanded ? "auto" : 0,
                            opacity: isExpanded ? 1 : 0,
                          }}
                          transition={{duration: 0.3}}
                          className={styles["expandableDetails"]}>
                          <div className={styles["detailsInner"]}>
                            <h4 className={styles["detailsTitle"]}>{t("keyAchievements")}</h4>
                            <ul className={styles["detailsList"]}>
                              {t(`events.${event.id}.details` as Parameters<typeof t>[0])
                                .split(",")
                                .map((detail) => (
                                  <motion.li
                                    key={detail}
                                    className={styles["detailItem"]}
                                    initial={{opacity: 0, x: -10}}
                                    animate={isExpanded ? {opacity: 1, x: 0} : {}}
                                    transition={{duration: 0.2}}>
                                    <TbCheck className={`${styles["detailIcon"]} ${styles[detailIconClassMap[event.colorKey]]}`} />
                                    {detail}
                                  </motion.li>
                                ))}
                            </ul>
                          </div>
                        </motion.div>

                        {/* Expand/Collapse indicator */}
                        <div className={styles["expandHint"]}>{isExpanded ? t("collapseHint") : t("expandHint")}</div>
                      </CardContent>

                      {/* Animated border */}
                      <motion.div
                        className={`${styles["eventCardBorder"]} ${styles[borderClassMap[event.colorKey]]} ${isLeft ? styles["originLeft"] : styles["originRight"]}`}
                        initial={{scaleX: 0}}
                        animate={{scaleX: hoveredEvent === event.id ? 1 : 0}}
                        transition={{duration: 0.3}}
                      />
                    </Card>
                  </motion.div>
                </motion.div>
              );
            })}
          </div>

          {/* Future Indicator */}
          <motion.div
            className={styles["futureIndicator"]}
            initial={{opacity: 0, y: 20}}
            animate={isInView ? {opacity: 1, y: 0} : {}}
            transition={{duration: 0.5, delay: 1.5}}>
            <motion.div
              className={styles["futureIconWrapper"]}
              animate={{
                scale: [1, 1.1, 1],
                boxShadow: [
                  "0 0 0 0 rgba(var(--primary-rgb), 0)",
                  "0 0 0 20px rgba(var(--primary-rgb), 0.1)",
                  "0 0 0 0 rgba(var(--primary-rgb), 0)",
                ],
              }}
              transition={{duration: 2, repeat: Number.POSITIVE_INFINITY}}>
              <TbRocket className={styles["futureIcon"]} />
            </motion.div>
            <p className={styles["futureText"]}>{t("futureIndicator")}</p>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
