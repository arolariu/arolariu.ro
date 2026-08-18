"use client";

/**
 * @fileoverview Merchant spending grouped by canonical NACE 2.1 sections.
 * @module app/domains/invoices/view-invoices/_components/views/statistics/MerchantNaceChart
 */

import {formatAmount} from "@/lib/utils.generic";
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from "@arolariu/components";
import {useTranslations} from "next-intl-selector";
import type {MerchantNaceAggregate} from "../../../_utils/statistics";
import styles from "./MerchantNaceChart.module.scss";

type Props = Readonly<{
  /** Canonical NACE section aggregates sorted by spending. */
  data: readonly MerchantNaceAggregate[];
  /** Currency code for the normalized spend values. */
  currency: string;
}>;

/** Renders NACE section/root grouping without assigning unclassified merchants to an inferred sector. */
export function MerchantNaceChart({data, currency}: Props): React.JSX.Element {
  const t = useTranslations();
  return (
    <Card className={styles["card"]}>
      <CardHeader>
        <CardTitle>{t((m) => m.cards.invoices.statistics.merchantLeaderboard.merchantNace.title)}</CardTitle>
        <CardDescription>{t((m) => m.cards.invoices.statistics.merchantLeaderboard.merchantNace.description)}</CardDescription>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <p className={styles["empty"]}>{t((m) => m.cards.invoices.statistics.merchantLeaderboard.merchantNace.empty)}</p>
        ) : (
          <ul className={styles["list"]}>
            {data.map((section) => (
              <li
                key={section.naceKey}
                className={styles["row"]}>
                <div>
                  <p className={styles["label"]}>
                    {section.sectionLabel} ({section.sectionCode})
                  </p>
                  <p className={styles["meta"]}>
                    {t((m) => m.cards.invoices.statistics.merchantLeaderboard.merchantNace.metadata, {
                      invoices: String(section.invoiceCount),
                      merchants: String(section.merchantCount),
                    })}
                  </p>
                </div>
                <span className={styles["amount"]}>
                  {formatAmount(section.totalSpend)} {currency}
                </span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
