"use client";

import {Card, CardContent} from "@arolariu/components/card";
import {motion, useInView} from "motion/react";
import {useTranslations} from "next-intl";
import {useRef} from "react";
import {TbLicense, TbScale} from "react-icons/tb";

/**
 * License distribution visualization showing MIT vs Apache breakdown.
 */
export default function LicenseBreakdown(): React.JSX.Element {
  const t = useTranslations("Acknowledgements.licenses");
  const ref = useRef<HTMLElement>(null);
  const isInView = useInView(ref, {once: true, margin: "-100px"});

  // Calculate percentages (69 MIT out of 86 total = ~80%, 17 Apache = ~20%)
  const mitPercentage = Math.round((69 / 86) * 100);
  const apachePercentage = 100 - mitPercentage;

  return (
    <section
      ref={ref}
      className='relative w-full px-4 py-16'>
      <div className='mx-auto max-w-4xl'>
        {/* Section header */}
        <motion.div
          className='mb-12 text-center'
          initial={{opacity: 0, y: 20}}
          animate={isInView ? {opacity: 1, y: 0} : {}}
          transition={{duration: 0.6}}>
          <h2 className='mb-4 text-3xl font-bold'>
            <span className='bg-gradient-to-r from-cyan-500 to-purple-500 bg-clip-text text-transparent'>{t("title")}</span>
          </h2>
        </motion.div>

        {/* License cards */}
        <div className='grid gap-6 md:grid-cols-2'>
          {/* MIT License */}
          <motion.div
            initial={{opacity: 0, x: -30}}
            animate={isInView ? {opacity: 1, x: 0} : {}}
            transition={{delay: 0.2, duration: 0.5}}>
            <Card className='hover:border-primary/30 h-full transition-all duration-300 hover:-translate-y-1'>
              <CardContent className='p-6'>
                <div className='mb-4 flex items-center gap-3'>
                  <div className='rounded-full bg-gradient-to-br from-cyan-500 to-blue-500 p-3'>
                    <TbLicense className='h-6 w-6 text-white' />
                  </div>
                  <div>
                    <h3 className='font-semibold'>{t("mit")}</h3>
                    <p className='text-muted-foreground text-sm'>69 packages</p>
                  </div>
                </div>

                {/* Progress bar */}
                <div className='bg-muted mb-3 h-3 overflow-hidden rounded-full'>
                  <motion.div
                    className='h-full rounded-full bg-gradient-to-r from-cyan-500 to-blue-500'
                    initial={{width: 0}}
                    animate={isInView ? {width: `${mitPercentage}%`} : {}}
                    transition={{delay: 0.5, duration: 1, ease: "easeOut"}}
                  />
                </div>

                <div className='flex items-center justify-between'>
                  <span className='text-muted-foreground text-sm'>{t("mitDescription")}</span>
                  <span className='text-lg font-bold'>{mitPercentage}%</span>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Apache License */}
          <motion.div
            initial={{opacity: 0, x: 30}}
            animate={isInView ? {opacity: 1, x: 0} : {}}
            transition={{delay: 0.3, duration: 0.5}}>
            <Card className='hover:border-primary/30 h-full transition-all duration-300 hover:-translate-y-1'>
              <CardContent className='p-6'>
                <div className='mb-4 flex items-center gap-3'>
                  <div className='rounded-full bg-gradient-to-br from-orange-500 to-red-500 p-3'>
                    <TbScale className='h-6 w-6 text-white' />
                  </div>
                  <div>
                    <h3 className='font-semibold'>{t("apache")}</h3>
                    <p className='text-muted-foreground text-sm'>17 packages</p>
                  </div>
                </div>

                {/* Progress bar */}
                <div className='bg-muted mb-3 h-3 overflow-hidden rounded-full'>
                  <motion.div
                    className='h-full rounded-full bg-gradient-to-r from-orange-500 to-red-500'
                    initial={{width: 0}}
                    animate={isInView ? {width: `${apachePercentage}%`} : {}}
                    transition={{delay: 0.6, duration: 1, ease: "easeOut"}}
                  />
                </div>

                <div className='flex items-center justify-between'>
                  <span className='text-muted-foreground text-sm'>{t("apacheDescription")}</span>
                  <span className='text-lg font-bold'>{apachePercentage}%</span>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
