"use client";

import type {PaymentType} from "@/types/invoices";
import {Badge} from "@arolariu/components";
import {useTranslations} from "next-intl-selector";
import {useCallback, useMemo} from "react";
import type {FilterState} from "../../_hooks/useInvoiceFilters";
import styles from "./DynamicChipFilterCard.module.scss";
import {FilterCardFrame} from "./FilterCardFrame";

type Props = Readonly<{
  readonly filters: FilterState;
  readonly availablePaymentTypes: ReadonlyArray<PaymentType>;
  readonly getPaymentTypeLabel: (paymentType: PaymentType) => string;
  readonly onFiltersChange: (filters: Partial<FilterState>) => void;
}>;

/**
 * Payment-type chip card for invoice filters.
 *
 * @param props - Current filters, available payment types, label formatter, and filter updater.
 * @returns The rendered payment-type card, or an empty fragment when no options exist.
 */
export function PaymentTypeFilterCard({
  filters,
  availablePaymentTypes,
  getPaymentTypeLabel,
  onFiltersChange,
}: Readonly<Props>): React.JSX.Element | null {
  const t = useTranslations();
  const isPaymentActive = filters.paymentTypes.length > 0;

  const activeValue = useMemo((): string | null => {
    if (!isPaymentActive) return null;
    return filters.paymentTypes.map((paymentType) => getPaymentTypeLabel(paymentType as PaymentType)).join(", ");
  }, [filters.paymentTypes, getPaymentTypeLabel, isPaymentActive]);

  const handlePaymentTypeToggle = useCallback(
    (paymentType: PaymentType) => {
      const newPaymentTypes = filters.paymentTypes.includes(paymentType)
        ? filters.paymentTypes.filter((candidate) => candidate !== paymentType)
        : [...filters.paymentTypes, paymentType];
      onFiltersChange({paymentTypes: newPaymentTypes});
    },
    [filters.paymentTypes, onFiltersChange],
  );

  if (availablePaymentTypes.length === 0) return null;

  return (
    <FilterCardFrame
      title={<>💳 {t((m) => m.forms.invoices.filters.paymentTypes)}</>}
      active={isPaymentActive}
      activeValue={activeValue}
      inactiveLabel={t((m) => m.forms.invoices.filters.anyValue)}
      dynamicHintLabel={t((m) => m.forms.invoices.filters.dynamicHint)}>
      <div className={styles["categoryChips"]}>
        {availablePaymentTypes.map((paymentType) => (
          <button
            key={paymentType}
            type='button'
            aria-pressed={filters.paymentTypes.includes(paymentType)}
            className={styles["chipButton"]}
            // eslint-disable-next-line react/jsx-no-bind -- paymentType is a stable enum value from availablePaymentTypes
            onClick={() => handlePaymentTypeToggle(paymentType)}>
            <Badge
              variant={filters.paymentTypes.includes(paymentType) ? "default" : "outline"}
              className={styles["categoryChip"]}>
              {getPaymentTypeLabel(paymentType)}
            </Badge>
          </button>
        ))}
      </div>
    </FilterCardFrame>
  );
}
