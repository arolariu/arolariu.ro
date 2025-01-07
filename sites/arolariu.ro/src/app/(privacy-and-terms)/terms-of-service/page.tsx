/** @format */

import type {Metadata} from "next";
import {useTranslations} from "next-intl";
import * as React from "react";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "The terms of service for arolariu.ro",
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type TermsSectionProps = {titleKey: any; contentKey: any};
const TermsSection = React.memo(({titleKey, contentKey}: Readonly<TermsSectionProps>) => {
  const t = useTranslations("termsOfService");
  return (
    <section className='py-4'>
      <span className='text-2xl font-black underline'>{t(titleKey)}</span>
      <p className='text-pretty italic'>{t(contentKey)}</p>
    </section>
  );
});

const sections = [
  {titleKey: "terms.generalTerms.title", contentKey: "terms.generalTerms.content"},
  {titleKey: "terms.licenseTerms.title", contentKey: "terms.licenseTerms.content"},
  {titleKey: "terms.definitionTerms.title", contentKey: "terms.definitionTerms.content"},
  {titleKey: "terms.restrictionTerms.title", contentKey: "terms.restrictionTerms.content"},
  {titleKey: "terms.consentTerms.title", contentKey: "terms.consentTerms.content"},
  {titleKey: "terms.linksToOtherSitesTerms.title", contentKey: "terms.linksToOtherSitesTerms.content"},
  {titleKey: "terms.cookiesTerms.title", contentKey: "terms.cookiesTerms.content"},
  {titleKey: "terms.changesToTos.title", contentKey: "terms.changesToTos.content"},
  {titleKey: "terms.updateOfServicesTerms.title", contentKey: "terms.updateOfServicesTerms.content"},
  {titleKey: "terms.thirdPartyTerms.title", contentKey: "terms.thirdPartyTerms.content"},
  {titleKey: "terms.terminationTerms.title", contentKey: "terms.terminationTerms.content"},
  {titleKey: "terms.noWarrantiesTerms.title", contentKey: "terms.noWarrantiesTerms.content"},
  {titleKey: "terms.liabilityTerms.title", contentKey: "terms.liabilityTerms.content"},
  {titleKey: "terms.severabilityTerms.title", contentKey: "terms.severabilityTerms.content"},
  {titleKey: "terms.waiverTerms.title", contentKey: "terms.waiverTerms.content"},
  {titleKey: "terms.amendmentsTerms.title", contentKey: "terms.amendmentsTerms.content"},
  {titleKey: "terms.entireAgreementTerms.title", contentKey: "terms.entireAgreementTerms.content"},
  {titleKey: "terms.arbitrateTerms.title", contentKey: "terms.arbitrateTerms.content"},
  {titleKey: "terms.submissionsAndPrivacyTerms.title", contentKey: "terms.submissionsAndPrivacyTerms.content"},
  {titleKey: "terms.promotionTerms.title", contentKey: "terms.promotionTerms.content"},
  {titleKey: "terms.typographyErrorsTerms.title", contentKey: "terms.typographyErrorsTerms.content"},
  {titleKey: "terms.miscellaneousTerms.title", contentKey: "terms.miscellaneousTerms.content"},
  {titleKey: "terms.disclaimerTerms.title", contentKey: "terms.disclaimerTerms.content"},
];

/**
 * The terms of service page.
 * @returns The terms of service page.
 */
export default function TermsOfServicePage() {
  const t = useTranslations("termsOfService");

  return (
    <main className='flex flex-col flex-nowrap items-center justify-center justify-items-center gap-8 px-12 py-24'>
      <article className='pb-12'>
        <div className='flex flex-col flex-nowrap items-center justify-center justify-items-center'>
          <h1 className='bg-gradient-to-r from-cyan-500 to-purple-500 bg-clip-text text-3xl font-black text-transparent'>
            {t("title")}
          </h1>
          <span>{t("last_updated")}</span>
        </div>
        {sections.map((section) => (
          <TermsSection
            key={section.titleKey}
            titleKey={section.titleKey}
            contentKey={section.contentKey}
          />
        ))}
        <section className='bg-gradient-to-r from-cyan-500 to-purple-500 bg-clip-text pt-8 text-3xl font-black italic text-transparent'>
          {t("contactInformation.content")}
        </section>
      </article>
    </main>
  );
}
