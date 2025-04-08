/** @format */

"use client";

import {Badge, Button} from "@arolariu/components";
import {motion} from "motion/react";
import {useTranslations} from "next-intl";
import {TbCheck, TbExternalLink} from "react-icons/tb";

/**
 * This component showcases the technology stack used in the platform.
 * It highlights the modern architecture and the technologies employed.
 * @returns The technology showcase section of the homepage, CSR'ed.
 */
export default function TechnologiesSection(): React.JSX.Element {
  const t = useTranslations("Home.technologyTab");

  const points = [
    {
      check: <TbCheck className='inline h-6 w-6 text-blue-500' />,
      text: t("points.point1"),
    },
    {
      check: <TbCheck className='inline h-6 w-6 text-blue-500' />,
      text: t("points.point2"),
    },
    {
      check: <TbCheck className='inline h-6 w-6 text-blue-500' />,
      text: t("points.point3"),
    },
  ];

  return (
    <section className='relative py-20'>
      <div className='from-background to-background absolute inset-0 bg-linear-to-b via-purple-200 backdrop-blur-xs dark:via-blue-950' />
      <div className='relative z-10 container mx-auto px-4'>
        <div className='grid grid-cols-1 items-center gap-16 lg:grid-cols-2'>
          <motion.div
            initial={{opacity: 0, x: -30}}
            whileInView={{opacity: 1, x: 0}}
            viewport={{once: true}}
            transition={{duration: 0.8}}>
            <Badge className='text-md rounded-xl bg-linear-to-r from-cyan-500 via-pink-500 to-purple-500'>{t("badgeTitle")}</Badge>
            <h2 className='mb-6 text-3xl font-bold md:text-4xl'>{t("title")}</h2>
            <span className='text-muted-foreground mb-6 block text-lg'>{t("description")}</span>
            <ul className='mb-8 space-y-4'>
              {points.map((point) => (
                <li
                  key={point.text}
                  className='flex items-center space-x-4'>
                  {point.check}
                  <span>{point.text}</span>
                </li>
              ))}
            </ul>
            <Button className='w-full'>
              {t("learnMoreBtn")} <TbExternalLink className='ml-2 h-4 w-4' />
            </Button>
          </motion.div>

          <motion.div
            initial={{opacity: 0, scale: 0.9}}
            whileInView={{opacity: 1, scale: 1}}
            viewport={{once: true}}
            transition={{duration: 0.8}}
            className='relative'>
            <div className='border-primary/20 bg-card/30 relative rounded-lg border p-2 shadow-xl backdrop-blur-xs'>
              <div className='bg-background absolute -top-3 left-4 px-2 py-1 text-xs font-medium'>architecture.tsx</div>
              <pre className='language-typescript overflow-x-auto p-4 text-sm'>
                <code className='text-foreground'>
                  {`const platform = {
  frontend: {
    framework: "Next.js 14",
    styling: "TailwindCSS",
    stateManagement: "React Context + Hooks",
    dataFetching: "Relay GraphQL"
  },

  backend: {
    language: "C#",
    framework: ".NET 8",
    api: "ASP.NET Minimal APIs",
    database: "Azure SQL"
  },

  deployment: {
    platform: "Azure App Services",
    ci_cd: "GitHub Actions",
    monitoring: "OpenTelemetry",
    scaling: "Auto-scaling enabled"
  }
} satisfies arolariu.ro; // ✅`}
                </code>
              </pre>
            </div>

            {/* Decorative elements */}
            <div className='bg-primary/30 absolute -top-6 -right-6 h-12 w-12 rounded-full blur-xl' />
            <div className='absolute -bottom-6 -left-6 h-12 w-12 rounded-full bg-purple-500/30 blur-xl' />
          </motion.div>
        </div>
      </div>
    </section>
  );
}
