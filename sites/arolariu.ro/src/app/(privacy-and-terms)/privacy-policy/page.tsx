import {createMetadata} from "@/metadata";
import type {Metadata} from "next";
import {getLocale, getTranslations} from "next-intl/server";
import RenderPrivacyPolicyScreen from "./island";

/**
 * Generates SEO metadata for the Privacy Policy page with legal compliance.
 *
 * @remarks
 * **Execution Context**: Async Server Component metadata generation function.
 *
 * **Purpose**: Creates localized SEO metadata for the legally required privacy policy page,
 * ensuring proper indexing and social media sharing while maintaining GDPR/CCPA compliance.
 *
 * **Legal Compliance**:
 * - Privacy Policy is legally required under GDPR (EU), CCPA (California), and other regulations
 * - Must be easily discoverable and accessible to users
 * - SEO metadata ensures search engines index this critical legal document
 *
 * **Async Operations**:
 * - Fetches translations from `privacyPolicy.__metadata__` namespace
 * - Retrieves current locale for language-specific legal content
 *
 * **Metadata Generation**:
 * - Uses `createMetadata` utility for consistent SEO structure
 * - Includes translated title and description
 * - Applies locale-specific metadata for international users
 *
 * **Why Async?**:
 * - `getTranslations` and `getLocale` are async in next-intl/server
 * - Allows server-side i18n for legal content
 * - Ensures metadata is rendered before page content
 *
 * **SEO Benefits**:
 * - Improves discoverability of privacy policy for users and regulators
 * - Provides localized Open Graph and Twitter Card tags
 * - Enhances search engine indexing with relevant legal keywords
 *
 * @returns Promise resolving to Next.js Metadata object with localized legal document tags
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
  const t = await getTranslations("privacyPolicy.__metadata__");
  const locale = await getLocale();
  return createMetadata({
    locale,
    title: t("title"),
    description: t("description"),
  });
}

/**
 * Renders the Privacy Policy page outlining data handling and user rights.
 *
 * @remarks
 * **Rendering Context**: Async Server Component (default in Next.js App Router).
 *
 * **Legal Compliance**: This page is legally required under multiple regulations:
 * - **GDPR** (General Data Protection Regulation - EU): Requires transparent privacy policies
 * - **CCPA** (California Consumer Privacy Act - USA): Mandates accessible privacy information
 * - **ePrivacy Directive** (EU): Cookie consent and tracking disclosures
 *
 * **Purpose**: Provides legally required information about:
 * - What personal data is collected (PII, cookies, analytics)
 * - How data is used and processed
 * - User rights (access, deletion, portability, objection)
 * - Third-party data sharing and processors
 * - Data retention policies and security measures
 *
 * **Async Operations**:
 * - Fetches translations from `privacyPolicy` namespace via `getTranslations`
 * - Loads localized legal content for international compliance
 *
 * **Component Architecture**:
 * - **Server Component** (this): Renders static legal content on server
 * - **Client Island** (`RenderPrivacyPolicyScreen`): Handles interactive sections (expand/collapse, TOC)
 *
 * **Why This Pattern?**:
 * - Server rendering ensures legal content is immediately visible (no JS required)
 * - Client island adds progressive enhancement for navigation and readability
 * - Reduces JavaScript bundle while maintaining interactivity
 * - Critical legal text always renders, even if JS fails
 *
 * **Internationalization**:
 * - Supports multiple locales for international users
 * - Legal content must be provided in user's language per GDPR Article 12
 * - Uses `next-intl` for server-side translation loading
 *
 * **Page Structure**:
 * 1. **Header Section**: Title and last updated date (legal requirement)
 * 2. **Main Content**: Detailed privacy policy sections (via client island)
 * 3. **Contact Section**: Contact information for privacy inquiries (GDPR requirement)
 *
 * **Performance Considerations**:
 * - Server-side rendering ensures instant content visibility
 * - Static legal text rendered on server reduces client bundle
 * - Client island loads only interactive UI components
 *
 * **Accessibility**:
 * - Semantic HTML with proper heading hierarchy
 * - High-contrast gradient text for readability
 * - Screen reader compatible structure
 *
 * @returns Promise resolving to server-rendered privacy policy page with legal content
 *
 * @example
 * ```tsx
 * // Automatically rendered by Next.js App Router at /privacy-policy
 * // Route file: app/(privacy-and-terms)/privacy-policy/page.tsx
 * ```
 *
 * @see {@link RenderPrivacyPolicyScreen} - Client island for interactive privacy policy UI
 * @see {@link https://gdpr.eu/privacy-notice/ | GDPR Privacy Notice Requirements}
 * @see {@link https://oag.ca.gov/privacy/ccpa | CCPA Privacy Policy Requirements}
 */
export default async function PrivacyPolicyPage(): Promise<React.JSX.Element> {
  const t = await getTranslations("privacyPolicy");

  return (
    <main className='flex flex-col flex-nowrap items-center justify-center justify-items-center gap-8 px-12 py-24'>
      <section className='flex flex-col flex-nowrap items-center justify-center justify-items-center'>
        <h1 className='from-gradient-from to-gradient-to bg-linear-to-r bg-clip-text text-3xl font-black text-transparent'>{t("title")}</h1>
        <span>{t("last_updated")}</span>
      </section>
      <RenderPrivacyPolicyScreen />
      <section className='from-gradient-from to-gradient-to bg-linear-to-r bg-clip-text pt-8 text-3xl font-black text-transparent italic'>
        {t("contactInformation.content")}
      </section>
    </main>
  );
}
