import {createMetadata} from "@/metadata";
import type {Metadata} from "next";
import {getLocale, getTranslations} from "next-intl/server";
import RenderTermsOfServiceScreen from "./island";

/**
 * Generates SEO metadata for the Terms of Service legal agreement page.
 *
 * @remarks
 * **Execution Context**: Async Server Component metadata generation function.
 *
 * **Purpose**: Creates localized SEO metadata for the legally binding Terms of Service,
 * ensuring proper indexing, accessibility, and discoverability of the contractual agreement.
 *
 * **Legal Nature**:
 * - Terms of Service constitute a legally binding contract between platform and users
 * - Must be easily accessible and discoverable before users accept the agreement
 * - Courts recognize ToS as enforceable contracts when properly presented
 * - Proper SEO ensures users can find and reference terms when needed
 *
 * **Async Operations**:
 * - Fetches translations from `termsOfService.__metadata__` namespace
 * - Retrieves current locale for language-specific legal content
 *
 * **Metadata Generation**:
 * - Uses `createMetadata` utility for consistent SEO structure
 * - Includes translated title and description
 * - Applies locale-specific metadata for international enforceability
 *
 * **Why Async?**:
 * - `getTranslations` and `getLocale` are async in next-intl/server
 * - Allows server-side i18n for legal contracts
 * - Ensures metadata is rendered before page content
 *
 * **SEO Benefits**:
 * - Improves discoverability for users seeking contractual terms
 * - Provides localized Open Graph and Twitter Card tags
 * - Enhances search engine indexing with relevant legal keywords
 * - Facilitates dispute resolution by making terms easily referenceable
 *
 * @returns Promise resolving to Next.js Metadata object with localized legal contract tags
 *
 * @example
 * ```tsx
 * // Automatically invoked by Next.js App Router
 * // No manual invocation needed
 * export async function generateMetadata(): Promise<Metadata> {
 *   // Implementation
 * }
 * ```
 *
 * @see {@link createMetadata} - Utility function for consistent metadata generation
 * @see {@link https://nextjs.org/docs/app/api-reference/functions/generate-metadata | Next.js Metadata API}
 * @see {@link https://next-intl.com/docs/environments/server-client-components | next-intl Server Components}
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
 * Renders the Terms of Service page establishing the legal contract with users.
 *
 * @remarks
 * **Rendering Context**: Async Server Component (default in Next.js App Router).
 *
 * **Legal Nature**: This page constitutes a legally binding contract that:
 * - Establishes the relationship between arolariu.ro and its users
 * - Defines rights, responsibilities, and limitations for both parties
 * - Provides legal protection and liability limitations
 * - Must be accepted (explicitly or implicitly) before platform use
 *
 * **Contractual Components**: Typically includes:
 * - **User Obligations**: Acceptable use policies, prohibited activities, account responsibilities
 * - **Platform Rights**: Right to modify service, suspend accounts, terminate access
 * - **Intellectual Property**: Copyright, trademarks, user-generated content ownership
 * - **Liability Limitations**: Disclaimers, indemnification, dispute resolution
 * - **Termination**: Conditions for account suspension or service discontinuation
 * - **Governing Law**: Jurisdiction and applicable legal framework
 *
 * **Legal Requirements**:
 * - Must be presented clearly and be easily accessible
 * - Should include "last updated" date for version tracking
 * - Changes require user notification (re-acceptance may be needed)
 * - International users may require translated versions for enforceability
 *
 * **Async Operations**:
 * - Fetches translations from `termsOfService` namespace via `getTranslations`
 * - Loads localized legal content for international contract validity
 *
 * **Component Architecture**:
 * - **Server Component** (this): Renders static legal contract text on server
 * - **Client Island** (`RenderTermsOfServiceScreen`): Handles interactive sections (TOC, expand/collapse)
 *
 * **Why This Pattern?**:
 * - Server rendering ensures legal contract is immediately visible (no JS required)
 * - Critical legal text always renders, ensuring enforceability even if JS fails
 * - Client island adds progressive enhancement for navigation and usability
 * - Reduces JavaScript bundle while maintaining interactivity
 *
 * **Internationalization**:
 * - Supports multiple locales for international enforceability
 * - Translated ToS increases legal validity in non-English jurisdictions
 * - Uses `next-intl` for server-side translation loading
 * - Some jurisdictions require native language contracts for enforceability
 *
 * **Page Structure**:
 * 1. **Header Section**: Title and last updated date (legal version tracking requirement)
 * 2. **Main Content**: Detailed terms and conditions sections (via client island)
 * 3. **Contact Section**: Contact information for legal inquiries and disputes
 *
 * **Performance Considerations**:
 * - Server-side rendering ensures instant legal content visibility
 * - Static contract text rendered on server reduces client bundle
 * - Client island loads only interactive UI components
 *
 * **Accessibility**:
 * - Semantic HTML with proper heading hierarchy for legal structure
 * - High-contrast gradient text for readability
 * - Screen reader compatible for users with disabilities (ADA compliance)
 *
 * **Best Practices**:
 * - Version control with last updated timestamp
 * - Clear, plain language (where legally possible)
 * - Conspicuous presentation of critical clauses
 * - Archival of previous versions for dispute resolution
 *
 * @returns Promise resolving to server-rendered Terms of Service page with legal contract
 *
 * @example
 * ```tsx
 * // Automatically rendered by Next.js App Router at /terms-of-service
 * // Route file: app/(privacy-and-terms)/terms-of-service/page.tsx
 * ```
 *
 * @see {@link RenderTermsOfServiceScreen} - Client island for interactive ToS UI
 * @see {@link https://www.ftc.gov/business-guidance/resources/website-terms-service | FTC Terms of Service Guidelines}
 * @see {@link https://termly.io/resources/articles/what-are-terms-and-conditions/ | Terms & Conditions Best Practices}
 */
export default async function TermsOfServicePage(): Promise<React.JSX.Element> {
  const t = await getTranslations("termsOfService");

  return (
    <main className='flex flex-col flex-nowrap items-center justify-center justify-items-center gap-8 px-12 py-24'>
      <section className='flex flex-col flex-nowrap items-center justify-center justify-items-center'>
        <h1 className='bg-linear-to-r from-gradient-from to-gradient-to bg-clip-text text-3xl font-black text-transparent'>{t("title")}</h1>
        <span>{t("last_updated")}</span>
      </section>
      <RenderTermsOfServiceScreen />
      <section className='bg-linear-to-r from-gradient-from to-gradient-to bg-clip-text pt-8 text-3xl font-black text-transparent italic'>
        {t("contactInformation.content")}
      </section>
    </main>
  );
}
