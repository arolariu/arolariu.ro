"use client";

import {selectorFromPath} from "next-intl-selector";

import {Badge} from "@arolariu/components/badge";
import {AnimatePresence, motion, useInView} from "motion/react";
import {useTranslations} from "next-intl-selector";
import {useCallback, useRef, useState} from "react";
import {TbBrandReact, TbCalendar, TbCheck, TbCloud, TbCode, TbFileInvoice, TbRocket, TbServer, TbSparkles, TbTools} from "react-icons/tb";
import styles from "./Stepper.module.scss";

interface EventConfig {
  id: string;
  icon: React.ComponentType<{className?: string}>;
}

const eventConfigs: EventConfig[] = [
  {id: "inception", icon: TbCode},
  {id: "prototype", icon: TbRocket},
  {id: "backend", icon: TbServer},
  {id: "expansion", icon: TbFileInvoice},
  {id: "launch", icon: TbCloud},
  {id: "nextjs", icon: TbBrandReact},
  {id: "ai", icon: TbSparkles},
  {id: "present", icon: TbTools},
];

/**
 * Stepper component displaying the platform's development history.
 * Replaces the alternating Timeline with a left-anchored vertical stepper.
 * @returns The Stepper component, CSR'ed.
 */
export default function Stepper(): React.JSX.Element {
  const t = useTranslations();
  const ref = useRef<HTMLElement>(null);
  const isInView = useInView(ref, {once: true, margin: "-100px"});
  const [expandedEvent, setExpandedEvent] = useState<string | null>(null);

  const handleStepClick = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    const {eventId} = e.currentTarget.dataset;
    if (eventId) setExpandedEvent((prev) => (prev === eventId ? null : eventId));
  }, []);

  return (
    <section
      ref={ref}
      className={styles["section"]}>
      <div className={styles["container"]}>
        {/* Section Header */}
        <motion.div
          className={styles["header"]}
          initial={{opacity: 0, y: 30}}
          animate={isInView ? {opacity: 1, y: 0} : {}}
          transition={{duration: 0.6}}>
          <Badge
            variant='outline'
            className={styles["badge"]}>
            {t((m) => m.sections.about.platform.timeline.badge)}
          </Badge>
          <h2 className={styles["title"]}>
            {t((m) => m.sections.about.platform.timeline.title)} <span className={styles["titleHighlight"]}>{t((m) => m.sections.about.platform.timeline.titleHighlight)}</span>
          </h2>
          <p className={styles["description"]}>{t((m) => m.sections.about.platform.timeline.description)}</p>
        </motion.div>

        {/* Stepper list */}
        <div className={styles["stepper"]}>
          {eventConfigs.map((event, index) => {
            const isExpanded = expandedEvent === event.id;
            const isLast = index === eventConfigs.length - 1;

            return (
              <motion.div
                key={event.id}
                className={styles["step"]}
                initial={{opacity: 0, x: -20}}
                animate={isInView ? {opacity: 1, x: 0} : {}}
                transition={{duration: 0.4, delay: index * 0.1}}>
                {/* Left column: icon + connector */}
                <div className={styles["stepLeft"]}>
                  <div className={styles["stepIcon"]}>
                    <event.icon className={styles["stepIconInner"]} />
                  </div>
                  {!isLast && <div className={styles["connector"]} />}
                </div>

                {/* Right column: content */}
                <div className={styles["stepContent"]}>
                  <Badge
                    variant='outline'
                    className={styles["dateBadge"]}>
                    <TbCalendar className={styles["dateIcon"]} />
                    {t(selectorFromPath(`sections.about.platform.timeline.${`events.${event.id}.date`}`))}
                  </Badge>

                  <button
                    type='button'
                    data-event-id={event.id}
                    className={styles["stepButton"]}
                    onClick={handleStepClick}>
                    <h3 className={styles["stepTitle"]}>{t(selectorFromPath(`sections.about.platform.timeline.${`events.${event.id}.title`}`))}</h3>
                  </button>

                  <p className={styles["stepDescription"]}>{t(selectorFromPath(`sections.about.platform.timeline.${`events.${event.id}.description`}`))}</p>

                  {/* Tags */}
                  <div className={styles["tags"]}>
                    {t(selectorFromPath(`sections.about.platform.timeline.${`events.${event.id}.tags`}`))
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

                  {/* Expandable details */}
                  <AnimatePresence>
                    {isExpanded ? (
                      <motion.div
                        initial={{height: 0, opacity: 0}}
                        animate={{height: "auto", opacity: 1}}
                        exit={{height: 0, opacity: 0}}
                        transition={{duration: 0.3}}
                        className={styles["expandable"]}>
                        <h4 className={styles["detailsTitle"]}>{t((m) => m.sections.about.platform.timeline.keyAchievements)}</h4>
                        <ul className={styles["detailsList"]}>
                          {t(selectorFromPath(`sections.about.platform.timeline.${`events.${event.id}.details`}`))
                            .split(",")
                            .map((detail) => (
                              <motion.li
                                key={detail}
                                className={styles["detailItem"]}
                                initial={{opacity: 0, x: -10}}
                                animate={{opacity: 1, x: 0}}
                                transition={{duration: 0.2}}>
                                <TbCheck className={styles["detailIcon"]} />
                                {detail}
                              </motion.li>
                            ))}
                        </ul>
                      </motion.div>
                    ) : null}
                  </AnimatePresence>

                  <button
                    type='button'
                    data-event-id={event.id}
                    className={styles["expandHint"]}
                    onClick={handleStepClick}>
                    {isExpanded ? t((m) => m.sections.about.platform.timeline.collapseHint) : t((m) => m.sections.about.platform.timeline.expandHint)}
                  </button>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Future indicator */}
        <motion.div
          className={styles["futureIndicator"]}
          initial={{opacity: 0, y: 20}}
          animate={isInView ? {opacity: 1, y: 0} : {}}
          transition={{duration: 0.5, delay: 1}}>
          <motion.div
            className={styles["futureIconWrapper"]}
            animate={{
              scale: [1, 1.1, 1],
            }}
            transition={{duration: 2, repeat: Number.POSITIVE_INFINITY}}>
            <TbRocket className={styles["futureIcon"]} />
          </motion.div>
          <p className={styles["futureText"]}>{t((m) => m.sections.about.platform.timeline.futureIndicator)}</p>
        </motion.div>
      </div>
    </section>
  );
}
