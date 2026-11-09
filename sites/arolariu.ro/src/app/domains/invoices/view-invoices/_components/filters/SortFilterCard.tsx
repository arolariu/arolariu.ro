"use client";

import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from "@arolariu/components";
import {type SelectorTranslator, useTranslations} from "next-intl-selector";
import {useCallback, useMemo} from "react";
import type {FilterState} from "../../_hooks/useInvoiceFilters";
import {FilterCardFrame} from "./FilterCardFrame";
import styles from "./SortFilterCard.module.scss";

type Props = Readonly<{
  readonly filters: FilterState;
  readonly onFiltersChange: (filters: Partial<FilterState>) => void;
}>;

function getSortLabel(t: SelectorTranslator, sortBy: FilterState["sortBy"], sortOrder: FilterState["sortOrder"]): string {
  if (sortBy === "date" && sortOrder === "desc") return t((m) => m.forms.invoices.filters.sortOptions.dateNewest);
  if (sortBy === "date" && sortOrder === "asc") return t((m) => m.forms.invoices.filters.sortOptions.dateOldest);
  if (sortBy === "amount" && sortOrder === "desc") return t((m) => m.forms.invoices.filters.sortOptions.amountHighToLow);
  if (sortBy === "amount" && sortOrder === "asc") return t((m) => m.forms.invoices.filters.sortOptions.amountLowToHigh);
  if (sortBy === "name" && sortOrder === "asc") return t((m) => m.forms.invoices.filters.sortOptions.nameAZ);
  if (sortBy === "name" && sortOrder === "desc") return t((m) => m.forms.invoices.filters.sortOptions.nameZA);
  return "";
}

/**
 * Sort selection card for invoice filters.
 *
 * @param props - Current filter state and URL-backed filter updater.
 * @returns The rendered sort filter card.
 */
export function SortFilterCard({filters, onFiltersChange}: Readonly<Props>): React.JSX.Element {
  const t = useTranslations();
  const isSortActive = !(filters.sortBy === "date" && filters.sortOrder === "desc");
  const activeValue = useMemo(
    () => (isSortActive ? getSortLabel(t, filters.sortBy, filters.sortOrder) : null),
    [filters.sortBy, filters.sortOrder, isSortActive, t],
  );

  // Single source for both the rendered options and the trigger label lookup.
  const sortItems = useMemo(
    () => [
      {value: "date-desc", label: t((m) => m.forms.invoices.filters.sortOptions.dateNewest)},
      {value: "date-asc", label: t((m) => m.forms.invoices.filters.sortOptions.dateOldest)},
      {value: "amount-desc", label: t((m) => m.forms.invoices.filters.sortOptions.amountHighToLow)},
      {value: "amount-asc", label: t((m) => m.forms.invoices.filters.sortOptions.amountLowToHigh)},
      {value: "name-asc", label: t((m) => m.forms.invoices.filters.sortOptions.nameAZ)},
      {value: "name-desc", label: t((m) => m.forms.invoices.filters.sortOptions.nameZA)},
    ],
    [t],
  );

  const handleSortChange = useCallback(
    (value: string | null) => {
      if (value === null) return;
      const parts = value.split("-");
      const direction = parts.pop() as "asc" | "desc";
      const field = parts.join("-") as Exclude<FilterState["sortBy"], null>;
      onFiltersChange({sortBy: field, sortOrder: direction});
    },
    [onFiltersChange],
  );

  return (
    <FilterCardFrame
      title={<>↕ {t((m) => m.forms.invoices.filters.sortBy)}</>}
      active={isSortActive}
      activeValue={activeValue}
      inactiveLabel={t((m) => m.forms.invoices.filters.defaultValue)}>
      <Select
        value={`${filters.sortBy}-${filters.sortOrder}`}
        onValueChange={handleSortChange}
        items={sortItems}>
        <SelectTrigger className={styles["sortSelect"]}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {sortItems.map((item) => (
            <SelectItem
              key={item.value}
              value={item.value}>
              {item.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </FilterCardFrame>
  );
}
