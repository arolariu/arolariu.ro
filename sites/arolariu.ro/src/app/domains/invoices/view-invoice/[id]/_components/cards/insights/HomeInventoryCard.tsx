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
        className='h-4 w-4 text-blue-500'
      />
    );

    if (name.includes("detergent") || name.includes("laundry")) {
      daysRemaining = 45;
      icon = (
        <TbDroplets
          key='droplets'
          className='h-4 w-4 text-blue-500'
        />
      );
      supplies.push({id: `laundry-${item.productCode}`, name: t("supplyNames.laundryDetergent"), icon, daysRemaining, maxDays: 60});
    } else if (name.includes("dish") || name.includes("soap")) {
      daysRemaining = 18;
      icon = (
        <TbSparkles
          key='sparkles'
          className='h-4 w-4 text-cyan-500'
        />
      );
      supplies.push({id: `dish-${item.productCode}`, name: t("supplyNames.dishSoap"), icon, daysRemaining, maxDays: 30});
    } else if (name.includes("paper") || name.includes("towel") || name.includes("tissue")) {
      // daysRemaining stays at default 30
      icon = (
        <TbToiletPaper
          key='toilet'
          className='h-4 w-4 text-gray-500'
        />
      );
      supplies.push({id: `paper-${item.productCode}`, name: t("supplyNames.paperProducts"), icon, daysRemaining, maxDays: 45});
    } else if (name.includes("floor") || name.includes("cleaner")) {
      daysRemaining = 60;
      icon = (
        <TbSpray
          key='floor-cleaner-spray-can'
          className='h-4 w-4 text-green-500'
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
            className='h-4 w-4 text-blue-500'
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
            className='h-4 w-4 text-cyan-500'
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
      <CardHeader className='pb-3'>
        <CardTitle className='flex items-center gap-2 text-lg'>
          <TbHome className='h-5 w-5 text-emerald-600' />
          {t("title")}
        </CardTitle>
      </CardHeader>
      <CardContent className='space-y-5'>
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
              <TbLeaf className='h-4 w-4 text-green-500' />
              <span className={styles["ecoLabelText"]}>{t("eco.title")}</span>
            </div>
            <div className={styles["ecoStars"]}>
              {[1, 2, 3, 4, 5].map((star) => (
                <TbStar
                  key={star}
                  className={`h-4 w-4 ${star <= ecoScore ? "fill-green-500 text-green-500" : "text-muted-foreground"}`}
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
          <TbPackage className='mt-0.5 h-4 w-4 shrink-0 text-blue-500' />
          <div>
            <p className={styles["bulkTitle"]}>{t("bulk.title")}</p>
            <p className={styles["bulkDescription"]}>
              {t("bulk.description", {
                amount: formatCurrency(potentialSavings, {currencyCode: currency.code, locale}),
              })}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
