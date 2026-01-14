"use client";

import {Badge} from "@arolariu/components/badge";
import {Card, CardContent} from "@arolariu/components/card";
import {motion, useInView} from "motion/react";
import {useTranslations} from "next-intl";
import {useRef, useState} from "react";
import {
  TbApi,
  TbBrandAzure,
  TbBrandNextjs,
  TbBrandReact,
  TbCloud,
  TbCloudComputing,
  TbDatabase,
  TbDeviceDesktop,
  TbLock,
  TbServer,
  TbWorldWww,
} from "react-icons/tb";

interface LayerConfig {
  id: string;
  icon: React.ComponentType<{className?: string}>;
  color: string;
  position: "left" | "center" | "right";
}

const layerConfigs: LayerConfig[] = [
  {id: "client", icon: TbDeviceDesktop, color: "from-blue-500 to-cyan-500", position: "left"},
  {id: "cdn", icon: TbWorldWww, color: "from-green-500 to-emerald-500", position: "center"},
  {id: "api", icon: TbApi, color: "from-purple-500 to-violet-500", position: "right"},
  {id: "services", icon: TbServer, color: "from-orange-500 to-amber-500", position: "left"},
  {id: "auth", icon: TbLock, color: "from-red-500 to-pink-500", position: "center"},
  {id: "data", icon: TbDatabase, color: "from-indigo-500 to-blue-500", position: "right"},
  {id: "ai", icon: TbBrandAzure, color: "from-cyan-500 to-teal-500", position: "left"},
  {id: "infra", icon: TbCloudComputing, color: "from-slate-500 to-zinc-500", position: "center"},
];

const principleIcons = [TbBrandReact, TbBrandNextjs, TbCloud];
const principleIds = ["rsc", "appRouter", "cloudNative"];

/**
 * Architecture component displaying the platform's technical architecture.
 * Features an interactive layered diagram with animated connections.
 * @returns The Architecture component, CSR'ed.
 */
export default function Architecture(): React.JSX.Element {
  const t = useTranslations("About.Platform.architecture");
  const ref = useRef<HTMLElement>(null);
  const isInView = useInView(ref, {once: true, margin: "-100px"});
  const [hoveredLayer, setHoveredLayer] = useState<string | null>(null);

  return (
    <section
      ref={ref}
      className='relative py-24'>
      {/* Background */}
      <div className='absolute inset-0 -z-10'>
        <div className='from-background to-background via-muted/30 absolute inset-0 bg-gradient-to-b' />
        <div className='absolute inset-0 bg-[linear-gradient(to_right,#80808008_1px,transparent_1px),linear-gradient(to_bottom,#80808008_1px,transparent_1px)] bg-[size:32px_32px]' />
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
            <span className='bg-gradient-to-r from-purple-500 via-blue-500 to-cyan-500 bg-clip-text text-transparent'>
              {t("titleHighlight")}
            </span>
          </h2>
          <p className='text-muted-foreground text-lg md:text-xl'>{t("description")}</p>
        </motion.div>

        {/* Architecture Diagram */}
        <div className='relative mx-auto max-w-6xl'>
          {/* Connection Lines */}
          <svg
            className='pointer-events-none absolute inset-0 h-full w-full'
            style={{zIndex: 0}}>
            <defs>
              <linearGradient
                id='lineGradient'
                x1='0%'
                y1='0%'
                x2='100%'
                y2='100%'>
                <stop
                  offset='0%'
                  stopColor='hsl(var(--primary))'
                  stopOpacity='0.3'
                />
                <stop
                  offset='100%'
                  stopColor='hsl(var(--primary))'
                  stopOpacity='0.1'
                />
              </linearGradient>
            </defs>
            {/* Vertical connection line */}
            <motion.line
              x1='50%'
              y1='0'
              x2='50%'
              y2='100%'
              stroke='url(#lineGradient)'
              strokeWidth='2'
              strokeDasharray='8 4'
              initial={{pathLength: 0}}
              animate={isInView ? {pathLength: 1} : {}}
              transition={{duration: 2, delay: 0.5}}
            />
          </svg>

          {/* Architecture Layers Grid */}
          <div className='relative grid gap-6 md:grid-cols-3'>
            {layerConfigs.map((layer, index) => {
              // eslint-disable-next-line unicorn/no-nested-ternary, sonarjs/no-nested-conditional -- grid positioning
              const colStartClass = layer.position === "center" ? "md:col-start-2" : layer.position === "right" ? "md:col-start-3" : "";
              return (
                <motion.div
                  key={layer.id}
                  className={colStartClass}
                  initial={{opacity: 0, y: 30}}
                  animate={isInView ? {opacity: 1, y: 0} : {}}
                  transition={{duration: 0.5, delay: index * 0.1}}
                  // eslint-disable-next-line react/jsx-no-bind -- simple page
                  onHoverStart={() => setHoveredLayer(layer.id)}
                  // eslint-disable-next-line react/jsx-no-bind -- simple page
                  onHoverEnd={() => setHoveredLayer(null)}>
                  <Card
                    className={`group relative overflow-hidden transition-all duration-300 ${
                      hoveredLayer === layer.id ? "border-primary shadow-primary/10 scale-105 shadow-lg" : "hover:border-primary/30"
                    }`}>
                    {/* Gradient overlay */}
                    <motion.div
                      className={`absolute inset-0 bg-gradient-to-br ${layer.color} opacity-0 transition-opacity duration-300`}
                      style={{opacity: hoveredLayer === layer.id ? 0.1 : 0}}
                    />

                    <CardContent className='relative p-6'>
                      {/* Icon and Title */}
                      <div className='mb-4 flex items-center gap-4'>
                        <motion.div
                          className={`flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${layer.color}`}
                          animate={{
                            scale: hoveredLayer === layer.id ? 1.1 : 1,
                            rotate: hoveredLayer === layer.id ? 5 : 0,
                          }}
                          transition={{duration: 0.3}}>
                          <layer.icon className='h-6 w-6 text-white' />
                        </motion.div>
                        <div>
                          <h3 className='font-bold'>{t(`layers.${layer.id}.name` as Parameters<typeof t>[0])}</h3>
                          <p className='text-muted-foreground text-sm'>{t(`layers.${layer.id}.description` as Parameters<typeof t>[0])}</p>
                        </div>
                      </div>

                      {/* Technologies */}
                      <div className='flex flex-wrap gap-2'>
                        {t(`layers.${layer.id}.technologies` as Parameters<typeof t>[0])
                          .split(",")
                          .map((tech, techIndex) => (
                            <motion.div
                              key={tech}
                              initial={{opacity: 0, scale: 0.8}}
                              animate={isInView ? {opacity: 1, scale: 1} : {}}
                              transition={{duration: 0.3, delay: index * 0.1 + techIndex * 0.05}}>
                              <Badge
                                variant='secondary'
                                className='text-xs'>
                                {tech}
                              </Badge>
                            </motion.div>
                          ))}
                      </div>
                    </CardContent>

                    {/* Animated border */}
                    <motion.div
                      className={`absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r ${layer.color}`}
                      initial={{scaleX: 0}}
                      animate={{scaleX: hoveredLayer === layer.id ? 1 : 0}}
                      transition={{duration: 0.3}}
                      style={{transformOrigin: "left"}}
                    />
                  </Card>
                </motion.div>
              );
            })}
          </div>

          {/* Key Architecture Principles */}
          <motion.div
            className='mt-16 grid gap-6 md:grid-cols-3'
            initial={{opacity: 0, y: 30}}
            animate={isInView ? {opacity: 1, y: 0} : {}}
            transition={{duration: 0.6, delay: 0.8}}>
            {principleIds.map((principleId, index) => {
              const IconComponent = principleIcons[index];
              return (
                <motion.div
                  key={principleId}
                  className='bg-muted/30 flex items-start gap-4 rounded-xl p-6 backdrop-blur-sm'
                  initial={{opacity: 0, y: 20}}
                  animate={isInView ? {opacity: 1, y: 0} : {}}
                  transition={{duration: 0.5, delay: 1 + index * 0.1}}>
                  <div className='bg-primary/10 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg'>
                    {IconComponent !== undefined && <IconComponent className='text-primary h-5 w-5' />}
                  </div>
                  <div>
                    <h4 className='mb-1 font-semibold'>{t(`principles.${principleId}.title` as Parameters<typeof t>[0])}</h4>
                    <p className='text-muted-foreground text-sm'>{t(`principles.${principleId}.description` as Parameters<typeof t>[0])}</p>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        </div>
      </div>
    </section>
  );
}
