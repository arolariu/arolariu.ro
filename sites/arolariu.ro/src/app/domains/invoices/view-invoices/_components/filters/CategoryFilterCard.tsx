"use client";

/**
 * @fileoverview Canonical invoice-classification filter chips.
 * @module domains/invoices/view-invoices/components/filters/CategoryFilterCard
 */

import type {ClassificationFilterOption} from "../../_utils/filterOptions";
import {Badge} from "@arolariu/components";
import {useTranslations} from "next-intl-selector";
import {useCallback, useMemo} from "react";
import type {FilterState} from "../../_hooks/useInvoiceFilters";
import styles from "./DynamicChipFilterCard.module.scss";
import {FilterCardFrame} from "./FilterCardFrame";

interface Props {
  readonly filters: FilterState;
  readonly availableClassifications: readonly ClassificationFilterOption[];
  readonly onFiltersChange: (filters: Partial<FilterState>) => void;
}

/** Renders dynamic official-label classification chips with stable URL keys. */
export function CategoryFilterCard({filters, availableClassifications, onFiltersChange}: Readonly<Props>): React.JSX.Element | null {
  const t = useTranslations();
  const active = filters.classifications.length > 0;
  const activeValue = useMemo(
    () =>
      availableClassifications
        .filter((option) => filters.classifications.includes(option.key))
        .map((option) => option.label)
        .join(", "),
    [availableClassifications, filters.classifications],
  );
  const toggleClassification = useCallback(
    (key: string) => {
      const classifications = filters.classifications.includes(key)
        ? filters.classifications.filter((candidate) => candidate !== key)
        : [...filters.classifications, key];
      onFiltersChange({classifications});
    },
    [filters.classifications, onFiltersChange],
  );

  if (availableClassifications.length === 0) return null;

  return (
    <FilterCardFrame
      title={<>📂 {t((m) => m.forms.invoices.filters.categories)}</>}
      active={active}
      activeValue={activeValue}
      inactiveLabel={t((m) => m.forms.invoices.filters.anyValue)}
      dynamicHintLabel={t((m) => m.forms.invoices.filters.dynamicHint)}>
      <div className={styles["categoryChips"]}>
        {availableClassifications.map((option) => {
          const selected = filters.classifications.includes(option.key);
          return (
            <button
              key={option.key}
              type='button'
              aria-pressed={selected}
              className={styles["chipButton"]}
              onClick={() => toggleClassification(option.key)}>
              <Badge
                variant={selected ? "default" : "outline"}
                className={styles["categoryChip"]}>
                {option.label} ({option.rootCode})
              </Badge>
            </button>
          );
        })}
      </div>
    </FilterCardFrame>
  );
}
