"use client";

import {Badge} from "@arolariu/components/badge";
import {Card, CardContent} from "@arolariu/components/card";
import {Tabs, TabsContent, TabsList, TabsTrigger} from "@arolariu/components/tabs";
import {AnimatePresence, motion, useInView} from "motion/react";
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

interface Technology {
  name: string;
  icon: React.ComponentType<{className?: string}>;
  description: string;
  version?: string;
  link?: string;
}

interface TechCategory {
  id: string;
  name: string;
  description: string;
  icon: React.ComponentType<{className?: string}>;
  color: string;
  technologies: Technology[];
}

const techCategories: TechCategory[] = [
  {
    id: "frontend",
    name: "Frontend",
    description: "Modern web technologies for blazing-fast user experiences",
    icon: TbStackFront,
    color: "from-blue-500 to-cyan-500",
    technologies: [
      {name: "React", icon: TbBrandReact, description: "UI library for building interactive interfaces", version: "19"},
      {name: "Next.js", icon: TbBrandNextjs, description: "Full-stack React framework with SSR/SSG", version: "16"},
      {name: "TypeScript", icon: TbBrandTypescript, description: "Type-safe JavaScript for robust code", version: "5.x"},
      {name: "Tailwind CSS", icon: TbBrandTailwind, description: "Utility-first CSS framework", version: "4.x"},
      {name: "Zustand", icon: TbCode, description: "Lightweight state management", version: "5.x"},
      {name: "Motion", icon: TbDeviceAnalytics, description: "Production-ready animations", version: "11.x"},
    ],
  },
  {
    id: "backend",
    name: "Backend",
    description: "Scalable server-side technologies and APIs",
    icon: TbServer,
    color: "from-purple-500 to-violet-500",
    technologies: [
      {name: ".NET", icon: TbBrandCSharp, description: "Primary backend framework", version: "10"},
      {name: "ASP.NET Core", icon: TbServer, description: "High-performance web APIs", version: "10"},
      {name: "Node.js", icon: TbBrandNodejs, description: "BFF and serverless functions", version: "24 LTS"},
      {name: "CosmosDB", icon: TbDatabase, description: "Globally distributed NoSQL database"},
      {name: "Azure SQL", icon: TbFileDatabase, description: "Managed relational database"},
      {name: "Redis", icon: TbDatabase, description: "In-memory cache for performance"},
    ],
  },
  {
    id: "cloud",
    name: "Cloud & DevOps",
    description: "Infrastructure and deployment automation",
    icon: TbCloud,
    color: "from-orange-500 to-amber-500",
    technologies: [
      {name: "Azure", icon: TbBrandAzure, description: "Primary cloud provider"},
      {name: "Vercel", icon: TbBrandVercel, description: "Frontend deployment platform"},
      {name: "Docker", icon: TbBrandDocker, description: "Containerization platform"},
      {name: "GitHub Actions", icon: TbBrandGithub, description: "CI/CD automation"},
      {name: "Bicep", icon: TbCloud, description: "Infrastructure as Code"},
      {name: "Azure DevOps", icon: TbBrandAzure, description: "Project management & pipelines"},
    ],
  },
  {
    id: "tooling",
    name: "Developer Tools",
    description: "Tools and frameworks for development excellence",
    icon: TbTools,
    color: "from-green-500 to-emerald-500",
    technologies: [
      {name: "Git", icon: TbBrandGit, description: "Version control system"},
      {name: "ESLint", icon: TbCode, description: "JavaScript linting with 20+ plugins"},
      {name: "Prettier", icon: TbBrandCss3, description: "Code formatting"},
      {name: "Vitest", icon: TbTestPipe, description: "Unit testing framework"},
      {name: "Playwright", icon: TbTestPipe, description: "E2E testing framework"},
      {name: "pnpm/npm", icon: TbBrandNpm, description: "Package management"},
    ],
  },
];

/**
 * Enhanced TechStack component displaying technologies used in the platform.
 * Features tabbed navigation with animated cards and detailed descriptions.
 * @returns The TechStack component, CSR'ed.
 */
export default function TechStack(): React.JSX.Element {
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
              Technology Stack
            </Badge>
          </motion.div>
          <h2 className='mb-6 text-4xl font-bold tracking-tight md:text-5xl'>
            Powered by{" "}
            <span className='bg-gradient-to-r from-blue-500 via-purple-500 to-orange-500 bg-clip-text text-transparent'>modern technologies</span>
          </h2>
          <p className='text-muted-foreground text-lg md:text-xl'>
            A carefully curated technology stack chosen for performance, developer experience, and long-term maintainability.
          </p>
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
              {techCategories.map((category) => (
                <TabsTrigger
                  key={category.id}
                  value={category.id}
                  className='data-[state=active]:bg-background relative flex items-center gap-2 px-4 py-3 transition-all'>
                  <category.icon className='h-4 w-4' />
                  <span className='hidden sm:inline'>{category.name}</span>
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
            {techCategories.map((category) => (
              <TabsContent
                key={category.id}
                value={category.id}
                className='mt-0 focus-visible:outline-none focus-visible:ring-0'>
                <motion.div
                  initial={{opacity: 0, y: 20}}
                  animate={{opacity: 1, y: 0}}
                  exit={{opacity: 0, y: -20}}
                  transition={{duration: 0.3}}>
                  {/* Category Description */}
                  <div className='mb-8 text-center'>
                    <p className='text-muted-foreground text-lg'>{category.description}</p>
                  </div>

                  {/* Technologies Grid */}
                  <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-3'>
                    {category.technologies.map((tech, index) => (
                      <motion.div
                        key={tech.name}
                        initial={{opacity: 0, y: 20}}
                        animate={{opacity: 1, y: 0}}
                        transition={{duration: 0.3, delay: index * 0.05}}
                        // eslint-disable-next-line react/jsx-no-bind -- simple page
                        onHoverStart={() => setHoveredTech(tech.name)}
                        // eslint-disable-next-line react/jsx-no-bind -- simple page
                        onHoverEnd={() => setHoveredTech(null)}>
                        <Card
                          className={`group relative h-full overflow-hidden transition-all duration-300 ${
                            hoveredTech === tech.name ? "border-primary shadow-lg shadow-primary/10" : "hover:border-primary/30"
                          }`}>
                          {/* Gradient overlay */}
                          <motion.div
                            className={`absolute inset-0 bg-gradient-to-br ${category.color} transition-opacity duration-300`}
                            style={{opacity: hoveredTech === tech.name ? 0.1 : 0}}
                          />

                          <CardContent className='relative flex items-start gap-4 p-5'>
                            {/* Icon */}
                            <motion.div
                              className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${category.color}`}
                              animate={{
                                scale: hoveredTech === tech.name ? 1.1 : 1,
                                rotate: hoveredTech === tech.name ? 5 : 0,
                              }}
                              transition={{duration: 0.3}}>
                              <tech.icon className='h-6 w-6 text-white' />
                            </motion.div>

                            {/* Content */}
                            <div className='min-w-0 flex-1'>
                              <div className='mb-1 flex items-center gap-2'>
                                <h3 className='font-semibold'>{tech.name}</h3>
                                {tech.version !== undefined && (
                                  <Badge
                                    variant='secondary'
                                    className='text-xs'>
                                    v{tech.version}
                                  </Badge>
                                )}
                              </div>
                              <p className='text-muted-foreground text-sm'>{tech.description}</p>
                            </div>
                          </CardContent>

                          {/* Animated border */}
                          <motion.div
                            className={`absolute inset-x-0 bottom-0 h-0.5 bg-gradient-to-r ${category.color}`}
                            initial={{scaleX: 0}}
                            animate={{scaleX: hoveredTech === tech.name ? 1 : 0}}
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
          {[
            {value: "24+", label: "Technologies", description: "In our stack"},
            {value: "90%+", label: "Test Coverage", description: "Unit & E2E tests"},
            {value: "100%", label: "TypeScript", description: "Full type safety"},
            {value: "A+", label: "Security Grade", description: "Best practices"},
          ].map((stat, index) => (
            <motion.div
              key={stat.label}
              className='bg-muted/30 rounded-xl p-6 text-center backdrop-blur-sm'
              initial={{opacity: 0, y: 20}}
              animate={isInView ? {opacity: 1, y: 0} : {}}
              transition={{duration: 0.5, delay: 0.6 + index * 0.1}}
              whileHover={{scale: 1.05, transition: {duration: 0.2}}}>
              <div className='text-primary mb-1 text-3xl font-bold'>{stat.value}</div>
              <div className='font-medium'>{stat.label}</div>
              <div className='text-muted-foreground text-sm'>{stat.description}</div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
