"use client";

import {formatCurrency} from "@/lib/utils.generic";
import {ClassificationSystem, type StandardClassification} from "@/types/invoices";
import {Card, CardContent, CardHeader, CardTitle} from "@arolariu/components";
import {useLocale} from "next-intl";
import {useTranslations} from "next-intl-selector";
import {TbHome, TbLeaf, TbPackage, TbSpray, TbStar} from "react-icons/tb";
import {useInvoiceContext} from "../../../_context/InvoiceContext";
import styles from "./HomeInventoryCard.module.scss";

type SupplyItem = {
  id: string;
  name: string;
  icon: React.ReactNode;
  daysRemaining: number;
  maxDays: number;
};

/** GS1 GPC segment for cleaning and hygiene products. */
const GS1_CLEANING_HYGIENE_SEGMENT_CODE = "47000000";

/**
 * Determines whether a product has explicit GS1 cleaning/hygiene taxonomy evidence.
 *
 * @param classification - The product classification to inspect.
 * @returns `true` only when the GS1 hierarchy contains the cleaning/hygiene segment.
 */
export function isGs1CleaningOrHygieneClassification(classification: StandardClassification | null): boolean {
  return (
    classification?.system === ClassificationSystem.Gs1Gpc
    && classification.hierarchy.some((node) => node.level === "segment" && node.code === GS1_CLEANING_HYGIENE_SEGMENT_CODE)
  );
}

/**
 * Get the progress bar color class based on percentage remaining.
 */
function getSupplyProgressColor(percentage: number, moduleStyles: Record<string, string>): string {
  if (percentage > 60) return moduleStyles["progressGreen"] ?? "";
  if (percentage > 30) return moduleStyles["progressYellow"] ?? "";
  return moduleStyles["progressRed"] ?? "";
}

export function HomeInventoryCard(): React.JSX.Element {
  const locale = useLocale();
  const t = useTranslations();
  const {invoice} = useInvoiceContext();
  const {items, paymentInformation} = invoice;
  const {currency} = paymentInformation;

  const supplies: SupplyItem[] = items
    .filter((item) => isGs1CleaningOrHygieneClassification(item.classification))
    .map((item) => ({
      id: `cleaning-${item.productCode}`,
      name: item.name,
      icon: (
        <TbSpray
          key={`spray-${item.productCode}`}
          className={styles["iconBlue"]}
        />
      ),
      daysRemaining: 30,
      maxDays: 45,
    }));

  // Eco-friendliness score (mock)
  const ecoScore = 3;
  const ecoProducts = 2;
  const recyclablePackaging = 1;

  // Bulk savings calculation
  const potentialSavings = 120;

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <span className={styles["titleRow"]}>
            <TbHome className={styles["titleIcon"]} />
            {t((m) => m.cards.invoices.homeInventoryCard.title)}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className={styles["contentSpaced"]}>
          {supplies.length > 0 ? (
            <div>
              <h4 className={styles["sectionTitle"]}>{t((m) => m.cards.invoices.homeInventoryCard.stockLevels.title)}</h4>
              <div className={styles["suppliesList"]}>
                {supplies.map((supply) => {
                  const pct = (supply.daysRemaining / supply.maxDays) * 100;
                  const color = getSupplyProgressColor(pct, styles);
                  return (
                    <div
                      key={supply.id}
                      className={styles["supplyItem"]}>
                      <div className={styles["supplyRow"]}>
                        <div className={styles["supplyName"]}>
                          {supply.icon}
                          <span>{supply.name}</span>
                        </div>
                        <span className={styles["supplyDays"]}>
                          {t((m) => m.cards.invoices.homeInventoryCard.stockLevels.daysRemaining, {
                            count: String(supply.daysRemaining),
                          })}
                        </span>
                      </div>
                      <div className={styles["progressTrack"]}>
                        <div
                          className={`${styles["progressBar"]} ${color}`}
                          style={{width: `${pct}%`}}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : null}

          {/* Eco-Friendliness Score */}
          <div className={styles["ecoSection"]}>
            <div className={styles["ecoHeader"]}>
              <div className={styles["ecoLabel"]}>
                <TbLeaf className={styles["leafIcon"]} />
                <span className={styles["ecoLabelText"]}>{t((m) => m.cards.invoices.homeInventoryCard.eco.title)}</span>
              </div>
              <div className={styles["ecoStars"]}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <TbStar
                    key={star}
                    className={star <= ecoScore ? styles["starActive"] : styles["starInactive"]}
                  />
                ))}
              </div>
            </div>
            <ul className={styles["ecoList"]}>
              <li className={styles["ecoItem"]}>
                <span className={styles["ecoBullet"]}>•</span>
                {t((m) => m.cards.invoices.homeInventoryCard.eco.productsWithEcoLabels, {count: String(ecoProducts)})}
              </li>
              <li className={styles["ecoItem"]}>
                <span className={styles["ecoBullet"]}>•</span>
                {t((m) => m.cards.invoices.homeInventoryCard.eco.recyclablePackaging, {count: String(recyclablePackaging)})}
              </li>
              <li className={styles["ecoItem"]}>
                <span className={styles["ecoTipBullet"]}>•</span>
                <span className={styles["ecoTipText"]}>{t((m) => m.cards.invoices.homeInventoryCard.eco.tip)}</span>
              </li>
            </ul>
          </div>

          {/* Bulk Buying Savings */}
          <div className={styles["bulkBox"]}>
            <TbPackage className={styles["packageIcon"]} />
            <div>
              <p className={styles["bulkTitle"]}>{t((m) => m.cards.invoices.homeInventoryCard.bulk.title)}</p>
              <p className={styles["bulkDescription"]}>
                {t((m) => m.cards.invoices.homeInventoryCard.bulk.description, {
                  amount: formatCurrency(potentialSavings, {currencyCode: currency.code, locale}),
                })}
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
