"use client";

import {TypewriterTextSmooth} from "@arolariu/components";
import {Card, CardContent, CardHeader} from "@arolariu/components/card";
import {useTranslations} from "next-intl";
import Link from "next/link";

import {TbBinoculars, TbBrandAzure, TbBrandCSharp, TbBrandGithub, TbBrandNextjs, TbBrandSvelte} from "react-icons/tb";

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
      icon: <TbBrandNextjs className='inline h-10 w-10' />,
      title: t("nextJs.title"),
      description: t("nextJs.description"),
    },
    {
      icon: <TbBrandAzure className='inline h-10 w-10' />,
      title: t("azure.title"),
      description: t("azure.description"),
    },
    {
      icon: <TbBrandCSharp className='inline h-10 w-10' />,
      title: t("csharp.title"),
      description: t("csharp.description"),
    },
    {
      icon: <TbBrandSvelte className='inline h-10 w-10' />,
      title: t("svelte.title"),
      description: t("svelte.description"),
    },
    {
      icon: <TbBinoculars className='inline h-10 w-10' />,
      title: t("otel.title"),
      description: t("otel.description"),
    },
    {
      icon: <TbBrandGithub className='inline h-10 w-10' />,
      title: t("githubActions.title"),
      description: t("githubActions.description"),
    },
  ] as const;

  return (
    <section className='py-12 sm:pb-16 lg:pb-20 xl:pb-24'>
      <article className='mx-auto max-w-(--breakpoint-xl) px-4 py-8 sm:px-6 sm:py-12 lg:px-8 lg:py-16'>
        <TypewriterTextSmooth
          words={t("title")
            .split(" ")
            .map((word) => ({
              text: word,
              className: "inline-block text-transparent bg-clip-text bg-linear-to-r from-blue-500 to-purple-500",
            }))}
          className='text-5xl font-bold'
          cursorClassName='h-10 2xsm:hidden md:block'
        />
        <p className='mt-4 text-center text-gray-500'>{t("description")}</p>

        <div className='mt-8 grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3'>
          {features.map((feature) => (
            <Card
              key={feature.title}
              className='rounded-xl border border-gray-800 p-8 shadow-xl transition hover:border-pink-500/10 hover:shadow-pink-500/10'>
              <CardHeader className='items-center pb-4'>
                {feature.icon} <span className='ml-2 text-xl'>{feature.title}</span>
              </CardHeader>
              <CardContent>
                <span className='text-md mt-3 text-gray-500'>{feature.description}</span>
              </CardContent>
            </Card>
          ))}
        </div>
        <Link
          href='/about'
          className='mx-auto mt-8 block text-center'>
          {t("learnMoreBtn")}
        </Link>
      </article>
    </section>
  );
}
