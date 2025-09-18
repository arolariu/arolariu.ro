import {createMetadata} from "@/metadata";
import {getLocale, getTranslations} from "next-intl/server";
import type {Metadata} from "next/types";
import RenderTermsOfServiceScreen from "./island";

/**
 * Generates metadata for the Terms of Service page.
 * @returns The metadata for the Terms of Service page.
 */
export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("termsOfService.__metadata__");
  const locale = await getLocale();
  return createMetadata({
    locale,
    title: t("title"),
    description: t("description"),
  });
}

/**
 * The terms of service page, which outlines the terms of service for arolariu.ro.
 * @returns The terms of service page, with the terms of service for arolariu.ro.
 */
export default async function TermsOfServicePage(): Promise<React.JSX.Element> {
  const t = await getTranslations("termsOfService");

  return (
    <main className='flex flex-col flex-nowrap items-center justify-center justify-items-center gap-8 px-12 py-24'>
      <section className='flex flex-col flex-nowrap items-center justify-center justify-items-center'>
        <h1 className='bg-linear-to-r from-cyan-500 to-purple-500 bg-clip-text text-3xl font-black text-transparent'>{t("title")}</h1>
        <span>{t("last_updated")}</span>
      </section>
      <RenderTermsOfServiceScreen />
      <section className='bg-linear-to-r from-cyan-500 to-purple-500 bg-clip-text pt-8 text-3xl font-black text-transparent italic'>
        {t("contactInformation.content")}
      </section>
    </main>
  );
}
