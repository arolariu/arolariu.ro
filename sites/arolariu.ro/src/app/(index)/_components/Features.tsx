/** @format */

"use client";

import {TypewriterText} from "@/presentation/Text";
import {Card, CardContent, CardHeader} from "@arolariu/components";
import {useTranslations} from "next-intl";
import Link from "next/link";

import {TbBinoculars, TbBrandAzure, TbBrandCSharp, TbBrandGithub, TbBrandNextjs, TbBrandSvelte} from "react-icons/tb";

type Props = {
  title: string;
  icon: React.ReactNode;
  description: string;
};

const Feature = ({title, icon, description}: Readonly<Props>) => {
  return (
    <Card className='rounded-xl border border-gray-800 p-8 shadow-xl transition hover:border-pink-500/10 hover:shadow-pink-500/10'>
      <CardHeader className='items-center pb-4'>
        {icon} <span className='ml-2 text-xl'>{title}</span>
      </CardHeader>
      <CardContent>
        <span className='text-md mt-3 text-gray-500'>{description}</span>
      </CardContent>
    </Card>
  );
};

/**
 * This component renders the features section of the homepage.
 * It displays a list of features with icons, titles, and descriptions.
 * The features are built using the `Feature` component.
 * @returns The features section of the homepage, CSR'ed.
 */
export function FeaturesSection() {
  const t = useTranslations("Home");
  const features = [
    {
      icon: <TbBrandNextjs className='inline h-10 w-10' />,
      title: "Next.js v14",
      description:
        "The platform is built using NextJS - the most popular React framework for production.  It is designed for production-grade React applications. NextJS is the most popular React framework for a reason: it is fast, reliable, and easy to use.",
    },
    {
      icon: <TbBrandAzure className='inline h-10 w-10' />,
      title: "Microsoft Azure",
      description:
        "The Microsoft Azure cloud is used to host the platform and all of its services. This ensures that the platform is always available and that it can scale on demand.",
    },
    {
      icon: <TbBrandCSharp className='inline h-10 w-10' />,
      title: ".NET 8 LTS",
      description: "The backend services are built using the latest LTS version of .NET 8",
    },
    {
      icon: <TbBrandSvelte className='inline h-10 w-10' />,
      title: "Svelte",
      description:
        "Utilizing Svelte for lightning-fast, reactive UI components. The `cv.arolariu.ro` platform is built exclusively using Svelte and SvelteKit (v5)",
    },
    {
      icon: <TbBinoculars className='inline h-10 w-10' />,
      title: "OpenTelemetry",
      description:
        "Complete observability with integrated metrics, traces, and logs. Everything is instrumented using OpenTelemetry. This allows for a unified telemetry experience across the board. (3PO: metrics, logs, traces)",
    },
    {
      icon: <TbBrandGithub className='inline h-10 w-10' />,
      title: "GitHub Actions",
      description: "The DevOps experience is powered by GitHub Actions. (CI/CD, Testing, etc.)",
    },
  ];

  return (
    <section className='py-12 sm:pb-16 lg:pb-20 xl:pb-24'>
      <article className='mx-auto max-w-screen-xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8 lg:py-16'>
        <TypewriterText
          words={[...t("1stPanel.title")]}
          className='text-5xl font-bold'
          cursorClassName='h-10'
        />
        <p className='mt-4 text-center text-gray-500'>{t("1stPanel.subtitle")}</p>

        <div className='mt-8 grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3'>
          {features.map((feature) => (
            <Feature
              key={feature.title}
              title={feature.title}
              icon={feature.icon}
              description={feature.description}
            />
          ))}
        </div>
        <Link
          href='/about'
          className='mx-auto mt-8 block text-center'>
          <button
            type='button'
            className='text-md btn btn-primary text-white'>
            Interesting? Click here to learn more...
          </button>
        </Link>
      </article>
    </section>
  );
}
