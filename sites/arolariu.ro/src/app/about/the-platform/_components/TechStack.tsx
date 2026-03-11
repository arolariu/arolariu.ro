"use client";

import {Badge} from "@arolariu/components/badge";
import {Card, CardContent} from "@arolariu/components/card";
import {CountingNumber} from "@arolariu/components/counting-number";
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
  TbBrandTypescript,
  TbBrandVercel,
  TbCloud,
  TbCode,
  TbDatabase,
  TbDeviceAnalytics,
  TbFileDatabase,
  TbGlobe,
  TbServer,
  TbStackFront,
  TbStar,
  TbTestPipe,
  TbTools,
  TbUsers,
  TbWorld,
} from "react-icons/tb";
import styles from "./TechStack.module.scss";

interface TechConfig {
  id: string;
  icon: React.ComponentType<{className?: string}>;
  version?: string;
}

interface CategoryConfig {
  id: string;
  icon: React.ComponentType<{className?: string}>;
  colorKey: "blueCyan" | "purpleViolet" | "orangeAmber" | "greenEmerald";
  technologies: TechConfig[];
}

interface StatConfig {
  id: string;
  icon: React.ComponentType<{className?: string}>;
  gradientKey: "blue" | "purple" | "green" | "orange" | "pink" | "indigo" | "yellow" | "teal";
}

const gradientClassMap = {
  blueCyan: "gradientBlueCyan",
  purpleViolet: "gradientPurpleViolet",
  orangeAmber: "gradientOrangeAmber",
  greenEmerald: "gradientGreenEmerald",
} as const;

const iconClassMap = {
  blue: "iconBlue",
  purple: "iconPurple",
  green: "iconGreen",
  orange: "iconOrange",
  pink: "iconPink",
  indigo: "iconIndigo",
  yellow: "iconYellow",
  teal: "iconTeal",
} as const;

const borderClassMap = {
  blue: "borderBlue",
  purple: "borderPurple",
  green: "borderGreen",
  orange: "borderOrange",
  pink: "borderPink",
  indigo: "borderIndigo",
  yellow: "borderYellow",
  teal: "borderTeal",
} as const;

const categoryConfigs: CategoryConfig[] = [
  {
    id: "frontend",
    icon: TbStackFront,
    colorKey: "blueCyan",
    technologies: [
      {id: "react", icon: TbBrandReact, version: "19"},
      {id: "nextjs", icon: TbBrandNextjs, version: "16"},
      {id: "typescript", icon: TbBrandTypescript, version: "5.x"},
      {id: "scss", icon: TbBrandCss3, version: "1.x"},
      {id: "zustand", icon: TbCode, version: "5.x"},
      {id: "motion", icon: TbDeviceAnalytics, version: "11.x"},
    ],
  },
  {
    id: "backend",
    icon: TbServer,
    colorKey: "purpleViolet",
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
    colorKey: "orangeAmber",
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
    colorKey: "greenEmerald",
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

const statConfigs: StatConfig[] = [
  {id: "projects", icon: TbCode, gradientKey: "blue"},
  {id: "commits", icon: TbBrandGithub, gradientKey: "purple"},
  {id: "linesOfCode", icon: TbDatabase, gradientKey: "green"},
  {id: "apis", icon: TbServer, gradientKey: "orange"},
  {id: "users", icon: TbUsers, gradientKey: "pink"},
  {id: "countries", icon: TbWorld, gradientKey: "indigo"},
  {id: "stars", icon: TbStar, gradientKey: "yellow"},
  {id: "contributors", icon: TbGlobe, gradientKey: "teal"},
];

/**
 * Enhanced TechStack component displaying technologies used in the platform.
 * Features tabbed navigation with animated cards, detailed descriptions,
 * and merged platform statistics with animated counters.
 * @returns The TechStack component, CSR'ed.
 */
export default function TechStack(): React.JSX.Element {
  const t = useTranslations("About.Platform.techStack");
  const tStats = useTranslations("About.Platform.statistics");
  const ref = useRef<HTMLElement>(null);
  const isInView = useInView(ref, {once: true, margin: "-100px"});
  const [activeTab, setActiveTab] = useState<string>("frontend");
  const [hoveredTech, setHoveredTech] = useState<string | null>(null);
  const [hoveredStat, setHoveredStat] = useState<string | null>(null);

  return (
    <section
      ref={ref}
      className={styles["section"]}>
      {/* Background */}
      <div className={styles["bgLayer"]}>
        <div className={styles["bgGradient"]} />
      </div>

      <div className={styles["container"]}>
        {/* Section Header */}
        <motion.div
          className={styles["header"]}
          initial={{opacity: 0, y: 30}}
          animate={isInView ? {opacity: 1, y: 0} : {}}
          transition={{duration: 0.6}}>
          <motion.div
            initial={{opacity: 0, scale: 0.9}}
            animate={isInView ? {opacity: 1, scale: 1} : {}}
            transition={{duration: 0.5}}>
            <Badge
              variant='outline'
              className={styles["badge"]}>
              {t("badge")}
            </Badge>
          </motion.div>
          <h2 className={styles["title"]}>
            {t("title")} <span className={styles["titleHighlight"]}>{t("titleHighlight")}</span>
          </h2>
          <p className={styles["description"]}>{t("description")}</p>
        </motion.div>

        {/* Tabs */}
        <Tabs
          defaultValue='frontend'
          value={activeTab}
          onValueChange={setActiveTab}
          className={styles["tabsContainer"]}>
          {/* Tab List */}
          <motion.div
            className={styles["tabListWrapper"]}
            initial={{opacity: 0, y: 20}}
            animate={isInView ? {opacity: 1, y: 0} : {}}
            transition={{duration: 0.5, delay: 0.2}}>
            <TabsList className={styles["tabList"]}>
              {categoryConfigs.map((category) => (
                <TabsTrigger
                  key={category.id}
                  value={category.id}
                  className={activeTab === category.id ? styles["tabTriggerActive"] : styles["tabTrigger"]}>
                  <category.icon className={styles["tabIcon"]} />
                  <span className={styles["tabLabel"]}>{t(`categories.${category.id}.name` as Parameters<typeof t>[0])}</span>
                  {activeTab === category.id && (
                    <motion.span
                      className={`${styles["tabIndicator"]} ${styles[gradientClassMap[category.colorKey]]}`}
                      layoutId='activeTechTab'
                    />
                  )}
                </TabsTrigger>
              ))}
            </TabsList>
          </motion.div>

          {/* Tab Content */}
          <AnimatePresence mode='sync'>
            {categoryConfigs.map((category) => (
              <TabsContent
                key={category.id}
                value={category.id}
                className={styles["tabContent"]}>
                <motion.div
                  initial={{opacity: 0, y: 20}}
                  animate={{opacity: 1, y: 0}}
                  exit={{opacity: 0, y: -20}}
                  transition={{duration: 0.3}}>
                  {/* Category Description */}
                  <div className={styles["categoryDescription"]}>
                    <p>{t(`categories.${category.id}.description` as Parameters<typeof t>[0])}</p>
                  </div>

                  {/* Technologies Grid */}
                  <div className={styles["techGrid"]}>
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
                        <Card className={styles["techCard"]}>
                          {/* Gradient overlay */}
                          <motion.div
                            className={`${styles["techCardGradient"]} ${styles[gradientClassMap[category.colorKey]]}`}
                            style={{opacity: hoveredTech === tech.id ? 0.1 : 0}}
                          />

                          <CardContent className={styles["techCardContent"]}>
                            {/* Icon */}
                            <motion.div
                              className={`${styles["techIconWrapper"]} ${styles[gradientClassMap[category.colorKey]]}`}
                              animate={{
                                scale: hoveredTech === tech.id ? 1.1 : 1,
                                rotate: hoveredTech === tech.id ? 5 : 0,
                              }}
                              transition={{duration: 0.3}}>
                              <tech.icon className={styles["techIcon"]} />
                            </motion.div>

                            {/* Content */}
                            <div className={styles["techInfo"]}>
                              <div className={styles["techName"]}>
                                <h3>{t(`technologies.${tech.id}.name` as Parameters<typeof t>[0])}</h3>
                                {tech.version !== undefined && (
                                  <Badge
                                    variant='secondary'
                                    className={styles["techVersion"]}>
                                    v{tech.version}
                                  </Badge>
                                )}
                              </div>
                              <p className={styles["techDescription"]}>
                                {t(`technologies.${tech.id}.description` as Parameters<typeof t>[0])}
                              </p>
                            </div>
                          </CardContent>

                          {/* Animated border */}
                          <motion.div
                            className={`${styles["techCardBorder"]} ${styles[gradientClassMap[category.colorKey]]}`}
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

        {/* Platform Statistics (merged from Statistics component) */}
        <motion.div
          className={styles["statsHeader"]}
          initial={{opacity: 0, y: 30}}
          animate={isInView ? {opacity: 1, y: 0} : {}}
          transition={{duration: 0.6, delay: 0.4}}>
          <Badge
            variant='outline'
            className={styles["badge"]}>
            {tStats("badge")}
          </Badge>
          <h3 className={styles["statsTitle"]}>
            {tStats("title")} <span className={styles["titleHighlight"]}>{tStats("titleHighlight")}</span>
          </h3>
          <p className={styles["statsDescription"]}>{tStats("description")}</p>
        </motion.div>

        <div className={styles["statsGrid"]}>
          {statConfigs.map((stat, index) => (
            <motion.div
              key={stat.id}
              initial={{opacity: 0, y: 30}}
              animate={isInView ? {opacity: 1, y: 0} : {}}
              transition={{duration: 0.5, delay: 0.5 + index * 0.1}}
              // eslint-disable-next-line react/jsx-no-bind -- simple page
              onHoverStart={() => setHoveredStat(stat.id)}
              // eslint-disable-next-line react/jsx-no-bind -- simple page
              onHoverEnd={() => setHoveredStat(null)}>
              <Card className={hoveredStat === stat.id ? styles["statCardActive"] : styles["statCard"]}>
                {/* Gradient overlay */}
                <motion.div
                  className={`${styles["statCardGradient"]} ${styles[iconClassMap[stat.gradientKey]]}`}
                  style={{opacity: hoveredStat === stat.id ? 0.1 : 0}}
                />

                <CardContent className={styles["statCardContent"]}>
                  {/* Icon */}
                  <motion.div
                    className={`${styles["statIconWrapper"]} ${styles[iconClassMap[stat.gradientKey]]}`}
                    animate={{
                      scale: hoveredStat === stat.id ? 1.1 : 1,
                      rotate: hoveredStat === stat.id ? 5 : 0,
                    }}
                    transition={{duration: 0.3}}>
                    <stat.icon className={styles["statIcon"]} />
                  </motion.div>

                  {/* Animated Number */}
                  <div className={styles["statValue"]}>
                    <CountingNumber
                      number={Number(tStats(`items.${stat.id}.value` as Parameters<typeof tStats>[0]))}
                      inView
                    />
                    {tStats(`items.${stat.id}.suffix` as Parameters<typeof tStats>[0])}
                  </div>

                  {/* Label */}
                  <h3 className={styles["statLabel"]}>{tStats(`items.${stat.id}.label` as Parameters<typeof tStats>[0])}</h3>
                  <p className={styles["statDescription"]}>{tStats(`items.${stat.id}.description` as Parameters<typeof tStats>[0])}</p>
                </CardContent>

                {/* Animated border */}
                <motion.div
                  className={`${styles["statCardBorder"]} ${styles[borderClassMap[stat.gradientKey]]}`}
                  initial={{scaleX: 0}}
                  animate={{scaleX: hoveredStat === stat.id ? 1 : 0}}
                  transition={{duration: 0.3}}
                  style={{transformOrigin: "left"}}
                />
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
