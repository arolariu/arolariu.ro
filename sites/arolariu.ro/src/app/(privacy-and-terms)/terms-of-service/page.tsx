/** @format */

import type {Metadata} from "next";
import {getTranslations} from "next-intl/server";
import RenderTermsOfServiceScreen from "./island";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "The terms of service for arolariu.ro",
};

/**
 * The terms of service page, which outlines the terms of service for arolariu.ro.
 * @returns The terms of service page, with the terms of service for arolariu.ro.
 */
export default async function TermsOfServicePage() {
  const t = await getTranslations("termsOfService");

  return (
    <main className='flex flex-col flex-nowrap items-center justify-center justify-items-center gap-8 px-12 py-24'>
      <section className='flex flex-col flex-nowrap items-center justify-center justify-items-center'>
        <h1 className='bg-gradient-to-r from-cyan-500 to-purple-500 bg-clip-text text-3xl font-black text-transparent'>
          {t("title")}
        </h1>
        <span>{t("last_updated")}</span>
      </section>
      <RenderTermsOfServiceScreen />
      <section className='bg-gradient-to-r from-cyan-500 to-purple-500 bg-clip-text pt-8 text-3xl font-black italic text-transparent'>
        {t("contactInformation.content")}
      </section>
    </main>
  );
}
