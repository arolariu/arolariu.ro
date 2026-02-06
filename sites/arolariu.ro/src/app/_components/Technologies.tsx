"use client";

import {Badge, Button} from "@arolariu/components";
import {motion} from "motion/react";
import {useTranslations} from "next-intl";
import {TbCheck, TbExternalLink} from "react-icons/tb";
import styles from "./Technologies.module.scss";

/**
 * This component showcases the technology stack used in the platform.
 * It highlights the modern architecture and the technologies employed.
 * @returns The technology showcase section of the homepage, CSR'ed.
 */
export default function TechnologiesSection(): React.JSX.Element {
  const t = useTranslations("Home.technologyTab");

  const points = [
    {
      check: <TbCheck className={styles["checkIcon"]} />,
      text: t("points.point1"),
    },
    {
      check: <TbCheck className={styles["checkIcon"]} />,
      text: t("points.point2"),
    },
    {
      check: <TbCheck className={styles["checkIcon"]} />,
      text: t("points.point3"),
    },
  ];

  return (
    <section className={styles["section"]}>
      <main className={styles["bgGradient"]} />
      <main className={styles["container"]}>
        <main className={styles["grid"]}>
          <motion.div
            initial={{opacity: 0, x: -30}}
            whileInView={{opacity: 1, x: 0}}
            viewport={{once: true}}
            transition={{duration: 0.8}}
            className={styles["content"]}>
            <Badge className={styles["badge"]}>{t("badgeTitle")}</Badge>
            <h2 className={styles["title"]}>{t("title")}</h2>
            <span className={styles["description"]}>{t("description")}</span>
            <ul className={styles["pointsList"]}>
              {points.map((point) => (
                <li
                  key={point.text}
                  className={styles["point"]}>
                  {point.check}
                  <span>{point.text}</span>
                </li>
              ))}
            </ul>
            <Button className={styles["button"]}>
              {t("learnMoreBtn")} <TbExternalLink className={styles["buttonIcon"]} />
            </Button>
          </motion.div>

          <motion.div
            initial={{opacity: 0, scale: 0.9}}
            whileInView={{opacity: 1, scale: 1}}
            viewport={{once: true}}
            transition={{duration: 0.8}}
            className={styles["visual"]}>
            <main className={styles["codeBlock"]}>
              <main className={styles["codeLabel"]}>architecture.tsx</main>
              <pre className={styles["codePre"]}>
                <code className={styles["codeContent"]}>
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
            </main>

            {/* Decorative elements */}
            <main className={styles["decorOrbPrimary"]} />
            <main className={styles["decorOrbPurple"]} />
          </motion.div>
        </main>
      </main>
    </section>
  );
}
