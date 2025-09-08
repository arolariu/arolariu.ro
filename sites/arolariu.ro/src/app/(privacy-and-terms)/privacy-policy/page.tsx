/** @format */

import {createMetadata} from "@/metadata";
import {getLocale, getTranslations} from "next-intl/server";
import type {Metadata} from "next/types";
import RenderPrivacyPolicyScreen from "./island";

/**
 * Generates metadata for the Privacy Policy page.
 * @returns The metadata for the Privacy Policy page.
 */
export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("privacyPolicy.__metadata__");
  const locale = await getLocale();
  return createMetadata({
    locale,
    title: t("title"),
    description: t("description"),
  });
}

/**
 * The privacy policy page, which outlines the privacy policy for the `arolariu.ro` platform.
 * @returns The privacy policy page, rendered as a React component, server-side.
 */
export default async function PrivacyPolicyPage(): Promise<React.JSX.Element> {
  const t = await getTranslations("privacyPolicy");

  return (
    <main className='flex flex-col flex-nowrap items-center justify-center justify-items-center gap-8 px-12 py-24'>
      <section className='flex flex-col flex-nowrap items-center justify-center justify-items-center'>
        <h1 className='bg-linear-to-r from-cyan-500 to-purple-500 bg-clip-text text-3xl font-black text-transparent'>{t("title")}</h1>
        <span>{t("last_updated")}</span>
      </section>
      <RenderPrivacyPolicyScreen />
      <section className='bg-linear-to-r from-cyan-500 to-purple-500 bg-clip-text pt-8 text-3xl font-black text-transparent italic'>
        {t("contactInformation.content")}
      </section>
    </main>
  );
}
