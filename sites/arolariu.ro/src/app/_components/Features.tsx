"use client";

import {TypewriterTextSmooth} from "@arolariu/components";
import {Card, CardContent, CardHeader} from "@arolariu/components/card";
import {useTranslations} from "next-intl";
import Link from "next/link";

import {TbBinoculars, TbBrandAzure, TbBrandCSharp, TbBrandGithub, TbBrandNextjs, TbBrandSvelte} from "react-icons/tb";
import styles from "./Features.module.scss";

/**
 * This component renders the features section of the homepage.
 * It displays a list of features with icons, titles, and descriptions.
 * The features are built using the `Feature` component.
 * @returns The features section of the homepage, CSR'ed.
 */
export default function FeaturesSection(): React.JSX.Element {
  const t = useTranslations("Home.featuresTab");
  const features = [
    {
      icon: <TbBrandNextjs className={styles["cardIcon"]} />,
      title: t("nextJs.title"),
      description: t("nextJs.description"),
    },
    {
      icon: <TbBrandAzure className={styles["cardIcon"]} />,
      title: t("azure.title"),
      description: t("azure.description"),
    },
    {
      icon: <TbBrandCSharp className={styles["cardIcon"]} />,
      title: t("csharp.title"),
      description: t("csharp.description"),
    },
    {
      icon: <TbBrandSvelte className={styles["cardIcon"]} />,
      title: t("svelte.title"),
      description: t("svelte.description"),
    },
    {
      icon: <TbBinoculars className={styles["cardIcon"]} />,
      title: t("otel.title"),
      description: t("otel.description"),
    },
    {
      icon: <TbBrandGithub className={styles["cardIcon"]} />,
      title: t("githubActions.title"),
      description: t("githubActions.description"),
    },
  ] as const;

  return (
    <section className={styles["section"]}>
      <article className={styles["article"]}>
        <TypewriterTextSmooth
          words={t("title")
            .split(" ")
            .map((word) => ({
              text: word,
              className: styles["titleWord"],
            }))}
          className={styles["titleWrapper"]}
          cursorClassName={styles["cursorClass"]}
        />
        <p className={styles["description"]}>{t("description")}</p>

        <main className={styles["grid"]}>
          {features.map((feature) => (
            <Card
              key={feature.title}
              className={styles["card"]}>
              <CardHeader className={styles["cardHeader"]}>
                {feature.icon} <span className={styles["cardTitle"]}>{feature.title}</span>
              </CardHeader>
              <CardContent>
                <span className={styles["cardDescription"]}>{feature.description}</span>
              </CardContent>
            </Card>
          ))}
        </main>
        <Link
          href='/about'
          className={styles["learnMoreLink"]}>
          {t("learnMoreBtn")}
        </Link>
      </article>
    </section>
  );
}
