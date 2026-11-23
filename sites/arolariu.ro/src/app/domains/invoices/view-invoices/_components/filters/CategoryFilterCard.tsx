"use client";

import {invoiceCategoryLabel} from "@/lib/categories/categoryLabels";
import {Badge} from "@arolariu/components";
import {useTranslations} from "next-intl-selector";
import {useCallback, useMemo} from "react";
import type {CategoryFilterValue, FilterState} from "../../_hooks/useInvoiceFilters";
import styles from "./DynamicChipFilterCard.module.scss";
import {FilterCardFrame} from "./FilterCardFrame";

type Props = Readonly<{
  readonly filters: FilterState;
  readonly availableCategories: ReadonlyArray<CategoryFilterValue>;
  readonly onFiltersChange: (filters: Partial<FilterState>) => void;
}>;

/**
 * Receipt category chip card for invoice filters.
 *
 * @param props - Current filters, available categories, and filter updater.
 * @returns The rendered classification filter card, or `null` when no options exist.
 */
export function CategoryFilterCard({filters, availableCategories, onFiltersChange}: Readonly<Props>): React.JSX.Element | null {
  const t = useTranslations();
  const isGroupActive = filters.categoryFilters.length > 0;

  const activeValue = useMemo((): string | null => {
    if (!isGroupActive) return null;
    return filters.categoryFilters.map((category) => invoiceCategoryLabel(t, category === "uncategorized" ? null : category)).join(", ");
  }, [filters.categoryFilters, isGroupActive, t]);

  const handleGroupToggle = useCallback(
    (group: CategoryFilterValue) => {
      const newGroups = filters.categoryFilters.includes(group)
        ? filters.categoryFilters.filter((candidate) => candidate !== group)
        : [...filters.categoryFilters, group];
      onFiltersChange({categoryFilters: newGroups});
    },
    [filters.categoryFilters, onFiltersChange],
  );

  if (availableCategories.length === 0) return null;

  return (
    <FilterCardFrame
      title={<>📂 {t((m) => m.categories.ui.invoice)}</>}
      active={isGroupActive}
      activeValue={activeValue}
      inactiveLabel={t((m) => m.forms.invoices.filters.anyValue)}
      dynamicHintLabel={t((m) => m.forms.invoices.filters.dynamicHint)}>
      <div className={styles["categoryChips"]}>
        {availableCategories.map((group) => (
          <button
            key={group}
            type='button'
            aria-pressed={filters.categoryFilters.includes(group)}
            className={styles["chipButton"]}
            // eslint-disable-next-line react/jsx-no-bind -- group is a stable filter value
            onClick={() => handleGroupToggle(group)}>
            <Badge
              variant={filters.categoryFilters.includes(group) ? "default" : "outline"}
              className={styles["categoryChip"]}>
              {invoiceCategoryLabel(t, group === "uncategorized" ? null : group)}
            </Badge>
          </button>
        ))}
      </div>
    </FilterCardFrame>
  );
}
