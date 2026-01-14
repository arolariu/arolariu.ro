"use client";

import {Avatar, AvatarFallback} from "@arolariu/components/avatar";
import {Card, CardContent} from "@arolariu/components/card";
import {motion, useInView} from "motion/react";
import {useTranslations} from "next-intl";
import {useRef} from "react";
import {TbPackage} from "react-icons/tb";

const contributors = ["c1", "c2", "c3", "c4"] as const;

const gradients = ["from-cyan-500 to-blue-500", "from-blue-600 to-purple-600", "from-purple-500 to-pink-500", "from-amber-500 to-orange-500"];

/**
 * Top contributors section showing major package authors.
 */
export default function Contributors(): React.JSX.Element {
  const t = useTranslations("Acknowledgements.contributors");
  const ref = useRef<HTMLElement>(null);
  const isInView = useInView(ref, {once: true, margin: "-100px"});

  return (
    <section
      ref={ref}
      className='relative w-full bg-gradient-to-b from-transparent via-purple-500/5 to-transparent px-4 py-16'>
      <div className='mx-auto max-w-6xl'>
        {/* Section header */}
        <motion.div
          className='mb-12 text-center'
          initial={{opacity: 0, y: 20}}
          animate={isInView ? {opacity: 1, y: 0} : {}}
          transition={{duration: 0.6}}>
          <h2 className='mb-4 text-3xl font-bold'>
            <span className='bg-gradient-to-r from-cyan-500 to-purple-500 bg-clip-text text-transparent'>{t("title")}</span>
          </h2>
          <p className='text-muted-foreground mx-auto max-w-2xl'>{t("subtitle")}</p>
        </motion.div>

        {/* Contributors grid */}
        <div className='grid gap-6 sm:grid-cols-2 lg:grid-cols-4'>
          {contributors.map((key, index) => (
            <motion.div
              key={key}
              initial={{opacity: 0, y: 30}}
              animate={isInView ? {opacity: 1, y: 0} : {}}
              transition={{delay: 0.2 + index * 0.1, duration: 0.5}}>
              <Card className='group hover:border-primary/30 h-full transition-all duration-300 hover:-translate-y-1 hover:shadow-lg'>
                <CardContent className='flex flex-col items-center p-6 text-center'>
                  {/* Avatar */}
                  <Avatar className='mb-4 h-16 w-16'>
                    <AvatarFallback className={`bg-gradient-to-br ${gradients[index]} text-lg font-bold text-white`}>
                      {t(`items.${key}.name`)
                        .split(" ")
                        .slice(0, 2)
                        .map((n) => n.charAt(0))
                        .join("")}
                    </AvatarFallback>
                  </Avatar>

                  {/* Name */}
                  <h3 className='mb-1 font-semibold'>{t(`items.${key}.name`)}</h3>

                  {/* Package count */}
                  <div className='text-primary mb-2 flex items-center gap-1 text-sm font-medium'>
                    <TbPackage className='h-4 w-4' />
                    <span>{t(`items.${key}.packages`)} packages</span>
                  </div>

                  {/* Description */}
                  <p className='text-muted-foreground text-sm'>{t(`items.${key}.description`)}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
