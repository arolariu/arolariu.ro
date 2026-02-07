"use client";

import {formatCurrency} from "@/lib/utils.generic";
import {Card, CardContent, CardHeader, CardTitle} from "@arolariu/components";
import {useLocale} from "next-intl";
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
    if (totalAmount > 50) return "High";
    if (totalAmount > 30) return "Medium";
    return "Low";
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
    {id: "grilled", swap: "Grilled instead of fried", calSaved: 200},
    {id: "water", swap: "Water instead of soda", calSaved: 150, moneySaved: 8},
    {id: "salad", swap: "Side salad instead of fries", calSaved: 280},
  ];

  // Challenge
  const challengeSavings = avgSpend * 2;

  return (
    <Card>
      <CardHeader className='pb-3'>
        <CardTitle className='flex items-center gap-2 text-lg'>
          <TbToolsKitchen className='h-5 w-5 text-orange-500' />
          Dining Insights
        </CardTitle>
      </CardHeader>
      <CardContent className='space-y-5'>
        {/* Estimated Nutrition */}
        <main>
          <h4 className={styles["sectionTitle"]}>Estimated Nutrition</h4>
          <main className={styles["nutritionGrid"]}>
            <main className={styles["nutritionItem"]}>
              <TbFlame className='h-4 w-4 text-orange-500' />
              <main>
                <p className={styles["nutritionLabel"]}>Calories</p>
                <p className={styles["nutritionValue"]}>~{estimatedCalories} kcal</p>
              </main>
            </main>
            <main className={styles["nutritionItem"]}>
              <TbMeat className='h-4 w-4 text-red-500' />
              <main>
                <p className={styles["nutritionLabel"]}>Protein</p>
                <p className={styles["nutritionValue"]}>~{estimatedProtein}g</p>
              </main>
            </main>
            <main className={styles["nutritionItem"]}>
              <TbAlertTriangle className={`h-4 w-4 ${sodiumLevel === "High" ? "text-red-500" : "text-yellow-500"}`} />
              <main>
                <p className={styles["nutritionLabel"]}>Sodium</p>
                <p className={styles["nutritionValue"]}>
                  {sodiumLevel}
                  {sodiumLevel === "High" && <span className={styles["sodiumWarning"]}>!</span>}
                </p>
              </main>
            </main>
            <main className={styles["nutritionItem"]}>
              <TbCookie className='h-4 w-4 text-amber-500' />
              <main>
                <p className={styles["nutritionLabel"]}>Carbs</p>
                <p className={styles["nutritionValue"]}>~{estimatedCarbs}g</p>
              </main>
            </main>
          </main>
        </main>

        {/* Fast Food Habits */}
        <main>
          <h4 className={styles["sectionTitle"]}>Your Fast Food Habits</h4>
          <main className={styles["habitsGrid"]}>
            <main className={styles["habitCard"]}>
              <TbCalendar className='mx-auto mb-1 h-4 w-4 text-blue-500' />
              <p className={styles["habitLabel"]}>Frequency</p>
              <p className={styles["habitValue"]}>{fastFoodFrequency}x/month</p>
              <p className={styles["habitSub"]}>+1 vs avg</p>
            </main>
            <main className={styles["habitCard"]}>
              <TbUserDollar className='mx-auto mb-1 h-4 w-4 text-green-500' />
              <p className={styles["habitLabel"]}>Avg Spend</p>
              <p className={styles["habitValue"]}>{formatCurrency(avgSpend, {currencyCode: currency.code, locale})}</p>
              <p className={`${styles["habitSub"]} ${spendDiff > 0 ? styles["spendDiffRed"] : styles["spendDiffGreen"]}`}>
                {spendDiff > 0 ? "+" : ""}
                {spendDiff.toFixed(0)}%
              </p>
            </main>
            <main className={styles["habitCard"]}>
              <TbMapPin className='mx-auto mb-1 h-4 w-4 text-red-500' />
              <p className={styles["habitLabel"]}>Favorite</p>
              <p className={styles["habitValue"]}>{favoritePlace}</p>
              <p className={styles["habitSub"]}>{visits} visits</p>
            </main>
          </main>
        </main>

        {/* Healthier Swaps */}
        <main>
          <main className={styles["swapsHeader"]}>
            <TbBulb className='h-4 w-4 text-amber-500' />
            <h4 className={styles["swapsTitle"]}>Healthier Swaps</h4>
          </main>
          <ul className={styles["swapsList"]}>
            {swaps.map((s) => (
              <li
                key={s.id}
                className={styles["swapItem"]}>
                <span className={styles["swapBullet"]}>•</span>
                <span>
                  {s.swap}: <span className={styles["swapSaving"]}>-{s.calSaved} cal</span>
                  {s.moneySaved ? (
                    <span className={styles["swapSaving"]}>
                      , saves {formatCurrency(s.moneySaved, {currencyCode: currency.code, locale})}
                    </span>
                  ) : null}
                </span>
              </li>
            ))}
          </ul>
        </main>

        {/* Challenge */}
        <main className={styles["challengeBox"]}>
          <TbTarget className='mt-0.5 h-5 w-5 shrink-0 text-purple-500' />
          <main>
            <p className={styles["challengeTitle"]}>Weekly Challenge</p>
            <p className={styles["challengeDescription"]}>
              Skip fast food for 7 days and save{" "}
              <span className={styles["challengeHighlight"]}>
                {formatCurrency(challengeSavings, {currencyCode: currency.code, locale})}
              </span>
            </p>
          </main>
        </main>
      </CardContent>
    </Card>
  );
}
