"use client";

import {formatCurrency} from "@/lib/utils.generic";
import {Card, CardContent, CardHeader, CardTitle} from "@arolariu/components";
import {useLocale, useTranslations} from "next-intl";
import {
  TbAlertTriangle,
  TbBulb,
  TbCalendar,
  TbCookie,
  TbFlame,
  TbMapPin,
  TbMeat,
  TbTarget,
  TbToolsKitchen,
  TbUserDollar,
} from "react-icons/tb";
import {useInvoiceContext} from "../../../_context/InvoiceContext";
import styles from "./DiningCard.module.scss";

export function DiningCard(): React.JSX.Element {
  const locale = useLocale();
  const t = useTranslations("Invoices.ViewInvoice.diningCard");
  const {invoice} = useInvoiceContext();
  const {paymentInformation, items} = invoice;
  const {currency, totalCostAmount: totalAmount} = paymentInformation;

  // Estimate nutrition based on typical fast food values
  const itemCount = items.length;
  const estimatedCalories = Math.round(350 + itemCount * 280);
  const estimatedProtein = Math.round(12 + itemCount * 11);
  const estimatedCarbs = Math.round(45 + itemCount * 35);

  // Determine sodium level based on total amount spent
  const getSodiumLevel = (): string => {
    if (totalAmount > 50) return t("sodium.high");
    if (totalAmount > 30) return t("sodium.medium");
    return t("sodium.low");
  };
  const sodiumLevel = getSodiumLevel();

  // Mock historical data
  const fastFoodFrequency = 3;
  const avgSpend = 45;
  const favoritePlace = "McDonald's";
  const visits = 8;

  const spendDiff = ((totalAmount - avgSpend) / avgSpend) * 100;

  // Healthier swaps
  const swaps = [
    {id: "grilled", swap: t("swaps.grilled"), calSaved: 200},
    {id: "water", swap: t("swaps.water"), calSaved: 150, moneySaved: 8},
    {id: "salad", swap: t("swaps.salad"), calSaved: 280},
  ];

  // Challenge
  const challengeSavings = avgSpend * 2;

  return (
    <Card>
      <CardHeader className='pb-3'>
        <CardTitle className='flex items-center gap-2 text-lg'>
          <TbToolsKitchen className='h-5 w-5 text-orange-500' />
          {t("title")}
        </CardTitle>
      </CardHeader>
      <CardContent className='space-y-5'>
        {/* Estimated Nutrition */}
        <div>
          <h4 className={styles["sectionTitle"]}>{t("estimatedNutrition.title")}</h4>
          <div className={styles["nutritionGrid"]}>
            <div className={styles["nutritionItem"]}>
              <TbFlame className='h-4 w-4 text-orange-500' />
              <div>
                <p className={styles["nutritionLabel"]}>{t("estimatedNutrition.calories")}</p>
                <p className={styles["nutritionValue"]}>{t("estimatedNutrition.caloriesValue", {value: String(estimatedCalories)})}</p>
              </div>
            </div>
            <div className={styles["nutritionItem"]}>
              <TbMeat className='h-4 w-4 text-red-500' />
              <div>
                <p className={styles["nutritionLabel"]}>{t("estimatedNutrition.protein")}</p>
                <p className={styles["nutritionValue"]}>{t("estimatedNutrition.proteinValue", {value: String(estimatedProtein)})}</p>
              </div>
            </div>
            <div className={styles["nutritionItem"]}>
              <TbAlertTriangle className={`h-4 w-4 ${sodiumLevel === t("sodium.high") ? "text-red-500" : "text-yellow-500"}`} />
              <div>
                <p className={styles["nutritionLabel"]}>{t("estimatedNutrition.sodium")}</p>
                <p className={styles["nutritionValue"]}>
                  {sodiumLevel}
                  {sodiumLevel === t("sodium.high") && <span className={styles["sodiumWarning"]}>!</span>}
                </p>
              </div>
            </div>
            <div className={styles["nutritionItem"]}>
              <TbCookie className='h-4 w-4 text-amber-500' />
              <div>
                <p className={styles["nutritionLabel"]}>{t("estimatedNutrition.carbs")}</p>
                <p className={styles["nutritionValue"]}>{t("estimatedNutrition.carbsValue", {value: String(estimatedCarbs)})}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Fast Food Habits */}
        <div>
          <h4 className={styles["sectionTitle"]}>{t("habits.title")}</h4>
          <div className={styles["habitsGrid"]}>
            <div className={styles["habitCard"]}>
              <TbCalendar className='mx-auto mb-1 h-4 w-4 text-blue-500' />
              <p className={styles["habitLabel"]}>{t("habits.frequency")}</p>
              <p className={styles["habitValue"]}>{t("habits.frequencyValue", {count: String(fastFoodFrequency)})}</p>
              <p className={styles["habitSub"]}>{t("habits.frequencyDiff")}</p>
            </div>
            <div className={styles["habitCard"]}>
              <TbUserDollar className='mx-auto mb-1 h-4 w-4 text-green-500' />
              <p className={styles["habitLabel"]}>{t("habits.avgSpend")}</p>
              <p className={styles["habitValue"]}>{formatCurrency(avgSpend, {currencyCode: currency.code, locale})}</p>
              <p className={`${styles["habitSub"]} ${spendDiff > 0 ? styles["spendDiffRed"] : styles["spendDiffGreen"]}`}>
                {spendDiff > 0 ? "+" : ""}
                {spendDiff.toFixed(0)}%
              </p>
            </div>
            <div className={styles["habitCard"]}>
              <TbMapPin className='mx-auto mb-1 h-4 w-4 text-red-500' />
              <p className={styles["habitLabel"]}>{t("habits.favorite")}</p>
              <p className={styles["habitValue"]}>{favoritePlace}</p>
              <p className={styles["habitSub"]}>{t("habits.visits", {count: String(visits)})}</p>
            </div>
          </div>
        </div>

        {/* Healthier Swaps */}
        <div>
          <div className={styles["swapsHeader"]}>
            <TbBulb className='h-4 w-4 text-amber-500' />
            <h4 className={styles["swapsTitle"]}>{t("swaps.title")}</h4>
          </div>
          <ul className={styles["swapsList"]}>
            {swaps.map((s) => (
              <li
                key={s.id}
                className={styles["swapItem"]}>
                <span className={styles["swapBullet"]}>•</span>
                <span>
                  {s.swap}: <span className={styles["swapSaving"]}>{t("swaps.caloriesSaved", {count: String(s.calSaved)})}</span>
                  {s.moneySaved ? (
                    <span className={styles["swapSaving"]}>
                      {t("swaps.moneySaved", {amount: formatCurrency(s.moneySaved, {currencyCode: currency.code, locale})})}
                    </span>
                  ) : null}
                </span>
              </li>
            ))}
          </ul>
        </div>

        {/* Challenge */}
        <div className={styles["challengeBox"]}>
          <TbTarget className='mt-0.5 h-5 w-5 shrink-0 text-purple-500' />
          <div>
            <p className={styles["challengeTitle"]}>{t("challenge.title")}</p>
            <p className={styles["challengeDescription"]}>
              {t("challenge.descriptionPrefix")}{" "}
              <span className={styles["challengeHighlight"]}>
                {formatCurrency(challengeSavings, {currencyCode: currency.code, locale})}
              </span>
              {t("challenge.descriptionSuffix")}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
