"use client";

import {Input} from "@arolariu/components";
import {useTranslations} from "next-intl";
import {useCallback, useMemo} from "react";
import {TbCurrencyDollar} from "react-icons/tb";
import type {FilterState} from "../../_hooks/useInvoiceFilters";
import {FilterCardFrame} from "./FilterCardFrame";
import styles from "./AmountFilterCard.module.scss";

type Props = {
  readonly filters: FilterState;
  readonly onFiltersChange: (filters: Partial<FilterState>) => void;
};

type AmountPresetKey = "0-50" | "50-100" | "100-500" | "500+";

const AMOUNT_PRESETS = [
  {key: "0-50", labelKey: "0to50", min: 0, max: 50},
  {key: "50-100", labelKey: "50to100", min: 50, max: 100},
  {key: "100-500", labelKey: "100to500", min: 100, max: 500},
  {key: "500+", labelKey: "500plus", min: 500, max: null},
] as const satisfies ReadonlyArray<{key: AmountPresetKey; labelKey: string; min: number; max: number | null}>;

/**
 * Amount-range card for invoice filters.
 *
 * @param props - Current filter state and URL-backed filter updater.
 * @returns The rendered amount filter card.
 */
export function AmountFilterCard({filters, onFiltersChange}: Readonly<Props>): React.JSX.Element {
  const t = useTranslations("IMS--List.invoicesView");
  const isAmountActive = filters.amountMin !== null || filters.amountMax !== null;

  const activeAmountPreset = useMemo<AmountPresetKey | null>(() => {
    for (const preset of AMOUNT_PRESETS) {
      if (filters.amountMin === preset.min && filters.amountMax === preset.max) return preset.key;
    }

    return null;
  }, [filters.amountMin, filters.amountMax]);

  const activeValue = useMemo((): string | null => {
    if (!isAmountActive) return null;
    if (filters.amountMin !== null && filters.amountMax !== null) return `${filters.amountMin} – ${filters.amountMax}`;
    if (filters.amountMin !== null) return `≥ ${filters.amountMin}`;
    if (filters.amountMax !== null) return `≤ ${filters.amountMax}`;
    return null;
  }, [filters.amountMax, filters.amountMin, isAmountActive]);

  const handleAmountMinChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const value = event.target.value ? Number.parseFloat(event.target.value) : null;
      onFiltersChange({amountMin: value});
    },
    [onFiltersChange],
  );

  const handleAmountMaxChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const value = event.target.value ? Number.parseFloat(event.target.value) : null;
      onFiltersChange({amountMax: value});
    },
    [onFiltersChange],
  );

  const handleAmountPresetClick = useCallback(
    (presetKey: AmountPresetKey) => {
      if (activeAmountPreset === presetKey) {
        onFiltersChange({amountMin: null, amountMax: null});
        return;
      }

      const preset = AMOUNT_PRESETS.find((candidate) => candidate.key === presetKey);
      if (preset) onFiltersChange({amountMin: preset.min, amountMax: preset.max});
    },
    [activeAmountPreset, onFiltersChange],
  );

  return (
    <FilterCardFrame
      title={
        <>
          <TbCurrencyDollar /> {t("filters.amountRange")}
        </>
      }
      active={isAmountActive}
      activeValue={activeValue}
      inactiveLabel={t("filters.anyValue")}>
      <div className={styles["amountRangeInputs"]}>
        <div className={styles["amountInputWrapper"]}>
          <TbCurrencyDollar className={styles["currencyIcon"]} />
          <Input
            type='number'
            placeholder={t("filters.amountMin")}
            value={filters.amountMin ?? ""}
            onChange={handleAmountMinChange}
            className={styles["amountInput"]}
          />
        </div>
        <div className={styles["amountInputWrapper"]}>
          <TbCurrencyDollar className={styles["currencyIcon"]} />
          <Input
            type='number'
            placeholder={t("filters.amountMax")}
            value={filters.amountMax ?? ""}
            onChange={handleAmountMaxChange}
            className={styles["amountInput"]}
          />
        </div>
      </div>
      <div className={styles["amountPresetRow"]}>
        {AMOUNT_PRESETS.map(({key: presetKey, labelKey}) => (
          <button
            key={presetKey}
            type='button'
            aria-pressed={activeAmountPreset === presetKey}
            className={`${styles["presetButton"]} ${activeAmountPreset === presetKey ? styles["presetButtonActive"] : ""}`}
            // eslint-disable-next-line react/jsx-no-bind -- presetKey is a stable literal from AMOUNT_PRESETS
            onClick={() => handleAmountPresetClick(presetKey)}>
            {t(`filters.amountPresets.${labelKey}`)}
          </button>
        ))}
      </div>
    </FilterCardFrame>
  );
}
