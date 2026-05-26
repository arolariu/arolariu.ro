"use client";

import type {InvoiceCategory} from "@/types/invoices";
import {Badge} from "@arolariu/components";
import {useTranslations} from "next-intl";
import {useCallback, useMemo} from "react";
import type {FilterState} from "../../_hooks/useInvoiceFilters";
import styles from "./DynamicChipFilterCard.module.scss";
import {FilterCardFrame} from "./FilterCardFrame";

type Props = {
  readonly filters: FilterState;
  readonly availableCategories: ReadonlyArray<InvoiceCategory>;
  readonly getCategoryLabel: (category: InvoiceCategory) => string;
  readonly onFiltersChange: (filters: Partial<FilterState>) => void;
};

/**
 * Category chip card for invoice filters.
 *
 * @param props - Current filters, available categories, label formatter, and filter updater.
 * @returns The rendered category card, or an empty fragment when no options exist.
 */
export function CategoryFilterCard({
  filters,
  availableCategories,
  getCategoryLabel,
  onFiltersChange,
}: Readonly<Props>): React.JSX.Element {
  const t = useTranslations("IMS--List.invoicesView");
  const isCategoryActive = filters.categories.length > 0;

  const activeValue = useMemo((): string | null => {
    if (!isCategoryActive) return null;
    return filters.categories.map((category) => getCategoryLabel(category as InvoiceCategory)).join(", ");
  }, [filters.categories, getCategoryLabel, isCategoryActive]);

  const handleCategoryToggle = useCallback(
    (category: InvoiceCategory) => {
      const newCategories = filters.categories.includes(category)
        ? filters.categories.filter((candidate) => candidate !== category)
        : [...filters.categories, category];
      onFiltersChange({categories: newCategories});
    },
    [filters.categories, onFiltersChange],
  );

  if (availableCategories.length === 0) return <></>;

  return (
    <FilterCardFrame
      title={<>📂 {t("filters.categories")}</>}
      active={isCategoryActive}
      activeValue={activeValue}
      inactiveLabel={t("filters.anyValue")}
      dynamicHintLabel={t("filters.dynamicHint")}>
      <div className={styles["categoryChips"]}>
        {availableCategories.map((category) => (
          <button
            key={category}
            type='button'
            aria-pressed={filters.categories.includes(category)}
            className={styles["chipButton"]}
            // eslint-disable-next-line react/jsx-no-bind -- category is a stable enum value from availableCategories
            onClick={() => handleCategoryToggle(category)}>
            <Badge
              variant={filters.categories.includes(category) ? "default" : "outline"}
              className={styles["categoryChip"]}>
              {getCategoryLabel(category)}
            </Badge>
          </button>
        ))}
      </div>
    </FilterCardFrame>
  );
}
