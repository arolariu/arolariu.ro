"use client";

import {Badge} from "@arolariu/components";
import {useTranslations} from "next-intl-selector";
import {useCallback, useMemo} from "react";
import type {FilterState} from "../../_hooks/useInvoiceFilters";
import styles from "./DynamicChipFilterCard.module.scss";
import {FilterCardFrame} from "./FilterCardFrame";

type Props = Readonly<{
  readonly filters: FilterState;
  readonly availableClassificationGroups: ReadonlyArray<string>;
  readonly onFiltersChange: (filters: Partial<FilterState>) => void;
}>;

/**
 * Classification group chip card for invoice filters.
 *
 * @param props - Current filters, available taxonomy root groups, and filter updater.
 * @returns The rendered classification filter card, or `null` when no options exist.
 */
export function ClassificationFilterCard({
  filters,
  availableClassificationGroups,
  onFiltersChange,
}: Readonly<Props>): React.JSX.Element | null {
  const t = useTranslations();
  const isGroupActive = filters.classificationGroups.length > 0;

  const activeValue = useMemo((): string | null => {
    if (!isGroupActive) return null;
    return filters.classificationGroups.join(", ");
  }, [filters.classificationGroups, isGroupActive]);

  const handleGroupToggle = useCallback(
    (group: string) => {
      const newGroups = filters.classificationGroups.includes(group)
        ? filters.classificationGroups.filter((candidate) => candidate !== group)
        : [...filters.classificationGroups, group];
      onFiltersChange({classificationGroups: newGroups});
    },
    [filters.classificationGroups, onFiltersChange],
  );

  if (availableClassificationGroups.length === 0) return null;

  return (
    <FilterCardFrame
      title={<>📂 {t((m) => m.forms.invoices.filters.classificationGroups)}</>}
      active={isGroupActive}
      activeValue={activeValue}
      inactiveLabel={t((m) => m.forms.invoices.filters.anyValue)}
      dynamicHintLabel={t((m) => m.forms.invoices.filters.dynamicHint)}>
      <div className={styles["categoryChips"]}>
        {availableClassificationGroups.map((group) => (
          <button
            key={group}
            type='button'
            aria-pressed={filters.classificationGroups.includes(group)}
            className={styles["chipButton"]}
            // eslint-disable-next-line react/jsx-no-bind -- group is a stable string from availableClassificationGroups
            onClick={() => handleGroupToggle(group)}>
            <Badge
              variant={filters.classificationGroups.includes(group) ? "default" : "outline"}
              className={styles["categoryChip"]}>
              {group}
            </Badge>
          </button>
        ))}
      </div>
    </FilterCardFrame>
  );
}
