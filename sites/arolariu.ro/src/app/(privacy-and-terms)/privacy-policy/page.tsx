/** @format */

import type {Metadata} from "next";
import {getTranslations} from "next-intl/server";
import RenderPrivacyPolicyScreen from "./island";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "The privacy policy page for the `arolariu.ro` platform.",
};

/**
 * The privacy policy page, which outlines the privacy policy for the `arolariu.ro` platform.
 * This component is SSR'ed.
 */
export default async function PrivacyPolicyPage() {
  const t = await getTranslations("privacyPolicy");

  return (
    <main className='flex flex-col flex-nowrap items-center justify-center justify-items-center gap-8 px-12 py-24'>
      <section className='flex flex-col flex-nowrap items-center justify-center justify-items-center'>
        <h1 className='bg-gradient-to-r from-cyan-500 to-purple-500 bg-clip-text text-3xl font-black text-transparent'>{t("title")}</h1>
        <span>{t("last_updated")}</span>
      </section>
      <RenderPrivacyPolicyScreen />
      <section className='bg-gradient-to-r from-cyan-500 to-purple-500 bg-clip-text pt-8 text-3xl font-black italic text-transparent'>
        {t("contactInformation.content")}
      </section>
    </main>
  );
}
