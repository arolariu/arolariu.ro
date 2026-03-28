"use client";

/**
 * @fileoverview Invoice-specific preferences and personalization component.
 * Allows users to configure default view mode, sort order, page size, currency, and statistics visibility.
 * @module app/domains/invoices/_components/InvoicePreferences
 */

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
  toast,
  useLocalStorage,
} from "@arolariu/components";
import {useTranslations} from "next-intl";
import {useCallback} from "react";
import {TbSettings} from "react-icons/tb";
import styles from "./InvoicePreferences.module.scss";

/**
 * Invoice display and behavior preferences.
 */
export interface InvoicePreferences {
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
}

/**
 * Default invoice preferences.
 */
const DEFAULT_PREFERENCES: InvoicePreferences = {
  defaultViewMode: "table",
  defaultSortBy: "dateDesc",
  defaultPageSize: 10,
  showStatisticsOnHome: true,
  currency: "RON",
};

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
  const t = useTranslations("Invoices.Shared.preferences");

  const [preferences, setPreferences] = useLocalStorage<InvoicePreferences>("invoice-preferences", DEFAULT_PREFERENCES);

  /**
   * Handles saving preferences with success feedback.
   */
  const handleSave = useCallback(() => {
    // Preferences are already saved via useLocalStorage setter
    toast.success(t("saved"));
  }, [t]);

  /**
   * Updates a single preference field.
   */
  const updatePreference = useCallback(
    <K extends keyof InvoicePreferences>(key: K, value: InvoicePreferences[K]) => {
      setPreferences((prev) => ({...prev, [key]: value}));
    },
    [setPreferences],
  );

  return (
    <Card className={styles["card"]}>
      <CardHeader>
        <CardTitle className={styles["title"]}>
          <TbSettings
            className={styles["icon"]}
            aria-hidden='true'
          />
          {t("title")}
        </CardTitle>
      </CardHeader>
      <CardContent className={styles["content"]}>
        <div className={styles["field"]}>
          <Label
            htmlFor='defaultViewMode'
            className={styles["label"]}>
            {t("defaultView")}
          </Label>
          <Select
            value={preferences.defaultViewMode}
            onValueChange={(value) => updatePreference("defaultViewMode", value as "table" | "grid")}>
            <SelectTrigger
              id='defaultViewMode'
              className={styles["select"]}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='table'>{t("views.table")}</SelectItem>
              <SelectItem value='grid'>{t("views.grid")}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className={styles["field"]}>
          <Label
            htmlFor='defaultSortBy'
            className={styles["label"]}>
            {t("sortBy")}
          </Label>
          <Select
            value={preferences.defaultSortBy}
            onValueChange={(value) => updatePreference("defaultSortBy", value)}>
            <SelectTrigger
              id='defaultSortBy'
              className={styles["select"]}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='dateDesc'>{t("sortOptions.dateDesc")}</SelectItem>
              <SelectItem value='dateAsc'>{t("sortOptions.dateAsc")}</SelectItem>
              <SelectItem value='amountDesc'>{t("sortOptions.amountDesc")}</SelectItem>
              <SelectItem value='amountAsc'>{t("sortOptions.amountAsc")}</SelectItem>
              <SelectItem value='nameAsc'>{t("sortOptions.nameAsc")}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className={styles["field"]}>
          <Label
            htmlFor='defaultPageSize'
            className={styles["label"]}>
            {t("pageSize")}
          </Label>
          <Select
            value={preferences.defaultPageSize.toString()}
            onValueChange={(value) => updatePreference("defaultPageSize", Number.parseInt(value, 10))}>
            <SelectTrigger
              id='defaultPageSize'
              className={styles["select"]}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='5'>5</SelectItem>
              <SelectItem value='10'>10</SelectItem>
              <SelectItem value='20'>20</SelectItem>
              <SelectItem value='50'>50</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className={styles["field"]}>
          <Label
            htmlFor='currency'
            className={styles["label"]}>
            {t("currency")}
          </Label>
          <Select
            value={preferences.currency}
            onValueChange={(value) => updatePreference("currency", value)}>
            <SelectTrigger
              id='currency'
              className={styles["select"]}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='RON'>RON (Lei)</SelectItem>
              <SelectItem value='EUR'>EUR (Euro)</SelectItem>
              <SelectItem value='USD'>USD (Dollar)</SelectItem>
              <SelectItem value='GBP'>GBP (Pound)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className={styles["checkboxField"]}>
          <div className={styles["checkboxWrapper"]}>
            <Checkbox
              id='showStatisticsOnHome'
              checked={preferences.showStatisticsOnHome}
              onCheckedChange={(checked) => updatePreference("showStatisticsOnHome", checked === true)}
            />
            <Label
              htmlFor='showStatisticsOnHome'
              className={styles["checkboxLabel"]}>
              {t("showStats")}
            </Label>
          </div>
        </div>

        <Button
          onClick={handleSave}
          className={styles["saveButton"]}>
          {t("save")}
        </Button>
      </CardContent>
    </Card>
  );
}
