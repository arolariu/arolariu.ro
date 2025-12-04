import {createMetadata} from "@/metadata";
import type {Metadata} from "next";
import {getLocale, getTranslations} from "next-intl/server";
import RenderAboutScreen from "./island";

/**
 * Generates SEO metadata for the About page with brand storytelling focus.
 *
 * @remarks
 * **Execution Context**: Async Server Component metadata generation function.
 *
 * **Purpose**: Creates localized SEO metadata for the About page, which serves as
 * the primary brand introduction and platform mission statement for visitors.
 *
 * **Brand Storytelling**:
 * - About pages are critical for establishing trust and credibility
 * - Often the second-most visited page after homepage
 * - Humanizes the platform by sharing origin story and vision
 * - Differentiates from competitors through unique value proposition
 *
 * **Async Operations**:
 * - Fetches translations from `About.__metadata__` namespace
 * - Retrieves current locale for language-specific brand messaging
 *
 * **Metadata Generation**:
 * - Uses `createMetadata` utility for consistent SEO structure
 * - Includes translated title and description
 * - Applies locale-specific metadata for international audience
 *
 * **Why Async?**:
 * - `getTranslations` and `getLocale` are async in next-intl/server
 * - Allows server-side i18n for brand content
 * - Ensures metadata is rendered before page content
 *
 * **SEO Benefits**:
 * - Improves organic search visibility for brand-related queries
 * - Provides compelling Open Graph and Twitter Card previews for social sharing
 * - Enhances search engine understanding of platform purpose and value
 * - Supports "About [Brand]" and "What is [Brand]" search queries
 *
 * @returns Promise resolving to Next.js Metadata object with localized brand storytelling tags
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
  const t = await getTranslations("About.__metadata__");
  const locale = await getLocale();
  return createMetadata({
    locale,
    title: t("title"),
    description: t("description"),
  });
}

/**
 * Renders the About page introducing the platform's mission, vision, and story.
 *
 * @remarks
 * **Rendering Context**: Async Server Component (default in Next.js App Router).
 *
 * **Purpose**: Serves as the primary brand introduction page that:
 * - Communicates the platform's mission, vision, and core values
 * - Shares the origin story and motivation behind arolariu.ro
 * - Establishes credibility and builds trust with visitors
 * - Differentiates the platform from competitors
 * - Provides transparency about who operates the platform
 *
 * **Typical About Page Content** (rendered via client island):
 * - **Mission Statement**: What problem the platform solves and why it exists
 * - **Origin Story**: How and why arolariu.ro was created
 * - **Vision**: Long-term goals and future direction
 * - **Values**: Core principles guiding platform development
 * - **Technology Stack**: Technical approach and architectural decisions
 * - **Team/Creator**: Background and expertise of the platform creator
 * - **Milestones**: Key achievements and development timeline
 *
 * **Component Architecture**:
 * - **Server Component** (this): Minimal server-side wrapper with layout structure
 * - **Client Island** (`RenderAboutScreen`): Handles interactive content (animations, accordions, CTAs)
 *
 * **Why This Pattern?**:
 * - Server component provides semantic HTML structure immediately
 * - Client island adds progressive enhancement for storytelling (animations, interactions)
 * - Reduces initial JavaScript bundle by offloading static structure to server
 * - Ensures core brand messaging is visible even if JavaScript fails
 *
 * **User Engagement**:
 * - About pages have 30-60 second average visit duration (high engagement)
 * - Visitors here are typically evaluating platform trustworthiness
 * - Strong About pages can increase conversion rates by 15-30%
 * - Often linked from footer, header, and marketing materials
 *
 * **Page Structure**:
 * - **Main Container**: Centered flexbox layout with responsive padding
 * - **Client Island**: All interactive brand storytelling content
 * - **Responsive Design**: Mobile-first approach with centered text alignment
 *
 * **Performance Considerations**:
 * - Server-side rendering provides instant initial paint
 * - Minimal server component reduces Time to Interactive (TTI)
 * - Client island lazy-loads interactive features
 * - Centered layout prevents content layout shift (CLS)
 *
 * **Accessibility**:
 * - Semantic `<main>` element for primary content landmark
 * - Center alignment improves readability for longer prose
 * - Flexible layout adapts to various screen sizes and orientations
 *
 * **SEO Impact**:
 * - About pages are crawled frequently by search engines
 * - Rich content improves E-A-T (Expertise, Authoritativeness, Trustworthiness)
 * - Internal linking hub connecting to other key pages
 *
 * @returns Promise resolving to server-rendered About page with brand storytelling content
 *
 * @example
 * ```tsx
 * // Automatically rendered by Next.js App Router at /about
 * // Route file: app/about/page.tsx
 * ```
 *
 * @see {@link RenderAboutScreen} - Client island for interactive brand storytelling UI
 * @see {@link https://blog.hubspot.com/marketing/best-about-us-pages | About Page Best Practices}
 */
export default async function AboutPage(): Promise<React.JSX.Element> {
  return (
    <main className='flex flex-col flex-nowrap items-center justify-center justify-items-center pt-24 text-center'>
      <RenderAboutScreen />
    </main>
  );
}
