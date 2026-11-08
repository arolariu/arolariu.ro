"use client";

/**
 * @fileoverview Invoice-specific preferences and personalization component.
 * Allows users to configure default view mode, sort order, page size, currency, and statistics visibility.
 * @module app/domains/invoices/_components/InvoicePreferences
 */

import {notify} from "@/lib/notify";
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Checkbox,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  useLocalStorage,
} from "@arolariu/components";
import {useTranslations} from "next-intl-selector";
import {useCallback, useMemo} from "react";
import {TbSettings} from "react-icons/tb";
import styles from "./InvoicePreferences.module.scss";

/**
 * Invoice display and behavior preferences.
 */
export type InvoicePreferencesType = {
  /** Default view mode for invoice lists */
  defaultViewMode: "table" | "grid";
  /** Default sort field for invoice lists */
  defaultSortBy: string;
  /** Number of items per page in lists */
  defaultPageSize: number;
  /** Whether to show statistics summary on homepage */
  showStatisticsOnHome: boolean;
  /** Preferred display currency */
  currency: string;
};

/**
 * Default invoice preferences.
 */
const DEFAULT_PREFERENCES: InvoicePreferencesType = {
  defaultViewMode: "table",
  defaultSortBy: "dateDesc",
  defaultPageSize: 10,
  showStatisticsOnHome: true,
  currency: "RON",
};

/**
 * Page size options; labels are locale-independent numbers.
 */
const PAGE_SIZE_ITEMS = [
  {value: "5", label: "5"},
  {value: "10", label: "10"},
  {value: "20", label: "20"},
  {value: "50", label: "50"},
] as const;

/**
 * Currency options; labels are locale-independent currency names.
 */
const CURRENCY_ITEMS = [
  {value: "RON", label: "RON (Lei)"},
  {value: "EUR", label: "EUR (Euro)"},
  {value: "USD", label: "USD (Dollar)"},
  {value: "GBP", label: "GBP (Pound)"},
] as const;

/**
 * Invoice preferences component.
 *
 * @remarks
 * Features:
 * - Default view mode selection (table or grid)
 * - Default sort order (date ascending/descending, amount, name)
 * - Items per page configuration (5, 10, 20, 50)
 * - Preferred currency selection
 * - Show/hide statistics on homepage
 * - Persists to localStorage
 * - Success toast on save
 *
 * @returns The InvoicePreferences component
 */
export default function InvoicePreferences(): React.JSX.Element {
  const t = useTranslations();

  const [preferences, setPreferences] = useLocalStorage<InvoicePreferencesType>("invoice-preferences", DEFAULT_PREFERENCES);

  /**
   * Handles saving preferences with success feedback.
   */
  const handleSave = useCallback(() => {
    // Preferences are already saved via useLocalStorage setter
    notify.success(t((m) => m.shared.invoices.preferences.saved));
  }, [t]);

  /**
   * Updates a single preference field.
   */
  const updatePreference = useCallback(
    <K extends keyof InvoicePreferencesType>(key: K, value: InvoicePreferencesType[K]) => {
      setPreferences((prev) => ({...prev, [key]: value}));
    },
    [setPreferences],
  );

  /**
   * Handles changes to the default view mode select.
   */
  const handleDefaultViewModeChange = useCallback(
    (value: string | null): void => {
      if (value === null) return;
      updatePreference("defaultViewMode", value as "table" | "grid");
    },
    [updatePreference],
  );

  /**
   * Handles changes to the default sort-by select.
   */
  const handleDefaultSortByChange = useCallback(
    (value: string | null): void => {
      if (value === null) return;
      updatePreference("defaultSortBy", value);
    },
    [updatePreference],
  );

  /**
   * Handles changes to the page size select.
   */
  const handleDefaultPageSizeChange = useCallback(
    (value: string | null): void => {
      if (value === null) return;
      updatePreference("defaultPageSize", Number.parseInt(value, 10));
    },
    [updatePreference],
  );

  /**
   * Handles changes to the currency select.
   */
  const handleCurrencyChange = useCallback(
    (value: string | null): void => {
      if (value === null) return;
      updatePreference("currency", value);
    },
    [updatePreference],
  );

  /**
   * Handles changes to the show-statistics-on-home checkbox.
   */
  const handleShowStatisticsChange = useCallback(
    (checked: boolean | "indeterminate"): void => {
      updatePreference("showStatisticsOnHome", checked === true);
    },
    [updatePreference],
  );

  // Single sources for both the rendered options and the trigger label lookups.
  const viewModeItems = useMemo(
    () => [
      {value: "table", label: t((m) => m.shared.invoices.preferences.views.table)},
      {value: "grid", label: t((m) => m.shared.invoices.preferences.views.grid)},
    ],
    [t],
  );

  const sortByItems = useMemo(
    () => [
      {value: "dateDesc", label: t((m) => m.shared.invoices.preferences.sortOptions.dateDesc)},
      {value: "dateAsc", label: t((m) => m.shared.invoices.preferences.sortOptions.dateAsc)},
      {value: "amountDesc", label: t((m) => m.shared.invoices.preferences.sortOptions.amountDesc)},
      {value: "amountAsc", label: t((m) => m.shared.invoices.preferences.sortOptions.amountAsc)},
      {value: "nameAsc", label: t((m) => m.shared.invoices.preferences.sortOptions.nameAsc)},
    ],
    [t],
  );

  return (
    <Card className={styles["card"]}>
      <CardHeader>
        <CardTitle className={styles["title"]}>
          <TbSettings
            className={styles["icon"]}
            aria-hidden='true'
          />
          {t((m) => m.shared.invoices.preferences.title)}
        </CardTitle>
      </CardHeader>
      <CardContent className={styles["content"]}>
        <div className={styles["field"]}>
          <Label
            htmlFor='defaultViewMode'
            className={styles["label"]}>
            {t((m) => m.shared.invoices.preferences.defaultView)}
          </Label>
          <Select
            value={preferences.defaultViewMode}
            onValueChange={handleDefaultViewModeChange}
            items={viewModeItems}>
            <SelectTrigger
              id='defaultViewMode'
              className={styles["select"]}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {viewModeItems.map((item) => (
                <SelectItem
                  key={item.value}
                  value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className={styles["field"]}>
          <Label
            htmlFor='defaultSortBy'
            className={styles["label"]}>
            {t((m) => m.shared.invoices.preferences.sortBy)}
          </Label>
          <Select
            value={preferences.defaultSortBy}
            onValueChange={handleDefaultSortByChange}
            items={sortByItems}>
            <SelectTrigger
              id='defaultSortBy'
              className={styles["select"]}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {sortByItems.map((item) => (
                <SelectItem
                  key={item.value}
                  value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className={styles["field"]}>
          <Label
            htmlFor='defaultPageSize'
            className={styles["label"]}>
            {t((m) => m.shared.invoices.preferences.pageSize)}
          </Label>
          <Select
            value={preferences.defaultPageSize.toString()}
            onValueChange={handleDefaultPageSizeChange}
            items={PAGE_SIZE_ITEMS}>
            <SelectTrigger
              id='defaultPageSize'
              className={styles["select"]}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PAGE_SIZE_ITEMS.map((item) => (
                <SelectItem
                  key={item.value}
                  value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className={styles["field"]}>
          <Label
            htmlFor='currency'
            className={styles["label"]}>
            {t((m) => m.shared.invoices.preferences.currency)}
          </Label>
          <Select
            value={preferences.currency}
            onValueChange={handleCurrencyChange}
            items={CURRENCY_ITEMS}>
            <SelectTrigger
              id='currency'
              className={styles["select"]}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CURRENCY_ITEMS.map((item) => (
                <SelectItem
                  key={item.value}
                  value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className={styles["checkboxField"]}>
          <div className={styles["checkboxWrapper"]}>
            <Checkbox
              id='showStatisticsOnHome'
              checked={preferences.showStatisticsOnHome}
              onCheckedChange={handleShowStatisticsChange}
            />
            <Label
              htmlFor='showStatisticsOnHome'
              className={styles["checkboxLabel"]}>
              {t((m) => m.shared.invoices.preferences.showStats)}
            </Label>
          </div>
        </div>

        <Button
          onClick={handleSave}
          className={styles["saveButton"]}>
          {t((m) => m.shared.invoices.preferences.save)}
        </Button>
      </CardContent>
    </Card>
  );
}
