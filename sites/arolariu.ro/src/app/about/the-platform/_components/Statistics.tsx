/** @format */

"use client";

import {Card, CardContent} from "@arolariu/components";
import {motion} from "motion/react";
import {TbCode, TbGlobe, TbServer, TbUser} from "react-icons/tb";

/**
 * The Statistics component displays key metrics and statistics about the arolariu.ro platform.
 * @returns The Statistics component, CSR'ed.
 */
export default function Statistics() {
  const stats = [
    {
      value: 10,
      label: "Projects",
      icon: TbCode,
      description: "Open-source and private projects",
      suffix: "+",
    },
    {
      value: 5,
      label: "APIs",
      icon: TbServer,
      description: "Backend services and APIs",
      suffix: "+",
    },
    {
      value: 1000,
      label: "Users",
      icon: TbUser,
      description: "Active platform users",
      suffix: "+",
    },
    {
      value: 20,
      label: "Countries",
      icon: TbGlobe,
      description: "Global user distribution",
      suffix: "+",
    },
  ] as const;

  return (
    <section className='py-16'>
      <div className='mb-12 text-center'>
        <motion.div
          initial={{opacity: 0, y: 20}}
          animate={{opacity: 1, y: 0}}
          transition={{duration: 0.5}}>
          <h2 className='mb-4 text-4xl font-bold tracking-tight'>Platform Stats</h2>
          <p className='text-muted-foreground mx-auto max-w-2xl'>
            Key metrics and statistics about the arolariu.ro platform and its usage.
          </p>
        </motion.div>
      </div>

      <div className='mx-auto grid max-w-6xl grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4'>
        {stats.map((stat, index) => (
          <motion.div
            key={stat.label}
            initial={{opacity: 0, y: 20}}
            animate={{opacity: 1, y: 0}}
            transition={{duration: 0.5, delay: index * 0.1}}
            whileHover={{
              y: -10,
              transition: {duration: 0.2},
            }}>
            <Card className='border-primary/20 hover:border-primary/30 h-full transition-all duration-300 hover:shadow-md'>
              <CardContent className='flex flex-col items-center p-6 text-center'>
                <motion.div
                  className='bg-primary/10 mb-4 flex h-16 w-16 items-center justify-center rounded-full'
                  whileHover={{
                    rotate: 360,
                    transition: {duration: 0.8},
                  }}>
                  <stat.icon className='text-primary h-8 w-8' />
                </motion.div>
                <div className='space-y-1'>
                  <h3 className='text-primary text-4xl font-bold'>
                    {stat.value}
                    {stat.suffix}
                  </h3>
                  <p className='font-medium'>{stat.label}</p>
                  <p className='text-muted-foreground text-sm'>{stat.description}</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
