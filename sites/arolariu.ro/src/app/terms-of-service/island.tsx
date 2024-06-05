/** @format */

import {useTranslations} from "next-intl";

/**
 * This function renders the terms of service screen.
 * @returns The terms of service screen.
 */
export default function RenderTermsOfServiceScreen() {
  const t = useTranslations("termsOfService");
  return (
    <>
      <section>
        <h2 className='text-2xl font-black underline'>{t("terms.generalTerms.title")}</h2>
        <article className='text-pretty italic'>{t("terms.generalTerms.content")}</article>
      </section>
      <section>
        <h2 className='text-2xl font-black underline'>{t("terms.licenseTerms.title")}</h2>
        <article className='text-pretty italic'>{t("terms.licenseTerms.content")}</article>
      </section>
      <section>
        <h2 className='text-2xl font-black underline'>{t("terms.definitionTerms.title")}</h2>
        <article className='text-pretty italic'>{t("terms.definitionTerms.content")}</article>
      </section>
      <section>
        <h2 className='text-2xl font-black underline'>{t("terms.restrictionTerms.title")}</h2>
        <article className='text-pretty italic'>{t("terms.restrictionTerms.content")}</article>
      </section>
      <section>
        <h2 className='text-2xl font-black underline'>{t("terms.consentTerms.title")}</h2>
        <article className='text-pretty italic'>{t("terms.consentTerms.content")}</article>
      </section>
      <section>
        <h2 className='text-2xl font-black underline'>{t("terms.linksToOtherSitesTerms.title")}</h2>
        <article className='text-pretty italic'>{t("terms.linksToOtherSitesTerms.content")}</article>
      </section>
      <section>
        <h2 className='text-2xl font-black underline'>{t("terms.cookiesTerms.title")}</h2>
        <article className='text-pretty italic'>{t("terms.cookiesTerms.content")} </article>
      </section>
      <section>
        <h2 className='text-2xl font-black underline'>{t("terms.changesToTos.title")}</h2>
        <article className='text-pretty italic'>{t("terms.changesToTos.content")}</article>
      </section>
      <section>
        <h2 className='text-2xl font-black underline'>{t("terms.updateOfServicesTerms.title")}</h2>
        <article className='text-pretty italic'>{t("terms.updateOfServicesTerms.content")}</article>
      </section>
      <section>
        <h2 className='text-2xl font-black underline'>{t("terms.thirdPartyTerms.title")}</h2>
        <article className='text-pretty italic'>{t("terms.thirdPartyTerms.content")}</article>
      </section>
      <section>
        <h2 className='text-2xl font-black underline'>{t("terms.terminationTerms.title")}</h2>
        <article className='text-pretty italic'>{t("terms.terminationTerms.content")}</article>
      </section>
      <section>
        <h2 className='text-2xl font-black underline'>{t("terms.noWarrantiesTerms.title")}</h2>
        <article className='text-pretty italic'>{t("terms.noWarrantiesTerms.content")}</article>
      </section>
      <section>
        <h2 className='text-2xl font-black underline'>{t("terms.liabilityTerms.title")}</h2>
        <article className='text-pretty italic'>{t("terms.liabilityTerms.content")}</article>
      </section>
      <section>
        <h2 className='text-2xl font-black underline'>{t("terms.severabilityTerms.title")}</h2>
        <article className='text-pretty italic'>{t("terms.severabilityTerms.content")}</article>
      </section>
      <section>
        <h2 className='text-2xl font-black underline'>{t("terms.waiverTerms.title")}</h2>
        <article className='text-pretty italic'>{t("terms.waiverTerms.content")}</article>
      </section>
      <section>
        <h2 className='text-2xl font-black underline'>{t("terms.amendmentsTerms.title")}</h2>
        <article className='text-pretty italic'>{t("terms.amendmentsTerms.content")}</article>
      </section>
      <section>
        <h2 className='text-2xl font-black underline'>{t("terms.entireAgreementTerms.title")}</h2>
        <article className='text-pretty italic'>{t("terms.entireAgreementTerms.content")}</article>
      </section>
      <section>
        <h2 className='text-2xl font-black underline'>{t("terms.updateOfServicesTerms.title")}</h2>
        <article className='text-pretty italic'>{t("terms.updateOfServicesTerms.content")}</article>
      </section>
      <section>
        <h2 className='text-2xl font-black underline'>{t("terms.arbitrateTerms.title")}</h2>
        <article className='text-pretty italic'>{t("terms.arbitrateTerms.content")}</article>
      </section>
      <section>
        <h2 className='text-2xl font-black underline'>{t("terms.submissionsAndPrivacyTerms.title")}</h2>
        <article className='text-pretty italic'>{t("terms.submissionsAndPrivacyTerms.content")}</article>
      </section>
      <section>
        <h2 className='text-2xl font-black underline'>{t("terms.promotionTerms.title")}</h2>
        <article className='text-pretty italic'>{t("terms.promotionTerms.content")}</article>
      </section>
      <section>
        <h2 className='text-2xl font-black underline'>{t("terms.typographyErrorsTerms.title")}</h2>
        <article className='text-pretty italic'>{t("terms.typographyErrorsTerms.content")}</article>
      </section>
      <section>
        <h2 className='text-2xl font-black underline'>{t("terms.miscellaneousTerms.title")}</h2>
        <article className='text-pretty italic'>{t("terms.miscellaneousTerms.content")}</article>
      </section>
      <section>
        <h2 className='text-2xl font-black underline'>{t("terms.disclaimerTerms.title")}</h2>
        <article className='text-pretty italic'>{t("terms.disclaimerTerms.content")}</article>
      </section>
      <article className='bg-gradient-to-r from-cyan-500 to-purple-500 bg-clip-text pt-8 text-3xl font-black italic text-transparent'>
        {t("contactInformation.content")}
      </article>
    </>
  );
}
