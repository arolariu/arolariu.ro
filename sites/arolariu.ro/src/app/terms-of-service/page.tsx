/** @format */

import {type Metadata} from "next";
import {useTranslations} from "next-intl";

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
      <section>
        <h2 className='text-2xl font-black underline'>{t("terms.generalTerms.title")}</h2>
        <article className='italic'>{t("terms.generalTerms.content")}</article>
      </section>
      <section>
        <h2 className='text-2xl font-black underline'>{t("terms.licenseTerms.title")}</h2>
        <article className='italic'>{t("terms.licenseTerms.content")}</article>
      </section>
      <section>
        <h2 className='text-2xl font-black underline'>{t("terms.definitionTerms.title")}</h2>
        <article className='italic'>{t("terms.definitionTerms.content")}</article>
      </section>
      <section>
        <h2 className='text-2xl font-black underline'>{t("terms.restrictionTerms.title")}</h2>
        <article className='italic'>{t("terms.restrictionTerms.content")}</article>
      </section>
      <section>
        <h2 className='text-2xl font-black underline'>{t("terms.consentTerms.title")}</h2>
        <article className='italic'>{t("terms.consentTerms.content")}</article>
      </section>
      <section>
        <h2 className='text-2xl font-black underline'>{t("terms.linksToOtherSitesTerms.title")}</h2>
        <article className='italic'>{t("terms.linksToOtherSitesTerms.content")}</article>
      </section>
      <section>
        <h2 className='text-2xl font-black underline'>{t("terms.cookiesTerms.title")}</h2>
        <article className='italic'>{t("terms.cookiesTerms.content")} </article>
      </section>
      <section>
        <h2 className='text-2xl font-black underline'>{t("terms.changesToTos.title")}</h2>
        <article className='italic'>{t("terms.changesToTos.content")}</article>
      </section>
      <section>
        <h2 className='text-2xl font-black underline'>{t("terms.updateOfServicesTerms.title")}</h2>
        <article className='italic'>{t("terms.updateOfServicesTerms.content")}</article>
      </section>
      <section>
        <h2 className='text-2xl font-black underline'>{t("terms.thirdPartyTerms.title")}</h2>
        <article className='italic'>{t("terms.thirdPartyTerms.content")}</article>
      </section>
      <section>
        <h2 className='text-2xl font-black underline'>{t("terms.terminationTerms.title")}</h2>
        <article className='italic'>{t("terms.terminationTerms.content")}</article>
      </section>
      <section>
        <h2 className='text-2xl font-black underline'>{t("terms.noWarrantiesTerms.title")}</h2>
        <article className='italic'>{t("terms.noWarrantiesTerms.content")}</article>
      </section>
      <section>
        <h2 className='text-2xl font-black underline'>{t("terms.liabilityTerms.title")}</h2>
        <article className='italic'>{t("terms.liabilityTerms.content")}</article>
      </section>
      <section>
        <h2 className='text-2xl font-black underline'>{t("terms.severabilityTerms.title")}</h2>
        <article className='italic'>{t("terms.severabilityTerms.content")}</article>
      </section>
      <section>
        <h2 className='text-2xl font-black underline'>{t("terms.waiverTerms.title")}</h2>
        <article className='italic'>{t("terms.waiverTerms.content")}</article>
      </section>
      <section>
        <h2 className='text-2xl font-black underline'>{t("terms.amendmentsTerms.title")}</h2>
        <article className='italic'>{t("terms.amendmentsTerms.content")}</article>
      </section>
      <section>
        <h2 className='text-2xl font-black underline'>{t("terms.entireAgreementTerms.title")}</h2>
        <article className='italic'>{t("terms.entireAgreementTerms.content")}</article>
      </section>
      <section>
        <h2 className='text-2xl font-black underline'>{t("terms.updateOfServicesTerms.title")}</h2>
        <article className='italic'>{t("terms.updateOfServicesTerms.content")}</article>
      </section>
      <section>
        <h2 className='text-2xl font-black underline'>{t("terms.arbitrateTerms.title")}</h2>
        <article className='italic'>{t("terms.arbitrateTerms.content")}</article>
      </section>
      <section>
        <h2 className='text-2xl font-black underline'>{t("terms.submissionsAndPrivacyTerms.title")}</h2>
        <article className='italic'>{t("terms.submissionsAndPrivacyTerms.content")}</article>
      </section>
      <section>
        <h2 className='text-2xl font-black underline'>{t("terms.promotionTerms.title")}</h2>
        <article className='italic'>{t("terms.promotionTerms.content")}</article>
      </section>
      <section>
        <h2 className='text-2xl font-black underline'>{t("terms.typographyErrorsTerms.title")}</h2>
        <article className='italic'>{t("terms.typographyErrorsTerms.content")}</article>
      </section>
      <section>
        <h2 className='text-2xl font-black underline'>{t("terms.miscellaneousTerms.title")}</h2>
        <article className='italic'>{t("terms.miscellaneousTerms.content")}</article>
      </section>
      <section>
        <h2 className='text-2xl font-black underline'>{t("terms.disclaimerTerms.title")}</h2>
        <article className='italic'>{t("terms.disclaimerTerms.content")}</article>
      </section>
      <article className='bg-gradient-to-r from-cyan-500 to-purple-500 bg-clip-text pt-8 text-3xl font-black italic text-transparent'>
        {t("contactInformation.content")}
      </article>
    </main>
  );
}
