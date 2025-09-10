"use client";

import {Card, CardContent} from "@arolariu/components/card";
import {Tabs, TabsContent, TabsList, TabsTrigger} from "@arolariu/components/tabs";
import {AnimatePresence, motion} from "motion/react";
import {useState} from "react";
import {
  TbBrandAzure,
  TbBrandCSharp,
  TbBrandCss3,
  TbBrandDocker,
  TbBrandGithub,
  TbBrandJavascript,
  TbBrandNextjs,
  TbBrandNodejs,
  TbBrandReact,
  TbBrandTypescript,
  TbCloud,
  TbDatabase,
  TbFileDatabase,
  TbServer,
  TbStackFront,
  TbTestPipe,
} from "react-icons/tb";

/**
 * The technology stack component.
 * It displays the technology stack used in the project.
 * @returns The technology stack component, CSR'ed.
 */
export default function TechStack(): React.JSX.Element {
  const techCategories = [
    {
      id: "frontend",
      name: "Frontend",
      icon: TbStackFront,
      technologies: [
        {name: "React", icon: TbBrandReact, description: "UI library"},
        {name: "Next.js", icon: TbBrandNextjs, description: "React framework"},
        {name: "TypeScript", icon: TbBrandTypescript, description: "Type-safe JavaScript"},
        {name: "JavaScript", icon: TbBrandJavascript, description: "Programming language"},
        {name: "Tailwind CSS", icon: TbBrandCss3, description: "Utility-first CSS"},
      ],
    },
    {
      id: "backend",
      name: "Backend",
      icon: TbServer,
      technologies: [
        {name: "Node.js", icon: TbBrandNodejs, description: "BFF JavaScript Runtime"},
        {name: "Dotnet C#", icon: TbBrandCSharp, description: "Primary backend"},
        {name: "CosmosDB", icon: TbDatabase, description: "NoSQL database"},
        {name: "MSSQL DB", icon: TbFileDatabase, description: "SQL database"},
      ],
    },
    {
      id: "devops",
      name: "DevOps",
      icon: TbCloud,
      technologies: [
        {name: "Azure DevOps", icon: TbBrandGithub, description: "CI/CD platform"},
        {name: "Docker", icon: TbBrandDocker, description: "Containerization"},
        {name: "GitHub Actions", icon: TbTestPipe, description: "CI/CD"},
        {name: "Azure", icon: TbBrandAzure, description: "Cloud provider"},
      ],
    },
  ] as const;

  const [activeTab, setActiveTab] = useState<string>("frontend");
  const [hoveredTech, setHoveredTech] = useState<string | null>(null);

  return (
    <section className='py-16'>
      <div className='mb-12 text-center'>
        <motion.div
          initial={{opacity: 0, y: 20}}
          animate={{opacity: 1, y: 0}}
          transition={{duration: 0.5}}>
          <h2 className='mb-4 text-4xl font-bold tracking-tight'>Technologies Used</h2>
          <p className='text-muted-foreground mx-auto max-w-2xl'>
            The platform is built using the latest state-of-the-art technologies to ensure a modern, scalable, and maintainable codebase.
          </p>
        </motion.div>
      </div>

      <Tabs
        defaultValue='frontend'
        value={activeTab}
        onValueChange={setActiveTab}
        className='mx-auto w-full max-w-4xl'>
        <div className='mb-8 flex justify-center'>
          <TabsList className='grid grid-cols-3'>
            {techCategories.map((category) => (
              <TabsTrigger
                key={category.id}
                value={category.id}
                className='relative flex items-center gap-2'>
                <category.icon className='h-4 w-4' />
                <span>{category.name}</span>
                {activeTab === category.id && (
                  <motion.span
                    className='bg-primary absolute right-0 -bottom-1 left-0 h-0.5'
                    layoutId='activeTabIndicator'
                  />
                )}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        <AnimatePresence mode='wait'>
          {techCategories.map((category) => (
            <TabsContent
              key={category.id}
              value={category.id}
              className='mt-0'>
              <motion.div
                initial={{opacity: 0, y: 20}}
                animate={{opacity: 1, y: 0}}
                exit={{opacity: 0, y: -20}}
                transition={{duration: 0.3}}
                className='grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5'>
                {category.technologies.map((tech, index) => (
                  <motion.div
                    key={tech.name}
                    initial={{opacity: 0, y: 20}}
                    animate={{opacity: 1, y: 0}}
                    transition={{duration: 0.3, delay: index * 0.1}}
                    whileHover={{
                      scale: 1.05,
                      transition: {duration: 0.2},
                    }}
                    onHoverStart={() => setHoveredTech(tech.name)}
                    onHoverEnd={() => setHoveredTech(null)}>
                    <Card
                      className={`h-full overflow-hidden transition-all duration-300 hover:shadow-md ${hoveredTech === tech.name ? "border-primary" : "hover:border-primary/30"}`}>
                      <CardContent className='flex flex-col items-center p-6 text-center'>
                        <motion.div
                          animate={{
                            y: hoveredTech === tech.name ? [0, -5, 0] : 0,
                          }}
                          transition={{
                            duration: 0.5,
                            repeat: hoveredTech === tech.name ? Number.POSITIVE_INFINITY : 0,
                            repeatType: "reverse",
                          }}
                          className='mb-4'>
                          <tech.icon className='text-primary h-12 w-12' />
                        </motion.div>
                        <h3 className='font-medium'>{tech.name}</h3>
                        <p className='text-muted-foreground text-sm'>{tech.description}</p>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </motion.div>
            </TabsContent>
          ))}
        </AnimatePresence>
      </Tabs>
    </section>
  );
}
