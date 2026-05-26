"use client";

import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from "@arolariu/components";
import {useTranslations} from "next-intl";
import {useCallback, useMemo} from "react";
import type {FilterState} from "../../_hooks/useInvoiceFilters";
import {FilterCardFrame} from "./FilterCardFrame";
import styles from "./SortFilterCard.module.scss";

type Props = {
  readonly filters: FilterState;
  readonly onFiltersChange: (filters: Partial<FilterState>) => void;
};

type TranslationFunction = ReturnType<typeof useTranslations>;

function getSortLabel(t: TranslationFunction, sortBy: FilterState["sortBy"], sortOrder: FilterState["sortOrder"]): string {
  if (sortBy === "date" && sortOrder === "desc") return t("filters.sortOptions.dateNewest");
  if (sortBy === "date" && sortOrder === "asc") return t("filters.sortOptions.dateOldest");
  if (sortBy === "amount" && sortOrder === "desc") return t("filters.sortOptions.amountHighToLow");
  if (sortBy === "amount" && sortOrder === "asc") return t("filters.sortOptions.amountLowToHigh");
  if (sortBy === "name" && sortOrder === "asc") return t("filters.sortOptions.nameAZ");
  if (sortBy === "name" && sortOrder === "desc") return t("filters.sortOptions.nameZA");
  return "";
}

/**
 * Sort selection card for invoice filters.
 *
 * @param props - Current filter state and URL-backed filter updater.
 * @returns The rendered sort filter card.
 */
export function SortFilterCard({filters, onFiltersChange}: Readonly<Props>): React.JSX.Element {
  const t = useTranslations("IMS--List.invoicesView");
  const isSortActive = !(filters.sortBy === "date" && filters.sortOrder === "desc");
  const activeValue = useMemo(
    () => (isSortActive ? getSortLabel(t, filters.sortBy, filters.sortOrder) : null),
    [filters.sortBy, filters.sortOrder, isSortActive, t],
  );

  const handleSortChange = useCallback(
    (value: string) => {
      const parts = value.split("-");
      const direction = parts.pop() as "asc" | "desc";
      const field = parts.join("-") as Exclude<FilterState["sortBy"], null>;
      onFiltersChange({sortBy: field, sortOrder: direction});
    },
    [onFiltersChange],
  );

  return (
    <FilterCardFrame
      title={<>↕ {t("filters.sortBy")}</>}
      active={isSortActive}
      activeValue={activeValue}
      inactiveLabel={t("filters.defaultValue")}>
      <Select
        value={`${filters.sortBy}-${filters.sortOrder}`}
        onValueChange={handleSortChange}>
        <SelectTrigger className={styles["sortSelect"]}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value='date-desc'>{t("filters.sortOptions.dateNewest")}</SelectItem>
          <SelectItem value='date-asc'>{t("filters.sortOptions.dateOldest")}</SelectItem>
          <SelectItem value='amount-desc'>{t("filters.sortOptions.amountHighToLow")}</SelectItem>
          <SelectItem value='amount-asc'>{t("filters.sortOptions.amountLowToHigh")}</SelectItem>
          <SelectItem value='name-asc'>{t("filters.sortOptions.nameAZ")}</SelectItem>
          <SelectItem value='name-desc'>{t("filters.sortOptions.nameZA")}</SelectItem>
        </SelectContent>
      </Select>
    </FilterCardFrame>
  );
}
