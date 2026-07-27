"use client";

import {Badge} from "@arolariu/components";
import {useTranslations} from "next-intl-selector";
import {useCallback, useMemo} from "react";
import type {FilterState} from "../../_hooks/useInvoiceFilters";
import styles from "./DynamicChipFilterCard.module.scss";
import {FilterCardFrame} from "./FilterCardFrame";

type Props = Readonly<{
  readonly filters: FilterState;
  readonly availableCurrencies: ReadonlyArray<string>;
  readonly onFiltersChange: (filters: Partial<FilterState>) => void;
}>;

/**
 * Currency chip card for invoice filters.
 *
 * @param props - Current filters, available currency codes, and filter updater.
 * @returns The rendered currency card, or `null` when no options exist.
 */
export function CurrencyFilterCard({filters, availableCurrencies, onFiltersChange}: Readonly<Props>): React.JSX.Element | null {
  const t = useTranslations();
  const isCurrencyActive = filters.currencies.length > 0;

  const activeValue = useMemo((): string | null => {
    if (!isCurrencyActive) return null;
    return filters.currencies.length <= 2
      ? filters.currencies.join(", ")
      : `${filters.currencies.slice(0, 2).join(", ")}, +${filters.currencies.length - 2}`;
  }, [filters.currencies, isCurrencyActive]);

  const handleCurrencyToggle = useCallback(
    (code: string) => {
      const next = filters.currencies.includes(code)
        ? filters.currencies.filter((currency) => currency !== code)
        : [...filters.currencies, code];
      onFiltersChange({currencies: next});
    },
    [filters.currencies, onFiltersChange],
  );

  if (availableCurrencies.length === 0) return null;

  return (
    <FilterCardFrame
      title={<>💵 {t((m) => m.forms.invoices.filters.currency)}</>}
      active={isCurrencyActive}
      activeValue={activeValue}
      inactiveLabel={t((m) => m.forms.invoices.filters.currencyAny)}
      dynamicHintLabel={t((m) => m.forms.invoices.filters.dynamicHint)}>
      <div className={styles["categoryChips"]}>
        {availableCurrencies.map((code) => (
          <button
            key={code}
            type='button'
            aria-pressed={filters.currencies.includes(code)}
            className={styles["chipButton"]}
            // eslint-disable-next-line react/jsx-no-bind -- code is a stable literal from availableCurrencies
            onClick={() => handleCurrencyToggle(code)}>
            <Badge
              variant={filters.currencies.includes(code) ? "default" : "outline"}
              className={styles["categoryChip"]}>
              {code}
            </Badge>
          </button>
        ))}
      </div>
    </FilterCardFrame>
  );
}
