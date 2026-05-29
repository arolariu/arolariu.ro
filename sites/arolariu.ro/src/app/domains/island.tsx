"use client";

/**
 * @fileoverview Client island for the Domains overview page.
 * @module app/domains/island
 *
 * @remarks
 * Renders the interactive Domains landing page content, including localized
 * copy and service cards with client-side navigation.
 */

import {RichText} from "@/presentation/Text";
import {useTranslations} from "next-intl-selector";
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
  const t = useTranslations();

  return (
    <section className={styles["domainsMain"]}>
      <section className={styles["headerSection"]}>
        <div className={styles["progressTrack"]}>
          <div className={styles["progressFill"]} />
        </div>
        <div className={styles["titleRow"]}>
          <h1 className={styles["title"]}>{t((m) => m.pages.domains.title)}</h1>
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
              alt={t((m) => m.pages.domains.services.invoices.card.imageAlt)}
              className={styles["cardImage"]}
              src='/images/domains/invoice-management-system.png'
              width='600'
              height='400'
            />
          </article>
          <article>
            <h2 className={styles["cardTitle"]}>{t((m) => m.pages.domains.services.invoices.card.title)}</h2>
            <p className={styles["cardDescription"]}>{t((m) => m.pages.domains.services.invoices.card.description)}</p>
            <Link
              href='/domains/invoices'
              className={styles["ctaLink"]}>
              {t((m) => m.pages.domains.services.callToAction)}
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
    </section>
  );
}
