/**
 * @fileoverview Read-only view component for a structured EU-14 allergen assessment.
 * @module app/domains/invoices/_components/allergens/AllergenAssessmentView
 *
 * @remarks
 * **Safety contract** (food allergen data):
 * - `status: "noSignals"` means the pipeline ran and found no evidence. It does **NOT**
 *   certify the product is free of the allergen. This component never renders reassurance.
 * - `status: "insufficientData"` is a distinct outcome; it renders differently from `noSignals`.
 * - `assessment: null` means the product was **never assessed**; it renders a neutral
 *   "not assessed" state, never conflated with `noSignals`.
 */

"use client";

import {
  AllergenAssessmentStatus,
  getAllergenEvidenceLevelLabelKey,
  getAllergenLabelKey,
  type AllergenAssessment,
} from "@/types/invoices/Allergen";
import {selectorFromPath, useTranslations} from "next-intl-selector";
import {TbAlertTriangle, TbQuestionMark} from "react-icons/tb";
import styles from "./AllergenAssessmentView.module.scss";

/** Props for {@link AllergenAssessmentView}. */
type Props = {
  /** The assessment to display, or `null` when the product was never assessed. */
  readonly assessment: AllergenAssessment | null;
};

const STATUS_KEY = {
  [AllergenAssessmentStatus.Detected]: "allergens.view.status.detected",
  [AllergenAssessmentStatus.NoSignals]: "allergens.view.status.noSignals",
  [AllergenAssessmentStatus.InsufficientData]: "allergens.view.status.insufficientData",
} as const satisfies Record<AllergenAssessmentStatus, string>;

const STATUS_NOTE_KEY = {
  [AllergenAssessmentStatus.NoSignals]: "allergens.view.statusNote.noSignals",
  [AllergenAssessmentStatus.InsufficientData]: "allergens.view.statusNote.insufficientData",
} as const;

type KeyedValue<T> = Readonly<{
  key: string;
  value: T;
}>;

/** Assigns deterministic unique keys, including when multiple values have identical content. */
function withUniqueKeys<T>(values: readonly T[], getBaseKey: (value: T) => string): readonly KeyedValue<T>[] {
  const occurrences = new Map<string, number>();

  return values.map((value) => {
    const baseKey = getBaseKey(value);
    const occurrence = occurrences.get(baseKey) ?? 0;
    occurrences.set(baseKey, occurrence + 1);
    return {key: `${baseKey}-${occurrence}`, value};
  });
}

/**
 * Renders a read-only view of an EU-14 allergen assessment.
 *
 * @remarks
 * **Rendering Context**: Client Component (`"use client"` directive).
 *
 * When `assessment` is `null` the component renders a neutral "not assessed" notice.
 * When `status` is `noSignals` or `insufficientData` it renders a non-reassuring note.
 * When `status` is `detected` it renders all signals with label, evidence level,
 * confidence percentage, and evidence entries.
 *
 * @param props - {@link Props}
 * @returns A read-only allergen assessment display.
 */
export function AllergenAssessmentView({assessment}: Readonly<Props>): React.JSX.Element {
  const t = useTranslations();

  if (assessment === null) {
    return (
      <div className={styles["notAssessed"]}>
        <TbQuestionMark
          className={styles["iconNotAssessed"]}
          aria-hidden='true'
        />
        <p className={styles["notAssessedText"]}>{t(selectorFromPath("allergens.view.notAssessed"))}</p>
      </div>
    );
  }

  const statusLabel = t(selectorFromPath(STATUS_KEY[assessment.status]));
  const statusClassName = styles[`status-${assessment.status}`];
  const signalRows = withUniqueKeys(
    assessment.signals,
    (signal) =>
      `${signal.code}-${signal.evidenceLevel}-${signal.confidence}-${signal.evidence
        .map((evidence) => `${evidence.source}:${evidence.value}`)
        .join("|")}`,
  );

  return (
    <div className={styles["container"]}>
      <div
        className={`${styles["statusRow"]} ${statusClassName}`}
        aria-label={statusLabel}>
        {assessment.status === AllergenAssessmentStatus.Detected && (
          <TbAlertTriangle
            className={styles["iconDetected"]}
            aria-hidden='true'
          />
        )}
        <span className={styles["statusLabel"]}>{statusLabel}</span>
      </div>

      {assessment.status !== AllergenAssessmentStatus.Detected && (
        <p className={styles["statusNote"]}>{t(selectorFromPath(STATUS_NOTE_KEY[assessment.status]))}</p>
      )}

      {assessment.signals.length > 0 && (
        <ul className={styles["signalList"]}>
          {signalRows.map(({key, value: signal}) => {
            const codeLabel = t(selectorFromPath(getAllergenLabelKey(signal.code)));
            const evidenceRows = withUniqueKeys(signal.evidence, (evidence) => `${evidence.source}:${evidence.value}`);
            return (
              <li
                key={key}
                className={styles["signal"]}>
                <div className={styles["signalHeader"]}>
                  <span className={styles["codeLabel"]}>{codeLabel}</span>
                  <span className={styles["evidenceLevel"]}>
                    {t(selectorFromPath("allergens.view.signal.evidenceLevel"))}:{" "}
                    {t(selectorFromPath(getAllergenEvidenceLevelLabelKey(signal.evidenceLevel)))}
                  </span>
                  <span className={styles["confidence"]}>
                    {t(selectorFromPath("allergens.view.signal.confidence"))}: {Math.round(signal.confidence * 100)}%
                  </span>
                </div>
                {signal.evidence.length > 0 && (
                  <ul
                    className={styles["evidenceList"]}
                    aria-label={t(selectorFromPath("allergens.view.signal.evidenceEntries"))}>
                    {evidenceRows.map(({key: evidenceKey, value: evidence}) => (
                      <li
                        key={evidenceKey}
                        className={styles["evidenceItem"]}>
                        <span className={styles["evidenceSource"]}>{evidence.source}</span>
                        {": "}
                        <span className={styles["evidenceValue"]}>{evidence.value}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
