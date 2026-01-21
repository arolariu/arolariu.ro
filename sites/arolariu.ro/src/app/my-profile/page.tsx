/**
 * @fileoverview Authenticated user profile page.
 * @module app/my-profile/page
 *
 * @remarks
 * Provides metadata and a server-rendered page that redirects unauthenticated
 * users to the sign-in flow and renders the profile island for authenticated
 * sessions.
 */

import {createMetadata} from "@/metadata";
import {currentUser} from "@clerk/nextjs/server";
import type {Metadata} from "next";
import {getLocale, getTranslations} from "next-intl/server";
import {redirect} from "next/navigation";
import RenderMyProfileScreen from "./island";

/**
 * Generates localized metadata for the profile page.
 *
 * @remarks
 * **Rendering Context**: Server Component metadata generator.
 *
 * **i18n**: Uses `next-intl` translations from MyProfile.meta.
 *
 * @returns Metadata configured for the profile route.
 *
 * @example
 * ```tsx
 * export async function generateMetadata() {
 *   return {title: "My Profile"};
 * }
 * ```
 */
export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("MyProfile.meta");
  const locale = await getLocale();
  return createMetadata({
    locale,
    title: t("title"),
    description: t("description"),
  });
}

/**
 * Renders the authenticated user profile page.
 *
 * @remarks
 * **Rendering Context**: Server Component (App Router page).
 *
 * **Auth Guard**: Redirects to sign-in when no user session is available.
 *
 * **Data Flow**: Serializes the Clerk user object for the client island.
 *
 * @returns The profile UI rendered via `ProfileIsland`.
 *
 * @example
 * ```tsx
 * // Next.js renders this page at /my-profile
 * <MyProfilePage />
 * ```
 */
export default async function MyProfileHomepage(props: Readonly<PageProps<"/my-profile">>): Promise<React.JSX.Element> {
  const user = await currentUser();
  if (!user) redirect("/auth/sign-in?redirect_url=/my-profile");

  // Serialize the user object for the client component
  const serializedUser = structuredClone(user);

  return <RenderMyProfileScreen user={serializedUser} />;
}
