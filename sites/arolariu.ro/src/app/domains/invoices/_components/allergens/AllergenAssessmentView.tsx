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

import type {AllergenAssessment} from "@/types/invoices/Allergen";
import {AllergenAssessmentStatus} from "@/types/invoices/Allergen";
import {selectorFromPath, useTranslations} from "next-intl-selector";
import {TbAlertTriangle, TbQuestionMark} from "react-icons/tb";
import {getAllergenLabelKey} from "./allergenLabels";
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
export function AllergenAssessmentView({assessment}: Props): React.JSX.Element {
  const t = useTranslations();

  if (assessment === null) {
    return (
      <div className={styles["notAssessed"]}>
        <TbQuestionMark className={styles["iconNotAssessed"]} aria-hidden='true' />
        <p className={styles["notAssessedText"]}>{t(selectorFromPath("allergens.view.notAssessed"))}</p>
      </div>
    );
  }

  const statusLabel = t(selectorFromPath(STATUS_KEY[assessment.status]));

  return (
    <div className={styles["container"]}>
      <div
        className={`${styles["statusRow"]} ${styles[`status-${assessment.status}`]}`}
        aria-label={statusLabel}>
        {assessment.status === AllergenAssessmentStatus.Detected && (
          <TbAlertTriangle className={styles["iconDetected"]} aria-hidden='true' />
        )}
        <span className={styles["statusLabel"]}>{statusLabel}</span>
      </div>

      {assessment.status !== AllergenAssessmentStatus.Detected && (
        <p className={styles["statusNote"]}>{t(selectorFromPath(STATUS_NOTE_KEY[assessment.status]))}</p>
      )}

      {assessment.signals.length > 0 && (
        <ul className={styles["signalList"]} role='list'>
          {assessment.signals.map((signal, idx) => {
            const codeLabel = t(selectorFromPath(getAllergenLabelKey(signal.code)));
            return (
              <li key={`${signal.code}-${idx}`} className={styles["signal"]} role='listitem'>
                <div className={styles["signalHeader"]}>
                  <span className={styles["codeLabel"]}>{codeLabel}</span>
                  <span className={styles["evidenceLevel"]}>
                    {t(selectorFromPath("allergens.view.signal.evidenceLevel"))}: {signal.evidenceLevel}
                  </span>
                  <span className={styles["confidence"]}>
                    {t(selectorFromPath("allergens.view.signal.confidence"))}: {Math.round(signal.confidence * 100)}%
                  </span>
                </div>
                {signal.evidence.length > 0 && (
                  <ul className={styles["evidenceList"]} aria-label={t(selectorFromPath("allergens.view.signal.evidenceEntries"))}>
                    {signal.evidence.map((ev, evIdx) => (
                      <li key={evIdx} className={styles["evidenceItem"]}>
                        <span className={styles["evidenceSource"]}>{ev.source}</span>
                        {": "}
                        <span className={styles["evidenceValue"]}>{ev.value}</span>
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
