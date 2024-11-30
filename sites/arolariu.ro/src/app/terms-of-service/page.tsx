/** @format */

import type {Metadata} from "next";
import {useTranslations} from "next-intl";
import RenderTermsOfServiceScreen from "./island";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "The terms of service for arolariu.ro",
};

/**
 * The terms of service page.
 * @returns The terms of service page.
 */
export default function TermsOfServicePage() {
  const t = useTranslations("termsOfService");

  return (
    <main className='flex flex-col flex-nowrap items-center justify-center justify-items-center gap-8 px-12 py-24'>
      <section className='pb-12'>
        <h1 className='bg-gradient-to-r from-cyan-500 to-purple-500 bg-clip-text text-3xl font-black text-transparent'>
          {t("title")}
        </h1>
        <p className='text-center'>{t("last_updated")}</p>
      </section>
      <RenderTermsOfServiceScreen />
    </main>
  );
}
