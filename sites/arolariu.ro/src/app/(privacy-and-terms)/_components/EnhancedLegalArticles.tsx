"use client";
import {RichText} from "@/presentation/Text";

type TranslatedPage = Readonly<"privacyPolicy" | "termsOfService">;
type TranslatedPageArticle = Readonly<{titleKey: string; contentKey: string}>;
type TranslatedPageArticles = Readonly<TranslatedPageArticle[]>;

const articlesForPrivacyPolicy: TranslatedPageArticles = [
  {titleKey: "terms.whatIsTerms.title", contentKey: "terms.whatIsTerms.content"},
  {titleKey: "terms.scopeTerms.title", contentKey: "terms.scopeTerms.content"},
  {titleKey: "terms.processingTerms.title", contentKey: "terms.processingTerms.content"},
  {titleKey: "terms.dataCollectionTerms.title", contentKey: "terms.dataCollectionTerms.content"},
  {titleKey: "terms.howWeCollectDataTerms.title", contentKey: "terms.howWeCollectDataTerms.content"},
  {titleKey: "terms.deviceUsageTerms.title", contentKey: "terms.deviceUsageTerms.content"},
  {titleKey: "terms.thirdPartyData.title", contentKey: "terms.thirdPartyData.content"},
  {titleKey: "terms.processingDataTerms.title", contentKey: "terms.processingDataTerms.content"},
  {titleKey: "terms.dataTransferTerms.title", contentKey: "terms.dataTransferTerms.content"},
  {titleKey: "terms.sharingAndDisclosureTerms.title", contentKey: "terms.sharingAndDisclosureTerms.content"},
  {titleKey: "terms.legalTerms.title", contentKey: "terms.legalTerms.content"},
  {titleKey: "terms.serviceProviderTerms.title", contentKey: "terms.serviceProviderTerms.content"},
  {titleKey: "terms.cookiesDefinition.title", contentKey: "terms.cookiesDefinition.content"},
  {titleKey: "terms.childrenPrivacy.title", contentKey: "terms.childrenPrivacy.content"},
  {titleKey: "terms.safeDataTerms.title", contentKey: "terms.safeDataTerms.content"},
  {titleKey: "terms.personalDataRights.title", contentKey: "terms.personalDataRights.content"},
  {titleKey: "terms.withdrawingConsent.title", contentKey: "terms.withdrawingConsent.content"},
  {titleKey: "terms.exerciseRights.title", contentKey: "terms.exerciseRights.content"},
  {titleKey: "terms.policyChanges.title", contentKey: "terms.policyChanges.content"},
] as const;

const articlesForTermsOfService: TranslatedPageArticles = [
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
] as const;

const articles = {
  privacyPolicy: articlesForPrivacyPolicy,
  termsOfService: articlesForTermsOfService,
} as Readonly<Record<TranslatedPage, TranslatedPageArticles>>;

/**
 * The EnhancedLegalArticles component renders a list of legal articles for a given page type.
 * @param pageType The type of page for which to render the legal articles.
 * @returns A list of legal articles for the given page type.
 */
export default function EnhancedLegalArticles({pageType}: Readonly<{pageType: TranslatedPage}>): React.JSX.Element {
  // eslint-disable-next-line security/detect-object-injection -- this is safe.
  const sections = articles[pageType];

  return (
    <>
      {sections.map((section) => {
        const titleKey = section.titleKey as keyof TranslatedPageArticle;
        const contentKey = section.contentKey as keyof TranslatedPageArticle;
        return (
          <article
            className='w-full py-4'
            key={titleKey}>
            <span className='text-2xl font-black tracking-widest underline'>
              <RichText
                sectionKey={pageType}
                textKey={titleKey}
              />
            </span>
            <section className='text-pretty italic'>
              <RichText
                sectionKey={pageType}
                textKey={contentKey}
              />
            </section>
          </article>
        );
      })}
    </>
  );
}
