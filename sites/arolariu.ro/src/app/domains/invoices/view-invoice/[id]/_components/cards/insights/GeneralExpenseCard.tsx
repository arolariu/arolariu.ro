"use client";

import {formatCurrency, formatDate} from "@/lib/utils.generic";
import {Badge, Button, Card, CardContent, CardHeader, CardTitle, Checkbox, Label, Progress} from "@arolariu/components";
import {useLocale} from "next-intl";
import {useCallback, useState} from "react";
import {TbBriefcase, TbChartBar, TbCheck, TbDownload, TbFileText, TbFolderOpen, TbHistory, TbRefresh, TbTag} from "react-icons/tb";
import {useInvoiceContext} from "../../../_context/InvoiceContext";

export function GeneralExpenseCard(): React.JSX.Element {
  const locale = useLocale();
  const {invoice} = useInvoiceContext();
  const {paymentInformation} = invoice;
  const {currency, totalCostAmount: totalAmount} = paymentInformation;

  // Auto-detected category (mock)
  const detectedCategory = "Electronics / Technology";
  const confidence = 87;

  // Budget categories (mock)
  const budgets = [
    {name: "Electronics", spent: 450, limit: 500, color: "bg-blue-500"},
    {name: "Entertainment", spent: 120, limit: 300, color: "bg-purple-500"},
    {name: "Shopping", spent: 280, limit: 400, color: "bg-pink-500"},
  ];

  // Tax options
  const [businessExpense, setBusinessExpense] = useState(false);
  const [trackWarranty, setTrackWarranty] = useState(false);
  const [insuranceInventory, setInsuranceInventory] = useState(false);

  const handleBusinessExpenseChange = useCallback((checked: boolean | "indeterminate") => {
    setBusinessExpense(checked === true);
  }, []);

  const handleTrackWarrantyChange = useCallback((checked: boolean | "indeterminate") => {
    setTrackWarranty(checked === true);
  }, []);

  const handleInsuranceInventoryChange = useCallback((checked: boolean | "indeterminate") => {
    setInsuranceInventory(checked === true);
  }, []);

  const vatReclaimable = totalAmount * 0.19;

  // Similar past purchases (mock)
  const pastPurchases = [
    {id: "altex-2024-11-15", store: "Altex", date: new Date("2024-11-15"), amount: 320, item: "Headphones"},
    {id: "emag-2024-09-22", store: "eMAG", date: new Date("2024-09-22"), amount: 890, item: "Monitor"},
  ];

  const nearLimitBudget = budgets.find((b) => b.spent / b.limit >= 0.9);

  return (
    <Card>
      <CardHeader className='pb-3'>
        <CardTitle className='flex items-center gap-2 text-lg'>
          <TbChartBar className='h-5 w-5 text-indigo-600' />
          Expense Intelligence
        </CardTitle>
      </CardHeader>
      <CardContent className='space-y-5'>
        {/* Auto-detected Category */}
        <div className='space-y-2'>
          <h4 className='text-muted-foreground text-sm font-medium'>Auto-detected Category</h4>
          <div className='rounded-lg border p-3'>
            <div className='mb-2 flex items-center justify-between'>
              <div className='flex items-center gap-2'>
                <TbTag className='h-4 w-4 text-indigo-500' />
                <span className='font-medium'>{detectedCategory}</span>
              </div>
              <Badge variant='secondary'>Confidence: {confidence}%</Badge>
            </div>
            <div className='flex gap-2'>
              <Button
                variant='outline'
                size='sm'
                aria-label='Confirm category detection is correct'
                className='gap-1 bg-transparent'>
                <TbCheck className='h-3 w-3' />
                Correct
              </Button>
              <Button
                variant='ghost'
                size='sm'
                aria-label='Change detected category'
                className='gap-1'>
                <TbRefresh className='h-3 w-3' />
                Change
              </Button>
            </div>
          </div>
        </div>

        {/* Budget Impact */}
        <div className='space-y-3'>
          <h4 className='text-muted-foreground text-sm font-medium'>Budget Impact</h4>
          <div className='space-y-3'>
            {budgets.map((budget) => {
              const pct = (budget.spent / budget.limit) * 100;
              const isNearLimit = pct >= 90;
              return (
                <div
                  key={budget.name}
                  className='space-y-1'>
                  <div className='flex items-center justify-between text-sm'>
                    <span>{budget.name}</span>
                    <span className={isNearLimit ? "font-medium text-red-500" : "text-muted-foreground"}>
                      {formatCurrency(budget.spent, {currencyCode: currency.code, locale})} /{" "}
                      {formatCurrency(budget.limit, {currencyCode: currency.code, locale})}
                    </span>
                  </div>
                  <Progress
                    value={pct}
                    className='h-2'
                  />
                </div>
              );
            })}
          </div>
          {nearLimitBudget ? (
            <p
              className='flex items-center gap-1 text-xs text-amber-600'
              role='alert'
              aria-live='polite'>
              <span aria-hidden='true'>!</span>
              {nearLimitBudget.name}: {Math.round((nearLimitBudget.spent / nearLimitBudget.limit) * 100)}% used (10 days left in month)
            </p>
          ) : null}
        </div>

        {/* Tax & Business Options */}
        <div className='space-y-3'>
          <h4 className='text-muted-foreground flex items-center gap-2 text-sm font-medium'>
            <TbFileText className='h-4 w-4' />
            Tax & Business Options
          </h4>
          <div className='space-y-2'>
            <div className='flex items-center gap-2'>
              <Checkbox
                id='business'
                checked={businessExpense}
                onCheckedChange={handleBusinessExpenseChange}
              />
              <Label
                htmlFor='business'
                className='cursor-pointer text-sm font-normal'>
                Mark as business expense
              </Label>
            </div>
            <div className='flex items-center gap-2'>
              <Checkbox
                id='warranty'
                checked={trackWarranty}
                onCheckedChange={handleTrackWarrantyChange}
              />
              <Label
                htmlFor='warranty'
                className='cursor-pointer text-sm font-normal'>
                Track warranty (24 months standard)
              </Label>
            </div>
            <div className='flex items-center gap-2'>
              <Checkbox
                id='insurance'
                checked={insuranceInventory}
                onCheckedChange={handleInsuranceInventoryChange}
              />
              <Label
                htmlFor='insurance'
                className='cursor-pointer text-sm font-normal'>
                Add to insurance inventory
              </Label>
            </div>
          </div>
          {businessExpense ? (
            <p className='flex items-center gap-1 text-sm text-green-600'>
              <TbBriefcase className='h-3 w-3' />
              VAT Reclaimable: {formatCurrency(vatReclaimable, {currencyCode: currency.code, locale})}
            </p>
          ) : null}
        </div>

        {/* Similar Past Purchases */}
        <div className='space-y-2'>
          <div className='flex items-center gap-2'>
            <TbHistory className='h-4 w-4 text-gray-500' />
            <h4 className='text-sm font-medium'>Similar Past Purchases</h4>
          </div>
          <ul className='text-muted-foreground space-y-1.5 text-sm'>
            {pastPurchases.map((p) => (
              <li
                key={p.id}
                className='flex items-center gap-2'>
                <span className='text-muted-foreground'>•</span>
                {p.store} - {formatDate(p.date, {locale})}: {formatCurrency(p.amount, {currencyCode: currency.code, locale})} ({p.item})
              </li>
            ))}
          </ul>
        </div>

        {/* CTA Buttons */}
        <div className='flex gap-2'>
          <Button
            variant='outline'
            size='sm'
            aria-label='Organize this expense into categories'
            className='flex-1 gap-1 bg-transparent'>
            <TbFolderOpen className='h-3 w-3' />
            Organize
          </Button>
          <Button
            variant='outline'
            size='sm'
            aria-label='Export expense data'
            className='flex-1 gap-1 bg-transparent'>
            <TbDownload className='h-3 w-3' />
            Export
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
