"use client";

import {Card, CardContent, CardDescription, CardHeader, CardTitle} from "@arolariu/components";
import {TbGrid3X3, TbPackage, TbPercentage, TbReceipt, TbTrendingDown, TbTrendingUp} from "react-icons/tb";
import {InvoiceSummary} from "../../_utils/analytics";

type Props = {
  summary: InvoiceSummary;
  currency: string;
};

export function SummaryStatsCard({summary, currency}: Readonly<Props>): React.JSX.Element {
  const stats = [
    {
      label: "Total Items",
      value: summary.totalItems.toString(),
      icon: TbPackage,
      description: "Products purchased",
    },
    {
      label: "Categories",
      value: summary.uniqueCategories.toString(),
      icon: TbGrid3X3,
      description: "Unique categories",
    },
    {
      label: "Avg. Price",
      value: `${summary.averageItemPrice.toFixed(2)}`,
      icon: TbReceipt,
      description: `${currency} per item`,
    },
    {
      label: "Tax Rate",
      value: `${summary.taxPercentage.toFixed(1)}%`,
      icon: TbPercentage,
      description: `${summary.taxAmount.toFixed(2)} ${currency}`,
    },
  ];

  return (
    <Card className='h-full transition-shadow duration-300 hover:shadow-md'>
      <CardHeader className='pb-2'>
        <CardTitle className='text-base'>Invoice Summary</CardTitle>
        <CardDescription className='text-xs'>Key statistics at a glance</CardDescription>
      </CardHeader>
      <CardContent>
        <main className='grid grid-cols-2 gap-3'>
          {stats.map((stat) => (
            <main
              key={stat.label}
              className='space-y-0.5'>
              <main className='text-muted-foreground flex items-center gap-1.5'>
                <stat.icon className='h-3.5 w-3.5' />
                <span className='text-xs'>{stat.label}</span>
              </main>
              <p className='text-lg font-semibold'>{stat.value}</p>
              <p className='text-muted-foreground text-xs'>{stat.description}</p>
            </main>
          ))}
        </main>

        <main className='border-border mt-4 space-y-2 border-t pt-3'>
          <main className='flex items-center justify-between'>
            <main className='flex items-center gap-1.5'>
              <TbTrendingUp className='h-3.5 w-3.5 text-emerald-500' />
              <span className='text-xs'>Highest</span>
            </main>
            <main className='text-right'>
              <p className='text-sm font-medium'>
                {summary.highestItem.price.toFixed(2)} {currency}
              </p>
              <p className='text-muted-foreground max-w-[100px] truncate text-xs'>{summary.highestItem.name}</p>
            </main>
          </main>

          <main className='flex items-center justify-between'>
            <main className='flex items-center gap-1.5'>
              <TbTrendingDown className='h-3.5 w-3.5 text-blue-500' />
              <span className='text-xs'>Lowest</span>
            </main>
            <main className='text-right'>
              <p className='text-sm font-medium'>
                {summary.lowestItem.price.toFixed(2)} {currency}
              </p>
              <p className='text-muted-foreground max-w-[100px] truncate text-xs'>{summary.lowestItem.name}</p>
            </main>
          </main>
        </main>
      </CardContent>
    </Card>
  );
}
