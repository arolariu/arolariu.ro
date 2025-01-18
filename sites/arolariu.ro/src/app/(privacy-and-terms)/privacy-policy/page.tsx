/** @format */

import type {Metadata} from "next";
import {useTranslations} from "next-intl";
import RenderPrivacyPolicyScreen from "./island";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "The privacy policy page for the `arolariu.ro` platform.",
};

/**
 * The privacy policy page, which outlines the privacy policy for the `arolariu.ro` platform.
 * This component is SSR'ed.
 */
export default function PrivacyPolicyPage() {
  const t = useTranslations("privacyPolicy");

  return (
    <main className='flex flex-col flex-nowrap items-center justify-center justify-items-center gap-8 px-12 py-24'>
      <div className='flex flex-col flex-nowrap gap-8 2xsm:w-full md:w-2/3'>
        <section>
          <h1 className='bg-gradient-to-r from-cyan-500 to-purple-500 bg-clip-text text-center text-3xl font-black text-transparent'>
            {t("title")}
          </h1>
          <p className='text-center'>{t("last_updated")}</p>
        </section>
        <RenderPrivacyPolicyScreen />
      </div>
    </main>
  );
}
