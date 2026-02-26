/**
 * @fileoverview Sign-in page for the authentication flow.
 * @module app/auth/sign-in/[[...sign-in]]/page
 */

import {createMetadata} from "@/metadata";
import type {Metadata} from "next";
import {getLocale, getTranslations} from "next-intl/server";
import RenderAuthSignInPage from "./island";
import styles from "./page.module.scss";

/**
 * Generates localized metadata for the sign-in page.
 */
export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Auth.SignIn.metadata");
  const locale = await getLocale();

  return createMetadata({
    locale,
    title: t("title"),
    description: t("description"),
  });
}

/**
 * Renders the sign-in page with the Clerk authentication UI.
 */
export default async function AuthSignInPage(_props: Readonly<PageProps<"/auth/sign-in/[[...sign-in]]">>): Promise<React.JSX.Element> {
  return (
    <section className={styles["pageSection"]}>
      <RenderAuthSignInPage />
    </section>
  );
}
