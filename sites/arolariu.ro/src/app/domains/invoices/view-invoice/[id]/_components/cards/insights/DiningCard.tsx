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
  const sodiumLevel = totalAmount > 50 ? "High" : totalAmount > 30 ? "Medium" : "Low";

  // Mock historical data
  const fastFoodFrequency = 3;
  const avgSpend = 45.0;
  const favoritePlace = "McDonald's";
  const visits = 8;

  const spendDiff = ((totalAmount - avgSpend) / avgSpend) * 100;

  // Healthier swaps
  const swaps = [
    {swap: "Grilled instead of fried", calSaved: 200},
    {swap: "Water instead of soda", calSaved: 150, moneySaved: 8},
    {swap: "Side salad instead of fries", calSaved: 280},
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
        <div className='space-y-2'>
          <h4 className='text-muted-foreground text-sm font-medium'>Estimated Nutrition</h4>
          <div className='grid grid-cols-2 gap-2'>
            <div className='flex items-center gap-2 rounded-lg border p-2'>
              <TbFlame className='h-4 w-4 text-orange-500' />
              <div>
                <p className='text-muted-foreground text-xs'>Calories</p>
                <p className='text-sm font-semibold'>~{estimatedCalories} kcal</p>
              </div>
            </div>
            <div className='flex items-center gap-2 rounded-lg border p-2'>
              <TbMeat className='h-4 w-4 text-red-500' />
              <div>
                <p className='text-muted-foreground text-xs'>Protein</p>
                <p className='text-sm font-semibold'>~{estimatedProtein}g</p>
              </div>
            </div>
            <div className='flex items-center gap-2 rounded-lg border p-2'>
              <TbAlertTriangle className={`h-4 w-4 ${sodiumLevel === "High" ? "text-red-500" : "text-yellow-500"}`} />
              <div>
                <p className='text-muted-foreground text-xs'>Sodium</p>
                <p className='flex items-center gap-1 text-sm font-semibold'>
                  {sodiumLevel}
                  {sodiumLevel === "High" && <span className='text-red-500'>!</span>}
                </p>
              </div>
            </div>
            <div className='flex items-center gap-2 rounded-lg border p-2'>
              <TbCookie className='h-4 w-4 text-amber-500' />
              <div>
                <p className='text-muted-foreground text-xs'>Carbs</p>
                <p className='text-sm font-semibold'>~{estimatedCarbs}g</p>
              </div>
            </div>
          </div>
        </div>

        {/* Fast Food Habits */}
        <div className='space-y-2'>
          <h4 className='text-muted-foreground text-sm font-medium'>Your Fast Food Habits</h4>
          <div className='grid grid-cols-3 gap-2'>
            <div className='bg-card rounded-lg border p-3 text-center'>
              <TbCalendar className='mx-auto mb-1 h-4 w-4 text-blue-500' />
              <p className='text-muted-foreground text-xs'>Frequency</p>
              <p className='text-sm font-semibold'>{fastFoodFrequency}x/month</p>
              <p className='text-muted-foreground text-xs'>+1 vs avg</p>
            </div>
            <div className='bg-card rounded-lg border p-3 text-center'>
              <TbUserDollar className='mx-auto mb-1 h-4 w-4 text-green-500' />
              <p className='text-muted-foreground text-xs'>Avg Spend</p>
              <p className='text-sm font-semibold'>{formatCurrency(avgSpend, {currencyCode: currency.code, locale})}</p>
              <p className={`text-xs ${spendDiff > 0 ? "text-red-500" : "text-green-500"}`}>
                {spendDiff > 0 ? "+" : ""}
                {spendDiff.toFixed(0)}%
              </p>
            </div>
            <div className='bg-card rounded-lg border p-3 text-center'>
              <TbMapPin className='mx-auto mb-1 h-4 w-4 text-red-500' />
              <p className='text-muted-foreground text-xs'>Favorite</p>
              <p className='truncate text-sm font-semibold'>{favoritePlace}</p>
              <p className='text-muted-foreground text-xs'>{visits} visits</p>
            </div>
          </div>
        </div>

        {/* Healthier Swaps */}
        <div className='space-y-2'>
          <div className='flex items-center gap-2'>
            <TbBulb className='h-4 w-4 text-amber-500' />
            <h4 className='text-sm font-medium'>Healthier Swaps</h4>
          </div>
          <ul className='space-y-1.5'>
            {swaps.map((s, i) => (
              <li
                key={i}
                className='text-muted-foreground flex items-start gap-2 text-sm'>
                <span className='text-muted-foreground'>•</span>
                <span>
                  {s.swap}: <span className='font-medium text-green-600'>-{s.calSaved} cal</span>
                  {s.moneySaved && (
                    <span className='font-medium text-green-600'>
                      , saves {formatCurrency(s.moneySaved, {currencyCode: currency.code, locale})}
                    </span>
                  )}
                </span>
              </li>
            ))}
          </ul>
        </div>

        {/* Challenge */}
        <div className='flex items-start gap-3 rounded-lg border border-purple-200 bg-gradient-to-r from-purple-500/10 to-pink-500/10 p-3 dark:border-purple-800'>
          <TbTarget className='mt-0.5 h-5 w-5 shrink-0 text-purple-500' />
          <div>
            <p className='text-sm font-medium'>Weekly Challenge</p>
            <p className='text-muted-foreground text-sm'>
              Skip fast food for 7 days and save{" "}
              <span className='font-semibold text-purple-600'>
                {formatCurrency(challengeSavings, {currencyCode: currency.code, locale})}
              </span>
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
