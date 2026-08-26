/**
 * @fileoverview Read-only badge displaying a persisted StandardClassification.
 * @module app/domains/invoices/_components/classification/ClassificationBadge
 *
 * @remarks
 * Renders the official label, taxonomy code, full hierarchy path (ROOT → LEAF),
 * and an origin indicator that distinguishes AI-analysis results from manual picks.
 *
 * **Domain invariant**: `hierarchy` is guaranteed non-empty and ordered ROOT → LEAF,
 * with the last node matching the selected code.
 *
 * **Rendering context**: Server Component by default — no state or event handlers.
 */

import {useTranslations} from "next-intl-selector";
import {ClassificationOrigin, type StandardClassification} from "@/types/invoices";
import styles from "./ClassificationBadge.module.scss";

/** Props for {@link ClassificationBadge}. */
type Props = {
  /** The persisted classification to display. */
  readonly classification: StandardClassification;
};

/**
 * Read-only badge for a {@link StandardClassification}.
 *
 * @remarks
 * - Shows the official label, code, and full hierarchy path (ROOT → LEAF).
 * - Distinguishes `Analysis` and `Manual` origins with a coloured indicator.
 * - Uses `next-intl-selector` for all user-visible strings.
 *
 * @param props - Component properties.
 * @returns The classification badge element.
 */
export default function ClassificationBadge({classification}: Readonly<Props>): React.JSX.Element {
  const t = useTranslations();

  const isManual = classification.origin === ClassificationOrigin.Manual;

  const hierarchyPath = classification.hierarchy.map((node) => node.officialLabel).join(" → ");

  return (
    <div
      className={styles["badge"]}
      data-origin={classification.origin}>
      {/* ── Header row: label + code + origin chip ── */}
      <div className={styles["header"]}>
        <span className={styles["label"]}>{classification.officialLabel}</span>
        <span className={styles["code"]}>{classification.code}</span>
        <span className={`${styles["origin"] ?? ""} ${isManual ? (styles["originManual"] ?? "") : (styles["originAnalysis"] ?? "")}`}>
          {isManual
            ? t((m) => m.dialogs.invoices.classificationPicker.badge.manualOrigin)
            : t((m) => m.dialogs.invoices.classificationPicker.badge.analysisOrigin)}
        </span>
      </div>

      {/* ── Hierarchy breadcrumb ── */}
      {classification.hierarchy.length > 0 && (
        <div className={styles["hierarchy"]}>
          <span className={styles["hierarchyTitle"]}>{t((m) => m.dialogs.invoices.classificationPicker.badge.hierarchy)}</span>
          <span className={styles["hierarchyPath"]}>{hierarchyPath}</span>
        </div>
      )}
    </div>
  );
}
