"use client";

import {Badge, Button, Card, CardContent, CardFooter, CardHeader} from "@arolariu/components";
import {motion, useInView} from "motion/react";
import {useTranslations} from "next-intl";
import Image from "next/image";
import Link from "next/link";
import {useRef} from "react";
import {TbArrowRight, TbCheck} from "react-icons/tb";

type NavigationKey = "platform" | "author";

const navigationItems: Array<{
  key: NavigationKey;
  href: string;
  image: string;
  gradient: string;
}> = [
  {
    key: "platform",
    href: "/about/the-platform",
    image: "/images/about/platform-thumbnail.svg",
    gradient: "from-blue-500/20 via-cyan-500/10 to-transparent",
  },
  {
    key: "author",
    href: "/about/the-author",
    image: "/images/about/author-thumbnail.svg",
    gradient: "from-purple-500/20 via-pink-500/10 to-transparent",
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
      className='relative w-full bg-gradient-to-b from-transparent via-purple-500/5 to-transparent px-4 py-20'>
      <div className='mx-auto max-w-6xl'>
        {/* Section header */}
        <motion.div
          className='mb-16 text-center'
          initial={{opacity: 0, y: 20}}
          animate={isInView ? {opacity: 1, y: 0} : {}}
          transition={{duration: 0.6}}>
          <h2 className='blue-underline mb-4 inline-block text-3xl font-bold sm:text-4xl'>{t("title")}</h2>
          <p className='text-muted-foreground mx-auto max-w-2xl text-lg'>{t("subtitle")}</p>
        </motion.div>

        {/* Navigation cards */}
        <div className='grid gap-8 md:grid-cols-2'>
          {navigationItems.map((item, index) => (
            <motion.div
              key={item.key}
              initial={{opacity: 0, x: index === 0 ? -30 : 30}}
              animate={isInView ? {opacity: 1, x: 0} : {}}
              transition={{delay: 0.3 + index * 0.15, duration: 0.5}}>
              <Card className='group bg-card/50 hover:border-primary/40 relative h-full overflow-hidden border backdrop-blur-sm transition-all duration-500 hover:-translate-y-1 hover:shadow-2xl'>
                {/* Gradient overlay */}
                <div
                  className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${item.gradient} opacity-0 transition-opacity duration-500 group-hover:opacity-100`}
                  aria-hidden='true'
                />

                <CardHeader className='relative pb-4'>
                  {/* Image container */}
                  <div className='from-muted/30 to-muted/10 relative mx-auto flex h-40 w-40 items-center justify-center rounded-2xl bg-gradient-to-br p-4 transition-transform duration-300 group-hover:scale-105'>
                    <Image
                      src={item.image}
                      alt={t(`${item.key}.title`)}
                      width={120}
                      height={120}
                      className='h-full w-full object-contain drop-shadow-lg'
                    />
                  </div>
                </CardHeader>

                <CardContent className='relative space-y-4'>
                  <div className='text-center'>
                    <h3 className='mb-2 text-2xl font-bold'>{t(`${item.key}.title`)}</h3>
                    <p className='text-muted-foreground text-sm leading-relaxed'>{t(`${item.key}.subtitle`)}</p>
                  </div>

                  {/* Feature list */}
                  <ul className='space-y-2'>
                    {[0, 1, 2].map((featureIndex) => (
                      <li
                        key={featureIndex}
                        className='text-muted-foreground flex items-center gap-2 text-sm'>
                        <Badge
                          variant='secondary'
                          className='h-5 w-5 shrink-0 p-0'>
                          <TbCheck className='h-3 w-3' />
                        </Badge>
                        <span>{t(`${item.key}.features.${featureIndex}`)}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>

                <CardFooter className='relative pt-4'>
                  <Button
                    asChild
                    className='group/btn w-full'
                    size='lg'>
                    <Link href={item.href}>
                      {t(`${item.key}.cta`)}
                      <TbArrowRight className='ml-2 h-4 w-4 transition-transform group-hover/btn:translate-x-1' />
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
