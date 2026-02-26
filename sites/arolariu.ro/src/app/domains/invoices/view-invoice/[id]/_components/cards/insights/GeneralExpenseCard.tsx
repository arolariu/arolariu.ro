"use client";

import {formatCurrency, formatDate} from "@/lib/utils.generic";
import {Badge, Button, Card, CardContent, CardHeader, CardTitle, Checkbox, Label, Progress} from "@arolariu/components";
import {useLocale, useTranslations} from "next-intl";
import {useCallback, useState} from "react";
import {TbBriefcase, TbChartBar, TbCheck, TbDownload, TbFileText, TbFolderOpen, TbHistory, TbRefresh, TbTag} from "react-icons/tb";
import {useInvoiceContext} from "../../../_context/InvoiceContext";
import styles from "./GeneralExpenseCard.module.scss";

export function GeneralExpenseCard(): React.JSX.Element {
  const locale = useLocale();
  const t = useTranslations("Invoices.ViewInvoice.generalExpenseCard");
  const {invoice} = useInvoiceContext();
  const {paymentInformation} = invoice;
  const {currency, totalCostAmount: totalAmount} = paymentInformation;

  // Auto-detected category (mock)
  const detectedCategory = t("detectedCategory");
  const confidence = 87;

  // Budget categories (mock)
  const budgets = [
    {name: t("budgetCategories.electronics"), spent: 450, limit: 500, color: "bg-blue-500"},
    {name: t("budgetCategories.entertainment"), spent: 120, limit: 300, color: "bg-purple-500"},
    {name: t("budgetCategories.shopping"), spent: 280, limit: 400, color: "bg-pink-500"},
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
          {t("title")}
        </CardTitle>
      </CardHeader>
      <CardContent className='space-y-5'>
        {/* Auto-detected Category */}
        <div>
          <h4 className={styles["sectionTitle"]}>{t("sections.autoDetectedCategory")}</h4>
          <div className={styles["detectedBox"]}>
            <div className={styles["detectedRow"]}>
              <div className={styles["detectedLabel"]}>
                <TbTag className='h-4 w-4 text-indigo-500' />
                <span className={styles["detectedName"]}>{detectedCategory}</span>
              </div>
              <Badge variant='secondary'>{t("confidence", {value: String(confidence)})}</Badge>
            </div>
            <div className={styles["detectedActions"]}>
              <Button
                variant='outline'
                size='sm'
                aria-label={t("aria.confirmCategory")}
                className='gap-1 bg-transparent'>
                <TbCheck className='h-3 w-3' />
                {t("buttons.correct")}
              </Button>
              <Button
                variant='ghost'
                size='sm'
                aria-label={t("aria.changeCategory")}
                className='gap-1'>
                <TbRefresh className='h-3 w-3' />
                {t("buttons.change")}
              </Button>
            </div>
          </div>
        </div>

        {/* Budget Impact */}
        <div className={styles["budgetSection"]}>
          <h4 className={styles["sectionTitle"]}>{t("sections.budgetImpact")}</h4>
          <div className={styles["budgetSection"]}>
            {budgets.map((budget) => {
              const pct = (budget.spent / budget.limit) * 100;
              const isNearLimit = pct >= 90;
              return (
                <div
                  key={budget.name}
                  className={styles["budgetItem"]}>
                  <div className={styles["budgetRow"]}>
                    <span>{budget.name}</span>
                    <span className={isNearLimit ? styles["nearLimitText"] : styles["budgetMutedText"]}>
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
              className={styles["alertText"]}
              role='alert'
              aria-live='polite'>
              <span aria-hidden='true'>!</span>
              {t("nearLimitAlert", {
                name: nearLimitBudget.name,
                percent: String(Math.round((nearLimitBudget.spent / nearLimitBudget.limit) * 100)),
              })}
            </p>
          ) : null}
        </div>

        {/* Tax & Business Options */}
        <div>
          <h4 className={styles["sectionTitleWithIcon"]}>
            <TbFileText className='h-4 w-4' />
            {t("sections.taxBusiness")}
          </h4>
          <div className={styles["checkboxSection"]}>
            <div className={styles["checkboxRow"]}>
              <Checkbox
                id='business'
                checked={businessExpense}
                onCheckedChange={handleBusinessExpenseChange}
              />
              <Label
                htmlFor='business'
                className='cursor-pointer text-sm font-normal'>
                {t("options.businessExpense")}
              </Label>
            </div>
            <div className={styles["checkboxRow"]}>
              <Checkbox
                id='warranty'
                checked={trackWarranty}
                onCheckedChange={handleTrackWarrantyChange}
              />
              <Label
                htmlFor='warranty'
                className='cursor-pointer text-sm font-normal'>
                {t("options.trackWarranty")}
              </Label>
            </div>
            <div className={styles["checkboxRow"]}>
              <Checkbox
                id='insurance'
                checked={insuranceInventory}
                onCheckedChange={handleInsuranceInventoryChange}
              />
              <Label
                htmlFor='insurance'
                className='cursor-pointer text-sm font-normal'>
                {t("options.insuranceInventory")}
              </Label>
            </div>
          </div>
          {businessExpense ? (
            <p className={styles["vatText"]}>
              <TbBriefcase className='h-3 w-3' />
              {t("vatReclaimable")}: {formatCurrency(vatReclaimable, {currencyCode: currency.code, locale})}
            </p>
          ) : null}
        </div>

        {/* Similar Past Purchases */}
        <div>
          <div className={styles["pastHeader"]}>
            <TbHistory className='h-4 w-4 text-gray-500' />
            <h4 className={styles["pastTitle"]}>{t("sections.similarPurchases")}</h4>
          </div>
          <ul className={styles["pastList"]}>
            {pastPurchases.map((p) => (
              <li
                key={p.id}
                className={styles["pastItem"]}>
                <span className={styles["pastBullet"]}>•</span>
                {p.store} - {formatDate(p.date, {locale})}: {formatCurrency(p.amount, {currencyCode: currency.code, locale})} ({p.item})
              </li>
            ))}
          </ul>
        </div>

        {/* CTA Buttons */}
        <div className={styles["ctaButtons"]}>
          <Button
            variant='outline'
            size='sm'
            aria-label={t("aria.organize")}
            className='flex-1 gap-1 bg-transparent'>
            <TbFolderOpen className='h-3 w-3' />
            {t("buttons.organize")}
          </Button>
          <Button
            variant='outline'
            size='sm'
            aria-label={t("aria.export")}
            className='flex-1 gap-1 bg-transparent'>
            <TbDownload className='h-3 w-3' />
            {t("buttons.export")}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
