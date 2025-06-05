/** @format */

"use client";

import {Avatar, AvatarFallback, AvatarImage} from "@arolariu/components/avatar";
import {Card, CardContent} from "@arolariu/components/card";
import {motion} from "motion/react";
import {useTranslations} from "next-intl";
import {TbQuote} from "react-icons/tb";
import {useInView} from "react-intersection-observer";

type PerspectiveType = {
  author: string;
  avatar: string;
  position: string;
  company: string;
  quote: string;
};

const Perspective = ({perspective}: Readonly<{perspective: PerspectiveType}>): React.JSX.Element => {
  return (
    <Card className='bg-card h-full overflow-visible border-none shadow-lg transition-all duration-300 hover:shadow-xl'>
      <CardContent className='relative px-6 pt-12 pb-8'>
        <div className='bg-primary absolute -top-8 left-6 rounded-full p-4 shadow-lg'>
          <TbQuote className='text-primary-foreground h-6 w-6' />
        </div>
        <p className='text-muted-foreground mb-6 italic'>&ldquo;{perspective.quote}&rdquo;</p>
        <div className='flex items-center gap-4'>
          <Avatar>
            <AvatarImage
              src={perspective.avatar}
              alt={perspective.author}
            />
            <AvatarFallback>
              {perspective.author
                .split(" ")
                .map((n) => n[0])
                .join("")}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className='font-medium'>{perspective.author}</p>
            <p className='text-muted-foreground text-sm'>
              {perspective.position} - {perspective.company}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

/**
 * @description A React component that displays a section of perspectives from various authors.
 * @returns A section element containing a grid of perspective cards with animation effects
 */
export default function Perspectives(): React.JSX.Element {
  const t = useTranslations("About.Author.Perspectives");
  const [ref, inView] = useInView({
    triggerOnce: true,
    threshold: 0.1,
  });

  const perspectives = [
    {
      author: t("perspectiveFromX.author"),
      avatar: t("perspectiveFromX.avatar"),
      position: t("perspectiveFromX.position"),
      company: t("perspectiveFromX.company"),
      quote: t("perspectiveFromX.quote"),
    },
    {
      author: t("perspectiveFromY.author"),
      avatar: t("perspectiveFromY.avatar"),
      position: t("perspectiveFromY.position"),
      company: t("perspectiveFromY.company"),
      quote: t("perspectiveFromY.quote"),
    },
    {
      author: t("perspectiveFromZ.author"),
      avatar: t("perspectiveFromZ.avatar"),
      position: t("perspectiveFromZ.position"),
      company: t("perspectiveFromZ.company"),
      quote: t("perspectiveFromZ.quote"),
    },
    {
      author: t("perspectiveFromXX.author"),
      avatar: t("perspectiveFromXX.avatar"),
      position: t("perspectiveFromXX.position"),
      company: t("perspectiveFromXX.company"),
      quote: t("perspectiveFromXX.quote"),
    },
    {
      author: t("perspectiveFromXY.author"),
      avatar: t("perspectiveFromXY.avatar"),
      position: t("perspectiveFromXY.position"),
      company: t("perspectiveFromXY.company"),
      quote: t("perspectiveFromXY.quote"),
    },
    {
      author: t("perspectiveFromXZ.author"),
      avatar: t("perspectiveFromXZ.avatar"),
      position: t("perspectiveFromXZ.position"),
      company: t("perspectiveFromXZ.company"),
      quote: t("perspectiveFromXZ.quote"),
    },
  ] satisfies PerspectiveType[];

  const containerVariants = {
    hidden: {opacity: 0},
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2,
      },
    },
  };

  const itemVariants = {
    hidden: {opacity: 0, y: 30},
    visible: {opacity: 1, y: 0, transition: {duration: 0.6}},
  };

  return (
    <section
      ref={ref}
      className='bg-muted/30 px-4 py-20 md:px-8'>
      <div className='mx-auto max-w-6xl'>
        <motion.div
          initial={{opacity: 0, y: 20}}
          animate={inView ? {opacity: 1, y: 0} : {opacity: 0, y: 20}}
          transition={{duration: 0.6}}
          className='mb-16 text-center'>
          <h2 className='relative mb-4 inline-block text-3xl font-bold md:text-4xl'>
            {t("title")}
            <span className='from-primary to-primary/30 absolute right-0 -bottom-2 left-0 h-1 rounded-full bg-linear-to-r' />
          </h2>
          <p className='text-muted-foreground mx-auto max-w-2xl'>{t("subtitle")}</p>
        </motion.div>

        <motion.div
          variants={containerVariants}
          initial='hidden'
          animate={inView ? "visible" : "hidden"}
          className='grid gap-8 md:grid-cols-2 lg:grid-cols-3'>
          {perspectives.map((perspective) => (
            <motion.div
              key={perspective.quote.slice(0, 20)}
              variants={itemVariants}>
              <Perspective perspective={perspective} />
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
