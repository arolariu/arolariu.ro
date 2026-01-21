/**
 * @fileoverview Sign-in page for the authentication flow.
 * @module app/auth/sign-in/[[...sign-in]]/page
 *
 * @remarks
 * Defines metadata and the server-rendered sign-in page layout for Clerk.
 *
 * @see {@link createMetadata}
 */

import {createMetadata} from "@/metadata";
import type {Metadata} from "next";
import {getLocale, getTranslations} from "next-intl/server";
import RenderAuthSignInPage from "./island";

/**
 * Generates localized metadata for the sign-in page.
 *
 * @remarks
 * **Rendering Context**: Server Component metadata generator.
 *
 * **i18n**: Uses `next-intl` translations from Authentication.SignIn.
 *
 * **SEO**: Delegates to `createMetadata` for consistent Open Graph defaults.
 *
 * @returns Metadata configured for the sign-in route.
 *
 * @example
 * ```tsx
 * export async function generateMetadata(): Promise<Metadata> {
 *   return createMetadata({title: "Sign in"});
 * }
 * ```
 */
export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Authentication.SignIn.__metadata__");
  const locale = await getLocale();

  return createMetadata({
    locale,
    title: t("title"),
    description: t("description"),
  });
}

/**
 * Renders the sign-in page with the Clerk authentication UI.
 *
 * @remarks
 * **Rendering Context**: Server Component (App Router page).
 *
 * **Design Improvements**:
 * - Centered layout with maximum width container.
 * - Prominent heading with gradient text effect.
 * - Improved spacing for mobile and desktop.
 * - Backdrop blur for visual depth.
 *
 * **Responsive Behavior**:
 * - Mobile: Full width with padding.
 * - Tablet/Desktop: Centered with max-width constraint.
 *
 * @returns The sign-in page section containing the Clerk UI island.
 *
 * @example
 * ```tsx
 * // Next.js renders this page at /auth/sign-in
 * <SignInPage />
 * ```
 */
export default async function AuthSignInPage(_props: Readonly<PageProps<"/auth/sign-in/[[...sign-in]]">>): Promise<React.JSX.Element> {
  return (
    <section className='relative mx-auto flex w-full max-w-6xl items-center justify-center px-4 py-10 sm:px-6 lg:px-8 lg:py-14'>
      <RenderAuthSignInPage />
    </section>
  );
}
