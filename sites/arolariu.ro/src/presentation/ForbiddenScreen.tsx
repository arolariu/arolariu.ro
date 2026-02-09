"use client";

import {useTranslations} from "next-intl";
import Image from "next/image";
import Link from "next/link";
import styles from "./ForbiddenScreen.module.scss";

/**
 * @fileoverview Presentation component for the "forbidden" (HTTP 403) state.
 * @module presentation/ForbiddenScreen
 *
 * @remarks
 * This is a UI-only screen used when a user is authenticated but not authorized
 * to access a resource.
 *
 * **Internationalization**: Uses `next-intl` via `useTranslations("Forbidden.Screen")`.
 *
 * **Rendering context**: Intended for client-side rendering because it uses a React
 * hook (`useTranslations`). Ensure it is rendered under a Client Component boundary.
 */

/**
 * Renders a localized "forbidden" screen for unauthorized access attempts.
 *
 * @remarks
 * The illustration is marked as decorative (`alt=""` + `aria-hidden`) so assistive
 * technologies focus on the localized heading and descriptive text.
 *
 * @returns A full-page section explaining the access restriction.
 *
 * @example
 * ```tsx
 * import RenderForbiddenScreen from "@/presentation/ForbiddenScreen";
 *
 * export default function Page(): React.JSX.Element {
 *   return <RenderForbiddenScreen />;
 * }
 * ```
 */
export default function RenderForbiddenScreen(): React.JSX.Element {
  const t = useTranslations("Forbidden.Screen");

  return (
    <section className={styles["container"]}>
      <Image
        src='/images/auth/forbidden.svg'
        alt=''
        aria-hidden
        className={styles["image"]}
        width={500}
        height={500}
      />
      <article className={styles["content"]}>
        <h1 className={styles["title"]}>
          {t("title")}
        </h1>
        <span className={styles["emoji"]}>😭</span>
        <p className={styles["description"]}>{t("description")}</p>
      </article>
      <article className={styles["ctaWrapper"]}>
        <Link
          href='/auth'
          className={styles["ctaLink"]}>
          {t("callToAction")}
        </Link>
      </article>
    </section>
  );
}
