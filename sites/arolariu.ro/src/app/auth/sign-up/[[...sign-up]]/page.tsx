/**
 * @fileoverview Sign-up page for the authentication flow.
 * @module app/auth/sign-up/[[...sign-up]]/page
 *
 * @remarks
 * Defines metadata and the server-rendered sign-up page layout for Clerk.
 *
 * @see {@link createMetadata}
 */

import {createMetadata} from "@/metadata";
import type {Metadata} from "next";
import {getLocale, getTranslations} from "next-intl/server";
import RenderAuthSignUpPage from "./island";

/**
 * Generates localized metadata for the sign-up page.
 *
 * @remarks
 * **Rendering Context**: Server Component metadata generator.
 *
 * **i18n**: Uses `next-intl` translations from Authentication.SignUp.
 *
 * **SEO**: Delegates to `createMetadata` for consistent Open Graph defaults.
 *
 * @returns Metadata configured for the sign-up route.
 *
 * @example
 * ```tsx
 * export async function generateMetadata(): Promise<Metadata> {
 *   return createMetadata({title: "Sign up"});
 * }
 * ```
 */
export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Authentication.SignUp.__metadata__");
  const locale = await getLocale();

  return createMetadata({
    locale,
    title: t("title"),
    description: t("description"),
  });
}

/**
 * Renders the sign-up page with the Clerk authentication UI.
 *
 * @remarks
 * **Rendering Context**: Server Component (App Router page).
 *
 * **Design Improvements**:
 * - Centered layout with maximum width container.
 * - Eye-catching gradient heading.
 * - Clean, modern spacing.
 * - Responsive design for all screen sizes.
 *
 * **Value Proposition**:
 * - Clear call to action.
 * - Emphasis on quick registration.
 * - Professional appearance.
 *
 * @returns The sign-up page section containing the Clerk UI island.
 *
 * @example
 * ```tsx
 * // Next.js renders this page at /auth/sign-up
 * <SignUpPage />
 * ```
 */
export default async function AuthSignUpPage(props: Readonly<PageProps<"/auth/sign-up">>): Promise<React.JSX.Element> {
  return (
    <section className='relative mx-auto flex w-full max-w-6xl items-center justify-center px-4 py-10 sm:px-6 lg:px-8 lg:py-14'>
      <RenderAuthSignUpPage />
    </section>
  );
}
