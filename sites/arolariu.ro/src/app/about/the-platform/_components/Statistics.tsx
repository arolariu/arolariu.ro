"use client";

import {Badge} from "@arolariu/components/badge";
import {Card, CardContent} from "@arolariu/components/card";
import {CountingNumber} from "@arolariu/components/counting-number";
import {motion, useInView} from "motion/react";
import {useRef} from "react";
import {TbBrandGithub, TbCode, TbFileCode, TbGitCommit, TbGlobe, TbServer, TbStar, TbUsers} from "react-icons/tb";

interface Stat {
  id: string;
  value: number;
  suffix: string;
  label: string;
  description: string;
  icon: React.ComponentType<{className?: string}>;
  color: string;
  gradient: string;
}

const stats: Stat[] = [
  {
    id: "projects",
    value: 15,
    suffix: "+",
    label: "Active Projects",
    description: "Open-source repositories",
    icon: TbCode,
    color: "text-blue-500",
    gradient: "from-blue-500 to-cyan-500",
  },
  {
    id: "commits",
    value: 2500,
    suffix: "+",
    label: "Git Commits",
    description: "Code contributions",
    icon: TbGitCommit,
    color: "text-purple-500",
    gradient: "from-purple-500 to-violet-500",
  },
  {
    id: "lines",
    value: 150,
    suffix: "K+",
    label: "Lines of Code",
    description: "Written with care",
    icon: TbFileCode,
    color: "text-green-500",
    gradient: "from-green-500 to-emerald-500",
  },
  {
    id: "apis",
    value: 8,
    suffix: "+",
    label: "API Endpoints",
    description: "RESTful services",
    icon: TbServer,
    color: "text-orange-500",
    gradient: "from-orange-500 to-amber-500",
  },
  {
    id: "users",
    value: 1000,
    suffix: "+",
    label: "Active Users",
    description: "Platform adoption",
    icon: TbUsers,
    color: "text-pink-500",
    gradient: "from-pink-500 to-rose-500",
  },
  {
    id: "countries",
    value: 25,
    suffix: "+",
    label: "Countries",
    description: "Global reach",
    icon: TbGlobe,
    color: "text-cyan-500",
    gradient: "from-cyan-500 to-teal-500",
  },
  {
    id: "stars",
    value: 50,
    suffix: "+",
    label: "GitHub Stars",
    description: "Community recognition",
    icon: TbStar,
    color: "text-yellow-500",
    gradient: "from-yellow-500 to-orange-500",
  },
  {
    id: "contributors",
    value: 5,
    suffix: "+",
    label: "Contributors",
    description: "Open source community",
    icon: TbBrandGithub,
    color: "text-indigo-500",
    gradient: "from-indigo-500 to-purple-500",
  },
];

/**
 * Enhanced Statistics component displaying platform metrics.
 * Features animated counting numbers and interactive hover effects.
 * @returns The Statistics component, CSR'ed.
 */
export default function Statistics(): React.JSX.Element {
  const ref = useRef<HTMLElement>(null);
  const isInView = useInView(ref, {once: true, margin: "-100px"});

  return (
    <section
      ref={ref}
      className='relative py-24'>
      {/* Background */}
      <div className='absolute inset-0 -z-10'>
        <div className='from-background to-background via-muted/30 absolute inset-0 bg-gradient-to-b' />
        <div className='absolute inset-0 bg-[linear-gradient(to_right,#80808008_1px,transparent_1px),linear-gradient(to_bottom,#80808008_1px,transparent_1px)] bg-[size:32px_32px]' />
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
              Platform Metrics
            </Badge>
          </motion.div>
          <h2 className='mb-6 text-4xl font-bold tracking-tight md:text-5xl'>
            Numbers that{" "}
            <span className='bg-gradient-to-r from-green-500 via-blue-500 to-purple-500 bg-clip-text text-transparent'>speak for themselves</span>
          </h2>
          <p className='text-muted-foreground text-lg md:text-xl'>
            A growing platform with an active community, continuous development, and real-world usage across the globe.
          </p>
        </motion.div>

        {/* Stats Grid */}
        <div className='mx-auto grid max-w-6xl gap-6 sm:grid-cols-2 lg:grid-cols-4'>
          {stats.map((stat, index) => (
            <motion.div
              key={stat.id}
              initial={{opacity: 0, y: 30}}
              animate={isInView ? {opacity: 1, y: 0} : {}}
              transition={{duration: 0.5, delay: index * 0.1}}
              whileHover={{
                y: -8,
                transition: {duration: 0.2},
              }}>
              <Card className='group relative h-full overflow-hidden transition-all duration-300 hover:shadow-lg hover:shadow-primary/10'>
                {/* Gradient overlay on hover */}
                <motion.div
                  className={`absolute inset-0 bg-gradient-to-br ${stat.gradient} opacity-0 transition-opacity duration-300 group-hover:opacity-10`}
                />

                <CardContent className='relative flex flex-col items-center p-8 text-center'>
                  {/* Icon */}
                  <motion.div
                    className={`mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br ${stat.gradient}`}
                    whileHover={{
                      rotate: 360,
                      scale: 1.1,
                    }}
                    transition={{duration: 0.6}}>
                    <stat.icon className='h-8 w-8 text-white' />
                  </motion.div>

                  {/* Value */}
                  <div className='mb-2 flex items-baseline gap-1'>
                    <CountingNumber
                      number={stat.value}
                      inView
                      className={`text-4xl font-bold ${stat.color}`}
                      transition={{stiffness: 50, damping: 30}}
                    />
                    <span className={`text-2xl font-bold ${stat.color}`}>{stat.suffix}</span>
                  </div>

                  {/* Label */}
                  <h3 className='mb-1 text-lg font-semibold'>{stat.label}</h3>
                  <p className='text-muted-foreground text-sm'>{stat.description}</p>
                </CardContent>

                {/* Animated border */}
                <motion.div
                  className={`absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r ${stat.gradient}`}
                  initial={{scaleX: 0}}
                  whileHover={{scaleX: 1}}
                  transition={{duration: 0.3}}
                  style={{transformOrigin: "left"}}
                />
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Additional Info */}
        <motion.div
          className='mx-auto mt-16 max-w-4xl'
          initial={{opacity: 0, y: 30}}
          animate={isInView ? {opacity: 1, y: 0} : {}}
          transition={{duration: 0.6, delay: 0.8}}>
          <Card className='bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-pink-500/10 border-0'>
            <CardContent className='p-8 text-center'>
              <h3 className='mb-4 text-2xl font-bold'>Growing Every Day</h3>
              <p className='text-muted-foreground mx-auto max-w-2xl text-lg'>
                These numbers are updated in real-time and reflect the continuous growth and adoption of the platform. Join the community and be part
                of the journey!
              </p>
              <div className='mt-6 flex flex-wrap justify-center gap-4'>
                <Badge
                  variant='secondary'
                  className='px-4 py-2'>
                  Updated Daily
                </Badge>
                <Badge
                  variant='secondary'
                  className='px-4 py-2'>
                  Open Source
                </Badge>
                <Badge
                  variant='secondary'
                  className='px-4 py-2'>
                  Community Driven
                </Badge>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </section>
  );
}
