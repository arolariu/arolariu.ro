/** @format */

"use client";

import {Badge, Card, CardDescription, CardHeader, CardTitle} from "@arolariu/components";
import {motion} from "motion/react";
import {useState} from "react";
import {TbCalendar, TbCode, TbRocket, TbServer, TbTools, TbUser} from "react-icons/tb";

/**
 * The Timeline component displays the development timeline of the arolariu.ro platform.
 * @returns The Timeline component, CSR'ed.
 */
export default function Timeline() {
  const [hoveredEvent, setHoveredEvent] = useState<number | null>(null);

  const timelineEvents = [
    {
      date: "March 2022",
      title: "Project Inception",
      description: "The arolariu.ro project was started as a learning experiment to understand how websites work.",
      icon: TbCode,
      color: "bg-blue-500",
    },
    {
      date: "June 2022",
      title: "First Prototype",
      description: "The first prototype of the platform was developed with basic functionality.",
      icon: TbRocket,
      color: "bg-green-500",
    },
    {
      date: "September 2022",
      title: "Backend Infrastructure",
      description: "Developed the backend infrastructure and APIs to support the platform.",
      icon: TbServer,
      color: "bg-purple-500",
    },
    {
      date: "January 2023",
      title: "Platform Expansion",
      description: "Added more applications and features to the platform.",
      icon: TbTools,
      color: "bg-amber-500",
    },
    {
      date: "June 2023",
      title: "Public Launch",
      description: "Officially launched the platform to the public with a complete set of features.",
      icon: TbRocket,
      color: "bg-red-500",
    },
    {
      date: "Present",
      title: "Continuous Improvement",
      description: "Continuously improving the platform with new features and technologies.",
      icon: TbUser,
      color: "bg-teal-500",
    },
  ] as const;

  return (
    <section className='py-16'>
      <div className='mb-12 text-center'>
        <motion.div
          initial={{opacity: 0, y: 20}}
          animate={{opacity: 1, y: 0}}
          transition={{duration: 0.5}}>
          <h2 className='mb-4 text-4xl font-bold tracking-tight'>Development Timeline</h2>
          <p className='text-muted-foreground mx-auto max-w-2xl'>
            The journey of arolariu.ro from inception to the present day, highlighting key milestones along the way.
          </p>
        </motion.div>
      </div>

      <div className='relative mx-auto max-w-4xl'>
        {/* Timeline Line */}
        <div className='bg-primary/20 absolute left-1/2 h-full w-1 -translate-x-1/2 transform rounded-full' />

        {/* Timeline Events */}
        <div className='space-y-12'>
          {timelineEvents.map((event, index) => (
            <motion.div
              key={event.title}
              className='relative'
              initial={{opacity: 0, y: 50}}
              animate={{opacity: 1, y: 0}}
              transition={{duration: 0.5, delay: index * 0.1}}
              onHoverStart={() => setHoveredEvent(index)}
              onHoverEnd={() => setHoveredEvent(null)}>
              <motion.div
                className={`absolute left-1/2 z-10 flex h-12 w-12 -translate-x-1/2 -translate-y-1/2 transform items-center justify-center rounded-full ${event.color}`}
                animate={{
                  scale: hoveredEvent === index ? 1.2 : 1,
                  boxShadow: hoveredEvent === index ? "0 0 15px rgba(var(--primary), 0.5)" : "none",
                }}
                transition={{duration: 0.3}}>
                <event.icon className='text-xl text-white' />
              </motion.div>

              <motion.div
                whileHover={{scale: 1.03}}
                transition={{duration: 0.2}}
                className={`w-5/12 ${index % 2 === 0 ? "ml-auto" : "mr-auto"}`}>
                <Card
                  className={`border-primary/20 transition-all duration-300 ${hoveredEvent === index ? "border-primary shadow-lg" : ""}`}>
                  <CardHeader className='pb-2'>
                    <Badge
                      variant='outline'
                      className='mb-1 flex w-fit items-center gap-1'>
                      <TbCalendar className='h-3 w-3' />
                      {event.date}
                    </Badge>
                    <CardTitle>{event.title}</CardTitle>
                    <CardDescription>{event.description}</CardDescription>
                  </CardHeader>
                </Card>
              </motion.div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
