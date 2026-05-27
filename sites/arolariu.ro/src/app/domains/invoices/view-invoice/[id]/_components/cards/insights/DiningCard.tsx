"use client";

import {formatCurrency} from "@/lib/utils.generic";
import {Card, CardContent, CardHeader, CardTitle} from "@arolariu/components";
import {useLocale} from "next-intl";
import {useTranslations} from "next-intl-selector";
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
  const t = useTranslations();
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
    if (totalAmount > 50) return t((m) => m.cards.invoices.diningCard.sodium.high);
    if (totalAmount > 30) return t((m) => m.cards.invoices.diningCard.sodium.medium);
    return t((m) => m.cards.invoices.diningCard.sodium.low);
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
    {id: "grilled", swap: t((m) => m.cards.invoices.diningCard.swaps.grilled), calSaved: 200},
    {id: "water", swap: t((m) => m.cards.invoices.diningCard.swaps.water), calSaved: 150, moneySaved: 8},
    {id: "salad", swap: t((m) => m.cards.invoices.diningCard.swaps.salad), calSaved: 280},
  ];

  // Challenge
  const challengeSavings = avgSpend * 2;

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <span className={styles["titleRow"]}>
            <TbToolsKitchen className={styles["titleIcon"]} />
            {t((m) => m.cards.invoices.diningCard.title)}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className={styles["contentSpaced"]}>
          {/* Estimated Nutrition */}
          <div>
            <h4 className={styles["sectionTitle"]}>{t((m) => m.cards.invoices.diningCard.estimatedNutrition.title)}</h4>
            <div className={styles["nutritionGrid"]}>
              <div className={styles["nutritionItem"]}>
                <TbFlame className={styles["iconOrange"]} />
                <div>
                  <p className={styles["nutritionLabel"]}>{t((m) => m.cards.invoices.diningCard.estimatedNutrition.calories)}</p>
                  <p className={styles["nutritionValue"]}>{t((m) => m.cards.invoices.diningCard.estimatedNutrition.caloriesValue, {value: String(estimatedCalories)})}</p>
                </div>
              </div>
              <div className={styles["nutritionItem"]}>
                <TbMeat className={styles["iconRed"]} />
                <div>
                  <p className={styles["nutritionLabel"]}>{t((m) => m.cards.invoices.diningCard.estimatedNutrition.protein)}</p>
                  <p className={styles["nutritionValue"]}>{t((m) => m.cards.invoices.diningCard.estimatedNutrition.proteinValue, {value: String(estimatedProtein)})}</p>
                </div>
              </div>
              <div className={styles["nutritionItem"]}>
                <TbAlertTriangle className={sodiumLevel === t((m) => m.cards.invoices.diningCard.sodium.high) ? styles["iconRed"] : styles["iconAmber"]} />
                <div>
                  <p className={styles["nutritionLabel"]}>{t((m) => m.cards.invoices.diningCard.estimatedNutrition.sodium)}</p>
                  <p className={styles["nutritionValue"]}>
                    {sodiumLevel}
                    {sodiumLevel === t((m) => m.cards.invoices.diningCard.sodium.high) && <span className={styles["sodiumWarning"]}>!</span>}
                  </p>
                </div>
              </div>
              <div className={styles["nutritionItem"]}>
                <TbCookie className={styles["iconAmber"]} />
                <div>
                  <p className={styles["nutritionLabel"]}>{t((m) => m.cards.invoices.diningCard.estimatedNutrition.carbs)}</p>
                  <p className={styles["nutritionValue"]}>{t((m) => m.cards.invoices.diningCard.estimatedNutrition.carbsValue, {value: String(estimatedCarbs)})}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Fast Food Habits */}
          <div>
            <h4 className={styles["sectionTitle"]}>{t((m) => m.cards.invoices.diningCard.habits.title)}</h4>
            <div className={styles["habitsGrid"]}>
              <div className={styles["habitCard"]}>
                <TbCalendar className={`${styles["habitIconWrapper"]} ${styles["iconBlue"]}`} />
                <p className={styles["habitLabel"]}>{t((m) => m.cards.invoices.diningCard.habits.frequency)}</p>
                <p className={styles["habitValue"]}>{t((m) => m.cards.invoices.diningCard.habits.frequencyValue, {count: String(fastFoodFrequency)})}</p>
                <p className={styles["habitSub"]}>{t((m) => m.cards.invoices.diningCard.habits.frequencyDiff)}</p>
              </div>
              <div className={styles["habitCard"]}>
                <TbUserDollar className={`${styles["habitIconWrapper"]} ${styles["iconGreen"]}`} />
                <p className={styles["habitLabel"]}>{t((m) => m.cards.invoices.diningCard.habits.avgSpend)}</p>
                <p className={styles["habitValue"]}>{formatCurrency(avgSpend, {currencyCode: currency.code, locale})}</p>
                <p className={`${styles["habitSub"]} ${spendDiff > 0 ? styles["spendDiffRed"] : styles["spendDiffGreen"]}`}>
                  {spendDiff > 0 ? "+" : ""}
                  {spendDiff.toFixed(0)}%
                </p>
              </div>
              <div className={styles["habitCard"]}>
                <TbMapPin className={`${styles["habitIconWrapper"]} ${styles["iconRed"]}`} />
                <p className={styles["habitLabel"]}>{t((m) => m.cards.invoices.diningCard.habits.favorite)}</p>
                <p className={styles["habitValue"]}>{favoritePlace}</p>
                <p className={styles["habitSub"]}>{t((m) => m.cards.invoices.diningCard.habits.visits, {count: String(visits)})}</p>
              </div>
            </div>
          </div>

          {/* Healthier Swaps */}
          <div>
            <div className={styles["swapsHeader"]}>
              <TbBulb className={styles["iconAmber"]} />
              <h4 className={styles["swapsTitle"]}>{t((m) => m.cards.invoices.diningCard.swaps.title)}</h4>
            </div>
            <ul className={styles["swapsList"]}>
              {swaps.map((s) => (
                <li
                  key={s.id}
                  className={styles["swapItem"]}>
                  <span className={styles["swapBullet"]}>•</span>
                  <span>
                    {s.swap}: <span className={styles["swapSaving"]}>{t((m) => m.cards.invoices.diningCard.swaps.caloriesSaved, {count: String(s.calSaved)})}</span>
                    {s.moneySaved ? (
                      <span className={styles["swapSaving"]}>
                        {t((m) => m.cards.invoices.diningCard.swaps.moneySaved, {amount: formatCurrency(s.moneySaved, {currencyCode: currency.code, locale})})}
                      </span>
                    ) : null}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          {/* Challenge */}
          <div className={styles["challengeBox"]}>
            <TbTarget className={styles["challengeIcon"]} />
            <div>
              <p className={styles["challengeTitle"]}>{t((m) => m.cards.invoices.diningCard.challenge.title)}</p>
              <p className={styles["challengeDescription"]}>
                {t((m) => m.cards.invoices.diningCard.challenge.descriptionPrefix)}{" "}
                <span className={styles["challengeHighlight"]}>
                  {formatCurrency(challengeSavings, {currencyCode: currency.code, locale})}
                </span>
                {t((m) => m.cards.invoices.diningCard.challenge.descriptionSuffix)}
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
