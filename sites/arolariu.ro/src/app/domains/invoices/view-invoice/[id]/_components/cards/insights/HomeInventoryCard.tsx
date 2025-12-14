"use client";

import {formatCurrency} from "@/lib/utils.generic";
import {ProductCategory} from "@/types/invoices";
import {Card, CardContent, CardHeader, CardTitle} from "@arolariu/components";
import {useLocale} from "next-intl";
import {TbDroplets, TbHome, TbLeaf, TbPackage, TbSparkles, TbSpray, TbStar, TbToiletPaper} from "react-icons/tb";
import {useInvoiceContext} from "../../../_context/InvoiceContext";

type SupplyItem = {
  name: string;
  icon: React.ReactNode;
  daysRemaining: number;
  maxDays: number;
};

export function HomeInventoryCard(): React.JSX.Element {
  const locale = useLocale();
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
      supplies.push({name: "Laundry Detergent", icon, daysRemaining, maxDays: 60});
    } else if (name.includes("dish") || name.includes("soap")) {
      daysRemaining = 18;
      icon = (
        <TbSparkles
          key='sparkles'
          className='h-4 w-4 text-cyan-500'
        />
      );
      supplies.push({name: "Dish Soap", icon, daysRemaining, maxDays: 30});
    } else if (name.includes("paper") || name.includes("towel") || name.includes("tissue")) {
      daysRemaining = 30;
      icon = (
        <TbToiletPaper
          key='toilet'
          className='h-4 w-4 text-gray-500'
        />
      );
      supplies.push({name: "Paper Products", icon, daysRemaining, maxDays: 45});
    } else if (name.includes("floor") || name.includes("cleaner")) {
      daysRemaining = 60;
      icon = (
        <TbSpray
          key='floor-cleaner-spray-can'
          className='h-4 w-4 text-green-500'
        />
      );
      supplies.push({name: "Floor Cleaner", icon, daysRemaining, maxDays: 90});
    } else {
      supplies.push({name: item.genericName, icon, daysRemaining, maxDays: 45});
    }
  });

  // Default supplies if none found
  if (supplies.length === 0) {
    supplies.push(
      {
        name: "Laundry Detergent",
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
        name: "Dish Soap",
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
          Home Inventory & Supplies
        </CardTitle>
      </CardHeader>
      <CardContent className='space-y-5'>
        {/* Supply Stock Levels */}
        <div className='space-y-3'>
          <h4 className='text-muted-foreground text-sm font-medium'>Supply Stock Levels (estimated)</h4>
          <div className='space-y-3'>
            {supplies.map((supply, i) => {
              const pct = (supply.daysRemaining / supply.maxDays) * 100;
              const color = pct > 60 ? "bg-green-500" : pct > 30 ? "bg-yellow-500" : "bg-red-500";
              return (
                <div
                  key={i}
                  className='space-y-1'>
                  <div className='flex items-center justify-between text-sm'>
                    <div className='flex items-center gap-2'>
                      {supply.icon}
                      <span>{supply.name}</span>
                    </div>
                    <span className='text-muted-foreground'>~{supply.daysRemaining} days</span>
                  </div>
                  <div className='bg-muted h-2 overflow-hidden rounded-full'>
                    <div
                      className={`h-full ${color} transition-all`}
                      style={{width: `${pct}%`}}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Eco-Friendliness Score */}
        <div className='space-y-2'>
          <div className='flex items-center justify-between'>
            <div className='flex items-center gap-2'>
              <TbLeaf className='h-4 w-4 text-green-500' />
              <span className='text-sm font-medium'>Eco-Friendliness Score</span>
            </div>
            <div className='flex items-center gap-1'>
              {[1, 2, 3, 4, 5].map((star) => (
                <TbStar
                  key={star}
                  className={`h-4 w-4 ${star <= ecoScore ? "fill-green-500 text-green-500" : "text-muted-foreground"}`}
                />
              ))}
            </div>
          </div>
          <ul className='text-muted-foreground space-y-1 pl-6 text-sm'>
            <li className='flex items-center gap-2'>
              <span className='text-muted-foreground'>•</span>
              {ecoProducts} products with eco-labels
            </li>
            <li className='flex items-center gap-2'>
              <span className='text-muted-foreground'>•</span>
              {recyclablePackaging} product with recyclable packaging
            </li>
            <li className='flex items-center gap-2'>
              <span className='text-green-600'>•</span>
              <span className='text-green-600'>Tip: Eco alternatives save 2kg plastic/year</span>
            </li>
          </ul>
        </div>

        {/* Bulk Buying Savings */}
        <div className='bg-muted/30 flex items-start gap-2 rounded-lg border p-3'>
          <TbPackage className='mt-0.5 h-4 w-4 shrink-0 text-blue-500' />
          <div>
            <p className='text-sm font-medium'>Bulk Buying Savings</p>
            <p className='text-muted-foreground text-sm'>
              5L detergent vs 2L saves 18% ({formatCurrency(potentialSavings, {currencyCode: currency.code, locale})}/year)
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
