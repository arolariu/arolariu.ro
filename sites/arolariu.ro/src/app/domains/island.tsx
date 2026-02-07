/**
 * @fileoverview Client island for the Domains overview page.
 * @module app/domains/island
 *
 * @remarks
 * Renders the interactive Domains landing page content, including localized
 * copy and service cards with client-side navigation.
 */

"use client";

import {RichText} from "@/presentation/Text";
import {useTranslations} from "next-intl";
import Image from "next/image";
import Link from "next/link";
import styles from "./island.module.scss";

/**
 * Renders the Domains overview screen.
 *
 * @remarks
 * **Rendering Context**: Client Component (`"use client"`).
 *
 * **i18n**: Uses `next-intl` translations from the Domains namespace.
 *
 * **Navigation**: Links users to available domain experiences.
 *
 * @returns The Domains landing screen with service cards.
 *
 * @example
 * ```tsx
 * <RenderDomainsScreen />
 * ```
 */
export default function RenderDomainsScreen(): React.JSX.Element {
  const t = useTranslations("Domains");

  return (
    <main className={styles["domainsMain"]}>
      <section className={styles["headerSection"]}>
        <div className={styles["progressTrack"]}>
          <div className={styles["progressFill"]} />
        </div>
        <div className={styles["titleRow"]}>
          <h1 className={styles["title"]}>{t("title")}</h1>
          <article className={styles["subtitleArticle"]}>
            <RichText
              sectionKey='Domains'
              textKey='subtitle'
            />
          </article>
        </div>
      </section>

      <section className={styles["cardsSection"]}>
        {/* Service Card for IMS. */}
        <section className={styles["serviceCard"]}>
          <article className={styles["imageContainer"]}>
            <Image
              alt={t("services.invoices.card.imageAlt")}
              className={styles["cardImage"]}
              src='/images/domains/invoice-management-system.png'
              width='600'
              height='400'
            />
          </article>
          <article>
            <h2 className={styles["cardTitle"]}>{t("services.invoices.card.title")}</h2>
            <p className={styles["cardDescription"]}>{t("services.invoices.card.description")}</p>
            <Link
              href='/domains/invoices'
              className={styles["ctaLink"]}>
              {t("services.callToAction")}
              <svg
                fill='none'
                stroke='currentColor'
                strokeLinecap='round'
                strokeLinejoin='round'
                strokeWidth='2'
                className={styles["ctaIcon"]}
                viewBox='0 0 24 24'>
                <path d='M5 12h14M12 5l7 7-7 7' />
              </svg>
            </Link>
          </article>
        </section>
      </section>
    </main>
  );
}
