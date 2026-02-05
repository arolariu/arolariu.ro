/**
 * @fileoverview Sign-up page for the authentication flow.
 * @module app/auth/sign-up/[[...sign-up]]/page
 */

import {createMetadata} from "@/metadata";
import type {Metadata} from "next";
import {getLocale, getTranslations} from "next-intl/server";
import RenderAuthSignUpPage from "./island";
import styles from "./page.module.scss";

/**
 * Generates localized metadata for the sign-up page.
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
 */
export default async function AuthSignUpPage(_props: Readonly<PageProps<"/auth/sign-up/[[...sign-up]]">>): Promise<React.JSX.Element> {
  return (
    <section className={styles["pageSection"]}>
      <RenderAuthSignUpPage />
    </section>
  );
}
