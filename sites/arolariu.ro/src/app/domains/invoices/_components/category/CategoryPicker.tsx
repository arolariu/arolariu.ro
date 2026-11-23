"use client";

import {invoiceCategories, merchantCategories, productCategories} from "@/lib/categories/categoryCatalog";
import {invoiceCategoryLabel, merchantCategoryLabel, productCategoryLabel} from "@/lib/categories/categoryLabels";
import type {InvoiceCategory, MerchantCategory, ProductCategory} from "@/types/invoices/Category";
import {Combobox, ComboboxContent, ComboboxEmpty, ComboboxInput, ComboboxItem, ComboboxList, Label} from "@arolariu/components";
import {useTranslations} from "next-intl-selector";
import {useCallback, useId, useMemo} from "react";
import styles from "./CategoryPicker.module.scss";

type CategoryByDomain = {
  invoices: InvoiceCategory;
  merchants: MerchantCategory;
  products: ProductCategory;
};

type Domain = keyof CategoryByDomain;
type Category = CategoryByDomain[Domain];
type CategoryOption = Readonly<{value: Category; label: string}>;
type Props = Readonly<{label: string; disabled?: boolean}>
  & {
    [K in Domain]: Readonly<{domain: K; value: CategoryByDomain[K] | null; onValueChange: (value: CategoryByDomain[K] | null) => void}>;
  }[Domain];

const itemLabel = (option: CategoryOption): string => option.label;
const sameCategory = (a: CategoryOption, b: CategoryOption): boolean => a.value === b.value;

/** Selects or clears a category from the bundled, localized catalog. */
export default function CategoryPicker(props: Props): React.JSX.Element {
  const t = useTranslations();
  const id = useId();
  const {disabled, domain, label, onValueChange, value} = props;
  const options = useMemo((): CategoryOption[] => {
    switch (domain) {
      case "invoices":
        return invoiceCategories.map(({id: entry}) => ({value: entry, label: invoiceCategoryLabel(t, entry)}));
      case "merchants":
        return merchantCategories.map(({id: entry}) => ({value: entry, label: merchantCategoryLabel(t, entry)}));
      case "products":
        return productCategories.map(({id: entry}) => ({value: entry, label: productCategoryLabel(t, entry)}));
      default:
        return [];
    }
  }, [domain, t]);

  const select = useCallback(
    (option: CategoryOption | null): void => {
      // Options come exclusively from the selected domain's catalog.
      (onValueChange as (category: Category | null) => void)(option?.value ?? null);
    },
    [onValueChange],
  );

  return (
    <div
      className={styles["picker"]}
      data-category-picker>
      <Label htmlFor={id}>{label}</Label>
      <Combobox
        items={options}
        value={options.find((option) => option.value === value) ?? null}
        itemToStringLabel={itemLabel}
        isItemEqualToValue={sameCategory}
        onValueChange={select}
        disabled={disabled}>
        <ComboboxInput
          id={id}
          placeholder={t((m) => m.categories.ui.choose)}
          clearProps={{"aria-label": t((m) => m.categories.ui.clear)}}
          showClear
        />
        <ComboboxContent>
          <ComboboxList>{renderOption}</ComboboxList>
          <ComboboxEmpty>{t((m) => m.categories.ui.noResults)}</ComboboxEmpty>
        </ComboboxContent>
      </Combobox>
    </div>
  );
}

function renderOption(option: CategoryOption): React.JSX.Element {
  return (
    <ComboboxItem
      key={option.value}
      value={option}>
      {option.label}
    </ComboboxItem>
  );
}
