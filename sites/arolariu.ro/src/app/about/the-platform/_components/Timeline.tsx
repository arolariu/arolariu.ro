"use client";

import {Badge} from "@arolariu/components/badge";
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from "@arolariu/components/card";
import {motion, useInView} from "motion/react";
import {useTranslations} from "next-intl";
import {useCallback, useRef, useState} from "react";
import {TbBrandReact, TbCalendar, TbCheck, TbCloud, TbCode, TbFileInvoice, TbRocket, TbServer, TbSparkles, TbTools} from "react-icons/tb";

interface EventConfig {
  id: string;
  icon: React.ComponentType<{className?: string}>;
  color: string;
  gradient: string;
}

const eventConfigs: EventConfig[] = [
  {id: "inception", icon: TbCode, color: "text-blue-500", gradient: "from-blue-500 to-cyan-500"},
  {id: "prototype", icon: TbRocket, color: "text-green-500", gradient: "from-green-500 to-emerald-500"},
  {id: "backend", icon: TbServer, color: "text-purple-500", gradient: "from-purple-500 to-violet-500"},
  {id: "expansion", icon: TbFileInvoice, color: "text-orange-500", gradient: "from-orange-500 to-amber-500"},
  {id: "launch", icon: TbCloud, color: "text-red-500", gradient: "from-red-500 to-pink-500"},
  {id: "nextjs", icon: TbBrandReact, color: "text-cyan-500", gradient: "from-cyan-500 to-teal-500"},
  {id: "ai", icon: TbSparkles, color: "text-indigo-500", gradient: "from-indigo-500 to-purple-500"},
  {id: "present", icon: TbTools, color: "text-teal-500", gradient: "from-teal-500 to-green-500"},
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
      className='relative py-24'>
      {/* Background */}
      <div className='absolute inset-0 -z-10'>
        <div className='from-background via-primary/5 to-background absolute inset-0 bg-gradient-to-b' />
      </div>

      <div className='container mx-auto px-4'>
        {/* Section Header */}
        <motion.div
          className='mx-auto mb-16 max-w-3xl text-center'
          initial={{opacity: 0, y: 30}}
          animate={isInView ? {opacity: 1, y: 0} : {}}
          transition={{duration: 0.6}}>
          <motion.div
            initial={{opacity: 0, scale: 0.9}}
            animate={isInView ? {opacity: 1, scale: 1} : {}}
            transition={{duration: 0.5}}>
            <Badge
              variant='outline'
              className='mb-4 px-4 py-1 text-sm'>
              {t("badge")}
            </Badge>
          </motion.div>
          <h2 className='mb-6 text-4xl font-bold tracking-tight md:text-5xl'>
            {t("title")}{" "}
            <span className='bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 bg-clip-text text-transparent'>
              {t("titleHighlight")}
            </span>
          </h2>
          <p className='text-muted-foreground text-lg md:text-xl'>{t("description")}</p>
        </motion.div>

        {/* Timeline */}
        <div className='relative mx-auto max-w-5xl'>
          {/* Center Line */}
          <motion.div
            className='from-primary/50 via-primary/30 to-primary/10 absolute left-1/2 h-full w-1 -translate-x-1/2 transform rounded-full bg-gradient-to-b'
            initial={{scaleY: 0}}
            animate={isInView ? {scaleY: 1} : {}}
            transition={{duration: 1.5, ease: "easeOut"}}
            style={{transformOrigin: "top"}}
          />

          {/* Timeline Events */}
          <div className='space-y-16'>
            {eventConfigs.map((event, index) => {
              const isLeft = index % 2 === 0;
              const isExpanded = expandedEvent === event.id;

              return (
                <motion.div
                  key={event.id}
                  className='relative'
                  initial={{opacity: 0, y: 50}}
                  animate={isInView ? {opacity: 1, y: 0} : {}}
                  transition={{duration: 0.5, delay: index * 0.15}}>
                  {/* Event Icon on Timeline */}
                  <motion.div
                    className={`absolute left-1/2 z-20 flex h-14 w-14 -translate-x-1/2 transform items-center justify-center rounded-full bg-gradient-to-br ${event.gradient} shadow-lg`}
                    animate={{
                      scale: hoveredEvent === event.id ? 1.2 : 1,
                      boxShadow: hoveredEvent === event.id ? "0 0 20px rgba(var(--primary-rgb), 0.5)" : "none",
                    }}
                    transition={{duration: 0.3}}>
                    <event.icon className='h-7 w-7 text-white' />
                  </motion.div>

                  {/* Event Card */}
                  <motion.div
                    className={`w-[45%] ${isLeft ? "mr-auto pr-8" : "ml-auto pl-8"}`}
                    // eslint-disable-next-line react/jsx-no-bind -- simple page
                    onHoverStart={() => setHoveredEvent(event.id)}
                    // eslint-disable-next-line react/jsx-no-bind -- simple page
                    onHoverEnd={() => setHoveredEvent(null)}
                    whileHover={{scale: 1.02}}
                    transition={{duration: 0.2}}>
                    <Card
                      className={`cursor-pointer overflow-hidden transition-all duration-300 ${
                        hoveredEvent === event.id ? "border-primary shadow-primary/10 shadow-lg" : "hover:border-primary/30"
                      }`}
                      // eslint-disable-next-line react/jsx-no-bind -- simple page
                      onClick={() => handleEventClick(event.id)}>
                      {/* Gradient overlay */}
                      <motion.div
                        className={`absolute inset-0 bg-gradient-to-br ${event.gradient} opacity-0 transition-opacity duration-300`}
                        style={{opacity: hoveredEvent === event.id ? 0.1 : 0}}
                      />

                      <CardHeader className='relative pb-2'>
                        {/* Date Badge */}
                        <Badge
                          variant='outline'
                          className='mb-2 flex w-fit items-center gap-1'>
                          <TbCalendar className='h-3 w-3' />
                          {t(`events.${event.id}.date` as Parameters<typeof t>[0])}
                        </Badge>
                        <CardTitle className='text-xl'>{t(`events.${event.id}.title` as Parameters<typeof t>[0])}</CardTitle>
                        <CardDescription className='text-base'>
                          {t(`events.${event.id}.description` as Parameters<typeof t>[0])}
                        </CardDescription>
                      </CardHeader>

                      <CardContent className='relative'>
                        {/* Tags */}
                        <div className='mb-4 flex flex-wrap gap-2'>
                          {t(`events.${event.id}.tags` as Parameters<typeof t>[0])
                            .split(",")
                            .map((tag) => (
                              <Badge
                                key={tag}
                                variant='secondary'
                                className='text-xs'>
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
                          className='overflow-hidden'>
                          <div className='border-primary/20 border-t pt-4'>
                            <h4 className='mb-3 text-sm font-semibold'>{t("keyAchievements")}</h4>
                            <ul className='space-y-2'>
                              {t(`events.${event.id}.details` as Parameters<typeof t>[0])
                                .split(",")
                                .map((detail) => (
                                  <motion.li
                                    key={detail}
                                    className='text-muted-foreground flex items-start gap-2 text-sm'
                                    initial={{opacity: 0, x: -10}}
                                    animate={isExpanded ? {opacity: 1, x: 0} : {}}
                                    transition={{duration: 0.2}}>
                                    <TbCheck className={`mt-0.5 h-4 w-4 shrink-0 ${event.color}`} />
                                    {detail}
                                  </motion.li>
                                ))}
                            </ul>
                          </div>
                        </motion.div>

                        {/* Expand/Collapse indicator */}
                        <div className='text-muted-foreground mt-2 text-center text-xs'>
                          {isExpanded ? t("collapseHint") : t("expandHint")}
                        </div>
                      </CardContent>

                      {/* Animated border */}
                      <motion.div
                        className={`absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r ${event.gradient}`}
                        initial={{scaleX: 0}}
                        animate={{scaleX: hoveredEvent === event.id ? 1 : 0}}
                        transition={{duration: 0.3}}
                        style={{transformOrigin: isLeft ? "right" : "left"}}
                      />
                    </Card>
                  </motion.div>
                </motion.div>
              );
            })}
          </div>

          {/* Future Indicator */}
          <motion.div
            className='mt-16 text-center'
            initial={{opacity: 0, y: 20}}
            animate={isInView ? {opacity: 1, y: 0} : {}}
            transition={{duration: 0.5, delay: 1.5}}>
            <motion.div
              className='bg-primary/10 text-primary mx-auto flex h-20 w-20 items-center justify-center rounded-full'
              animate={{
                scale: [1, 1.1, 1],
                boxShadow: [
                  "0 0 0 0 rgba(var(--primary-rgb), 0)",
                  "0 0 0 20px rgba(var(--primary-rgb), 0.1)",
                  "0 0 0 0 rgba(var(--primary-rgb), 0)",
                ],
              }}
              transition={{duration: 2, repeat: Number.POSITIVE_INFINITY}}>
              <TbRocket className='h-10 w-10' />
            </motion.div>
            <p className='text-muted-foreground mt-4'>{t("futureIndicator")}</p>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
