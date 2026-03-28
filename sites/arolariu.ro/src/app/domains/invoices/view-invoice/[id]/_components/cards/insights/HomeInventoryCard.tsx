"use client";

import {formatCurrency} from "@/lib/utils.generic";
import {ProductCategory} from "@/types/invoices";
import {Card, CardContent, CardHeader, CardTitle} from "@arolariu/components";
import {useLocale, useTranslations} from "next-intl";
import {TbDroplets, TbHome, TbLeaf, TbPackage, TbSparkles, TbSpray, TbStar, TbToiletPaper} from "react-icons/tb";
import {useInvoiceContext} from "../../../_context/InvoiceContext";
import styles from "./HomeInventoryCard.module.scss";

type SupplyItem = {
  id: string;
  name: string;
  icon: React.ReactNode;
  daysRemaining: number;
  maxDays: number;
};

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
  const t = useTranslations("Invoices.ViewInvoice.homeInventoryCard");
  const {invoice} = useInvoiceContext();
  const {items, paymentInformation} = invoice;
  const {currency} = paymentInformation;

  // Get cleaning supplies from invoice
  const cleaningItems = items.filter((i) => i.category === ProductCategory.CLEANING_SUPPLIES);

  // Estimate supply levels based on typical usage
  const supplies: SupplyItem[] = [];
  cleaningItems.forEach((item) => {
    const name = item.genericName.toLowerCase();
    let daysRemaining = 30;
    let icon = (
      <TbSpray
        key='spray-can'
        className={styles["iconBlue"]}
      />
    );

    if (name.includes("detergent") || name.includes("laundry")) {
      daysRemaining = 45;
      icon = (
        <TbDroplets
          key='droplets'
          className={styles["iconBlue"]}
        />
      );
      supplies.push({id: `laundry-${item.productCode}`, name: t("supplyNames.laundryDetergent"), icon, daysRemaining, maxDays: 60});
    } else if (name.includes("dish") || name.includes("soap")) {
      daysRemaining = 18;
      icon = (
        <TbSparkles
          key='sparkles'
          className={styles["iconCyan"]}
        />
      );
      supplies.push({id: `dish-${item.productCode}`, name: t("supplyNames.dishSoap"), icon, daysRemaining, maxDays: 30});
    } else if (name.includes("paper") || name.includes("towel") || name.includes("tissue")) {
      // daysRemaining stays at default 30
      icon = (
        <TbToiletPaper
          key='toilet'
          className={styles["iconGray"]}
        />
      );
      supplies.push({id: `paper-${item.productCode}`, name: t("supplyNames.paperProducts"), icon, daysRemaining, maxDays: 45});
    } else if (name.includes("floor") || name.includes("cleaner")) {
      daysRemaining = 60;
      icon = (
        <TbSpray
          key='floor-cleaner-spray-can'
          className={styles["iconGreen"]}
        />
      );
      supplies.push({id: `floor-${item.productCode}`, name: t("supplyNames.floorCleaner"), icon, daysRemaining, maxDays: 90});
    } else {
      supplies.push({id: `generic-${item.productCode}`, name: item.genericName, icon, daysRemaining, maxDays: 45});
    }
  });

  // Default supplies if none found
  if (supplies.length === 0) {
    supplies.push(
      {
        id: "default-laundry",
        name: t("supplyNames.laundryDetergent"),
        icon: (
          <TbDroplets
            key='default-droplets'
            className={styles["iconBlue"]}
          />
        ),
        daysRemaining: 45,
        maxDays: 60,
      },
      {
        id: "default-dish",
        name: t("supplyNames.dishSoap"),
        icon: (
          <TbSparkles
            key='default-sparkles'
            className={styles["iconCyan"]}
          />
        ),
        daysRemaining: 18,
        maxDays: 30,
      },
    );
  }

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
            {t("title")}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className={styles["contentSpaced"]}>
        {/* Supply Stock Levels */}
        <div>
          <h4 className={styles["sectionTitle"]}>{t("stockLevels.title")}</h4>
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
                    <span className={styles["supplyDays"]}>{t("stockLevels.daysRemaining", {count: String(supply.daysRemaining)})}</span>
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

        {/* Eco-Friendliness Score */}
        <div className={styles["ecoSection"]}>
          <div className={styles["ecoHeader"]}>
            <div className={styles["ecoLabel"]}>
              <TbLeaf className={styles["leafIcon"]} />
              <span className={styles["ecoLabelText"]}>{t("eco.title")}</span>
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
              {t("eco.productsWithEcoLabels", {count: String(ecoProducts)})}
            </li>
            <li className={styles["ecoItem"]}>
              <span className={styles["ecoBullet"]}>•</span>
              {t("eco.recyclablePackaging", {count: String(recyclablePackaging)})}
            </li>
            <li className={styles["ecoItem"]}>
              <span className={styles["ecoTipBullet"]}>•</span>
              <span className={styles["ecoTipText"]}>{t("eco.tip")}</span>
            </li>
          </ul>
        </div>

        {/* Bulk Buying Savings */}
        <div className={styles["bulkBox"]}>
          <TbPackage className={styles["packageIcon"]} />
          <div>
            <p className={styles["bulkTitle"]}>{t("bulk.title")}</p>
            <p className={styles["bulkDescription"]}>
              {t("bulk.description", {
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
