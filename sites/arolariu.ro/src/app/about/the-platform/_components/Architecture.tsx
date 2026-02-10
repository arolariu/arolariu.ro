"use client";

import {Badge} from "@arolariu/components/badge";
import {Card, CardContent} from "@arolariu/components/card";
import {motion, useInView} from "motion/react";
import {useTranslations} from "next-intl";
import {useRef, useState} from "react";
import {TbApi, TbBrandAzure, TbCloudComputing, TbDatabase, TbDeviceDesktop, TbLock, TbServer, TbWorldWww} from "react-icons/tb";
import styles from "./Architecture.module.scss";

interface LayerConfig {
  id: string;
  icon: React.ComponentType<{className?: string}>;
  colorKey: "blueCyan" | "greenEmerald" | "purpleViolet" | "orangeAmber" | "redPink" | "indigoBlue" | "cyanTeal" | "slateZinc";
}

const gradientClassMap = {
  blueCyan: "gradientBlueCyan",
  greenEmerald: "gradientGreenEmerald",
  purpleViolet: "gradientPurpleViolet",
  orangeAmber: "gradientOrangeAmber",
  redPink: "gradientRedPink",
  indigoBlue: "gradientIndigoBlue",
  cyanTeal: "gradientCyanTeal",
  slateZinc: "gradientSlateZinc",
} as const;

const layerConfigs: LayerConfig[] = [
  {id: "client", icon: TbDeviceDesktop, colorKey: "blueCyan"},
  {id: "cdn", icon: TbWorldWww, colorKey: "greenEmerald"},
  {id: "api", icon: TbApi, colorKey: "purpleViolet"},
  {id: "services", icon: TbServer, colorKey: "orangeAmber"},
  {id: "auth", icon: TbLock, colorKey: "redPink"},
  {id: "data", icon: TbDatabase, colorKey: "indigoBlue"},
  {id: "ai", icon: TbBrandAzure, colorKey: "cyanTeal"},
  {id: "infra", icon: TbCloudComputing, colorKey: "slateZinc"},
];

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

        {/* Architecture Diagram */}
        <div className={styles["diagram"]}>
          {/* Architecture Layers Grid */}
          <div className={styles["layersGrid"]}>
            {layerConfigs.map((layer, index) => (
              <motion.div
                key={layer.id}
                initial={{opacity: 0, y: 30}}
                animate={isInView ? {opacity: 1, y: 0} : {}}
                transition={{duration: 0.5, delay: index * 0.1}}
                // eslint-disable-next-line react/jsx-no-bind -- simple page
                onHoverStart={() => setHoveredLayer(layer.id)}
                // eslint-disable-next-line react/jsx-no-bind -- simple page
                onHoverEnd={() => setHoveredLayer(null)}>
                <Card className={hoveredLayer === layer.id ? styles["layerCardActive"] : styles["layerCard"]}>
                  {/* Gradient overlay */}
                  <motion.div
                    className={`${styles["layerGradient"]} ${styles[gradientClassMap[layer.colorKey]]}`}
                    style={{opacity: hoveredLayer === layer.id ? 0.1 : 0}}
                  />

                  <CardContent className={styles["layerContent"]}>
                    {/* Icon and Title */}
                    <div className={styles["layerHeader"]}>
                      <motion.div
                        className={`${styles["layerIconWrapper"]} ${styles[gradientClassMap[layer.colorKey]]}`}
                        animate={{
                          scale: hoveredLayer === layer.id ? 1.1 : 1,
                          rotate: hoveredLayer === layer.id ? 5 : 0,
                        }}
                        transition={{duration: 0.3}}>
                        <layer.icon className={styles["layerIcon"]} />
                      </motion.div>
                      <div>
                        <h3 className={styles["layerName"]}>{t(`layers.${layer.id}.name` as Parameters<typeof t>[0])}</h3>
                        <p className={styles["layerDescription"]}>{t(`layers.${layer.id}.description` as Parameters<typeof t>[0])}</p>
                      </div>
                    </div>

                    {/* Technologies */}
                    <div className={styles["technologies"]}>
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
                              className={styles["techBadge"]}>
                              {tech}
                            </Badge>
                          </motion.div>
                        ))}
                    </div>
                  </CardContent>

                  {/* Animated border */}
                  <motion.div
                    className={`${styles["layerBorder"]} ${styles[gradientClassMap[layer.colorKey]]}`}
                    initial={{scaleX: 0}}
                    animate={{scaleX: hoveredLayer === layer.id ? 1 : 0}}
                    transition={{duration: 0.3}}
                    style={{transformOrigin: "left"}}
                  />
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
