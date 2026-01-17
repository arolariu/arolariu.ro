"use client";

import {Badge} from "@arolariu/components/badge";
import {Card, CardContent} from "@arolariu/components/card";
import {Tabs, TabsContent, TabsList, TabsTrigger} from "@arolariu/components/tabs";
import {AnimatePresence, motion, useInView} from "motion/react";
import {useTranslations} from "next-intl";
import {useRef, useState} from "react";
import {
  TbBrandAzure,
  TbBrandCSharp,
  TbBrandCss3,
  TbBrandDocker,
  TbBrandGit,
  TbBrandGithub,
  TbBrandNextjs,
  TbBrandNodejs,
  TbBrandNpm,
  TbBrandReact,
  TbBrandTailwind,
  TbBrandTypescript,
  TbBrandVercel,
  TbCloud,
  TbCode,
  TbDatabase,
  TbDeviceAnalytics,
  TbFileDatabase,
  TbServer,
  TbStackFront,
  TbTestPipe,
  TbTools,
} from "react-icons/tb";

interface TechConfig {
  id: string;
  icon: React.ComponentType<{className?: string}>;
  version?: string;
}

interface CategoryConfig {
  id: string;
  icon: React.ComponentType<{className?: string}>;
  color: string;
  technologies: TechConfig[];
}

const categoryConfigs: CategoryConfig[] = [
  {
    id: "frontend",
    icon: TbStackFront,
    color: "from-blue-500 to-cyan-500",
    technologies: [
      {id: "react", icon: TbBrandReact, version: "19"},
      {id: "nextjs", icon: TbBrandNextjs, version: "16"},
      {id: "typescript", icon: TbBrandTypescript, version: "5.x"},
      {id: "tailwind", icon: TbBrandTailwind, version: "4.x"},
      {id: "zustand", icon: TbCode, version: "5.x"},
      {id: "motion", icon: TbDeviceAnalytics, version: "11.x"},
    ],
  },
  {
    id: "backend",
    icon: TbServer,
    color: "from-purple-500 to-violet-500",
    technologies: [
      {id: "dotnet", icon: TbBrandCSharp, version: "10"},
      {id: "aspnet", icon: TbServer, version: "10"},
      {id: "nodejs", icon: TbBrandNodejs, version: "24 LTS"},
      {id: "cosmosdb", icon: TbDatabase},
      {id: "azuresql", icon: TbFileDatabase},
      {id: "redis", icon: TbDatabase},
    ],
  },
  {
    id: "cloud",
    icon: TbCloud,
    color: "from-orange-500 to-amber-500",
    technologies: [
      {id: "azure", icon: TbBrandAzure},
      {id: "vercel", icon: TbBrandVercel},
      {id: "docker", icon: TbBrandDocker},
      {id: "githubActions", icon: TbBrandGithub},
      {id: "bicep", icon: TbCloud},
      {id: "azureDevops", icon: TbBrandAzure},
    ],
  },
  {
    id: "tooling",
    icon: TbTools,
    color: "from-green-500 to-emerald-500",
    technologies: [
      {id: "git", icon: TbBrandGit},
      {id: "eslint", icon: TbCode},
      {id: "prettier", icon: TbBrandCss3},
      {id: "vitest", icon: TbTestPipe},
      {id: "playwright", icon: TbTestPipe},
      {id: "pnpm", icon: TbBrandNpm},
    ],
  },
];

const statIds = ["technologies", "coverage", "typescript", "security"];

/**
 * Enhanced TechStack component displaying technologies used in the platform.
 * Features tabbed navigation with animated cards and detailed descriptions.
 * @returns The TechStack component, CSR'ed.
 */
export default function TechStack(): React.JSX.Element {
  const t = useTranslations("About.Platform.techStack");
  const ref = useRef<HTMLElement>(null);
  const isInView = useInView(ref, {once: true, margin: "-100px"});
  const [activeTab, setActiveTab] = useState<string>("frontend");
  const [hoveredTech, setHoveredTech] = useState<string | null>(null);

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
            <span className='bg-gradient-to-r from-blue-500 via-purple-500 to-orange-500 bg-clip-text text-transparent'>
              {t("titleHighlight")}
            </span>
          </h2>
          <p className='text-muted-foreground text-lg md:text-xl'>{t("description")}</p>
        </motion.div>

        {/* Tabs */}
        <Tabs
          defaultValue='frontend'
          value={activeTab}
          onValueChange={setActiveTab}
          className='mx-auto max-w-6xl'>
          {/* Tab List */}
          <motion.div
            className='mb-12 flex justify-center'
            initial={{opacity: 0, y: 20}}
            animate={isInView ? {opacity: 1, y: 0} : {}}
            transition={{duration: 0.5, delay: 0.2}}>
            <TabsList className='bg-muted/50 grid h-auto grid-cols-2 gap-2 p-2 backdrop-blur-sm md:grid-cols-4'>
              {categoryConfigs.map((category) => (
                <TabsTrigger
                  key={category.id}
                  value={category.id}
                  className='data-[state=active]:bg-background relative flex items-center gap-2 px-4 py-3 transition-all'>
                  <category.icon className='h-4 w-4' />
                  <span className='hidden sm:inline'>{t(`categories.${category.id}.name` as Parameters<typeof t>[0])}</span>
                  {activeTab === category.id && (
                    <motion.span
                      className={`absolute inset-x-0 -bottom-px h-0.5 bg-gradient-to-r ${category.color}`}
                      layoutId='activeTechTab'
                    />
                  )}
                </TabsTrigger>
              ))}
            </TabsList>
          </motion.div>

          {/* Tab Content */}
          <AnimatePresence mode='wait'>
            {categoryConfigs.map((category) => (
              <TabsContent
                key={category.id}
                value={category.id}
                className='mt-0 focus-visible:ring-0 focus-visible:outline-none'>
                <motion.div
                  initial={{opacity: 0, y: 20}}
                  animate={{opacity: 1, y: 0}}
                  exit={{opacity: 0, y: -20}}
                  transition={{duration: 0.3}}>
                  {/* Category Description */}
                  <div className='mb-8 text-center'>
                    <p className='text-muted-foreground text-lg'>{t(`categories.${category.id}.description` as Parameters<typeof t>[0])}</p>
                  </div>

                  {/* Technologies Grid */}
                  <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-3'>
                    {category.technologies.map((tech, index) => (
                      <motion.div
                        key={tech.id}
                        initial={{opacity: 0, y: 20}}
                        animate={{opacity: 1, y: 0}}
                        transition={{duration: 0.3, delay: index * 0.05}}
                        // eslint-disable-next-line react/jsx-no-bind -- simple page
                        onHoverStart={() => setHoveredTech(tech.id)}
                        // eslint-disable-next-line react/jsx-no-bind -- simple page
                        onHoverEnd={() => setHoveredTech(null)}>
                        <Card
                          className={`group relative h-full overflow-hidden transition-all duration-300 ${
                            hoveredTech === tech.id ? "border-primary shadow-primary/10 shadow-lg" : "hover:border-primary/30"
                          }`}>
                          {/* Gradient overlay */}
                          <motion.div
                            className={`absolute inset-0 bg-gradient-to-br ${category.color} transition-opacity duration-300`}
                            style={{opacity: hoveredTech === tech.id ? 0.1 : 0}}
                          />

                          <CardContent className='relative flex items-start gap-4 p-5'>
                            {/* Icon */}
                            <motion.div
                              className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${category.color}`}
                              animate={{
                                scale: hoveredTech === tech.id ? 1.1 : 1,
                                rotate: hoveredTech === tech.id ? 5 : 0,
                              }}
                              transition={{duration: 0.3}}>
                              <tech.icon className='h-6 w-6 text-white' />
                            </motion.div>

                            {/* Content */}
                            <div className='min-w-0 flex-1'>
                              <div className='mb-1 flex items-center gap-2'>
                                <h3 className='font-semibold'>{t(`technologies.${tech.id}.name` as Parameters<typeof t>[0])}</h3>
                                {tech.version !== undefined && (
                                  <Badge
                                    variant='secondary'
                                    className='text-xs'>
                                    v{tech.version}
                                  </Badge>
                                )}
                              </div>
                              <p className='text-muted-foreground text-sm'>
                                {t(`technologies.${tech.id}.description` as Parameters<typeof t>[0])}
                              </p>
                            </div>
                          </CardContent>

                          {/* Animated border */}
                          <motion.div
                            className={`absolute inset-x-0 bottom-0 h-0.5 bg-gradient-to-r ${category.color}`}
                            initial={{scaleX: 0}}
                            animate={{scaleX: hoveredTech === tech.id ? 1 : 0}}
                            transition={{duration: 0.3}}
                            style={{transformOrigin: "left"}}
                          />
                        </Card>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              </TabsContent>
            ))}
          </AnimatePresence>
        </Tabs>

        {/* Tech Stats */}
        <motion.div
          className='mx-auto mt-16 grid max-w-4xl gap-6 sm:grid-cols-2 lg:grid-cols-4'
          initial={{opacity: 0, y: 30}}
          animate={isInView ? {opacity: 1, y: 0} : {}}
          transition={{duration: 0.6, delay: 0.5}}>
          {statIds.map((statId, index) => (
            <motion.div
              key={statId}
              className='bg-muted/30 rounded-xl p-6 text-center backdrop-blur-sm'
              initial={{opacity: 0, y: 20}}
              animate={isInView ? {opacity: 1, y: 0} : {}}
              transition={{duration: 0.5, delay: 0.6 + index * 0.1}}
              whileHover={{scale: 1.05, transition: {duration: 0.2}}}>
              <div className='text-primary mb-1 text-3xl font-bold'>{t(`stats.${statId}.value` as Parameters<typeof t>[0])}</div>
              <div className='font-medium'>{t(`stats.${statId}.label` as Parameters<typeof t>[0])}</div>
              <div className='text-muted-foreground text-sm'>{t(`stats.${statId}.description` as Parameters<typeof t>[0])}</div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
