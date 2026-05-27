"use client";

import {TypewriterTextSmooth} from "@arolariu/components";
import {Card, CardContent, CardHeader} from "@arolariu/components/card";
import {useTranslations} from "next-intl-selector";
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
  const t = useTranslations();
  const features = [
    {
      icon: <TbBrandNextjs className={styles["cardIcon"]} />,
      title: t((m) => m.pages.home.featuresTab.nextJs.title),
      description: t((m) => m.pages.home.featuresTab.nextJs.description),
    },
    {
      icon: <TbBrandAzure className={styles["cardIcon"]} />,
      title: t((m) => m.pages.home.featuresTab.azure.title),
      description: t((m) => m.pages.home.featuresTab.azure.description),
    },
    {
      icon: <TbBrandCSharp className={styles["cardIcon"]} />,
      title: t((m) => m.pages.home.featuresTab.csharp.title),
      description: t((m) => m.pages.home.featuresTab.csharp.description),
    },
    {
      icon: <TbBrandSvelte className={styles["cardIcon"]} />,
      title: t((m) => m.pages.home.featuresTab.svelte.title),
      description: t((m) => m.pages.home.featuresTab.svelte.description),
    },
    {
      icon: <TbBinoculars className={styles["cardIcon"]} />,
      title: t((m) => m.pages.home.featuresTab.otel.title),
      description: t((m) => m.pages.home.featuresTab.otel.description),
    },
    {
      icon: <TbBrandGithub className={styles["cardIcon"]} />,
      title: t((m) => m.pages.home.featuresTab.githubActions.title),
      description: t((m) => m.pages.home.featuresTab.githubActions.description),
    },
  ] as const;

  return (
    <section className={styles["section"]}>
      <article className={styles["article"]}>
        <TypewriterTextSmooth
          words={t((m) => m.pages.home.featuresTab.title)
            .split(" ")
            .map((word) => ({
              text: word,
              className: styles["titleWord"],
            }))}
          className={styles["titleWrapper"]}
          cursorClassName={styles["cursorClass"]}
        />
        <p className={styles["description"]}>{t((m) => m.pages.home.featuresTab.description)}</p>

        <div className={styles["grid"]}>
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
        </div>
        <Link
          href='/about'
          className={styles["learnMoreLink"]}>
          {t((m) => m.pages.home.featuresTab.learnMoreBtn)}
        </Link>
      </article>
    </section>
  );
}
