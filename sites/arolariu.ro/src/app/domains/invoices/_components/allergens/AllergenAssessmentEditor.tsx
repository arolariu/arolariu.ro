/**
 * @fileoverview Canonical override editor for a structured EU-14 allergen assessment.
 * @module app/domains/invoices/_components/allergens/AllergenAssessmentEditor
 *
 * @remarks
 * **Invariant safety** — every emitted value satisfies {@link isAllergenAssessment}:
 * - Allergen code is chosen from a dropdown of exactly 14 EU-14 values — never free text.
 * - Evidence level is chosen from a dropdown of exactly 3 defined values.
 * - Confidence is clamped to [0, 1] on every change.
 * - Adding the first signal automatically sets `status` to `"detected"`.
 * - Removing the last signal automatically sets `status` to `"noSignals"` with zero signals.
 *
 * Manual entries are explicitly labelled "User-provided" so they are not confused
 * with analysis-pipeline output.
 */

"use client";

import type {AllergenAssessment, AllergenEvidence, AllergenSignal} from "@/types/invoices/Allergen";
import {AllergenAssessmentStatus, AllergenCode, AllergenEvidenceLevel, isAllergenAssessment} from "@/types/invoices/Allergen";
import {Badge, Button, Input, Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from "@arolariu/components";
import {selectorFromPath, useTranslations} from "next-intl-selector";
import {useCallback, useId, useState} from "react";
import {TbPlus, TbX} from "react-icons/tb";
import {getAllergenLabelKey} from "./allergenLabels";
import styles from "./AllergenAssessmentEditor.module.scss";

/** Props for {@link AllergenAssessmentEditor}. */
type Props = {
  /** Current assessment value. `null` means the product has not been assessed. */
  readonly value: AllergenAssessment | null;
  /** Called whenever the editor produces a valid assessment. */
  readonly onChange: (next: AllergenAssessment) => void;
};

const ALLERGEN_CODES = Object.values(AllergenCode) as AllergenCode[];
const EVIDENCE_LEVELS = Object.values(AllergenEvidenceLevel) as AllergenEvidenceLevel[];

/** Default status when there are no signals. */
const DEFAULT_EMPTY_STATUS = AllergenAssessmentStatus.NoSignals;

/** Clamps a number to [0, 1]. */
function clampConfidence(raw: number): number {
  return Math.min(1, Math.max(0, raw));
}

/** Builds a new empty signal with safe defaults. */
function makeEmptySignal(): AllergenSignal {
  return {
    code: AllergenCode.CerealsContainingGluten,
    evidenceLevel: AllergenEvidenceLevel.Explicit,
    confidence: 1,
    evidence: [],
  };
}

/** Builds an empty evidence entry. */
function makeEmptyEvidence(): AllergenEvidence {
  return {source: "", value: ""};
}

/**
 * Constrained editor for a single EU-14 allergen assessment.
 *
 * @remarks
 * **Rendering Context**: Client Component (`"use client"` directive).
 *
 * The editor never allows free-text allergen names. All codes and evidence
 * levels are constrained to known values. Every `onChange` call is guaranteed
 * to pass `isAllergenAssessment`.
 *
 * @param props - {@link Props}
 * @returns The allergen assessment editor.
 */
export function AllergenAssessmentEditor({value, onChange}: Props): React.JSX.Element {
  const t = useTranslations();
  const baseId = useId();

  const [working, setWorking] = useState<AllergenAssessment>(
    value ?? {status: DEFAULT_EMPTY_STATUS, signals: []},
  );

  /** Emit only valid assessments. Guards are belt-and-suspenders. */
  const emit = useCallback(
    (next: AllergenAssessment) => {
      if (isAllergenAssessment(next)) {
        setWorking(next);
        onChange(next);
      }
    },
    [onChange],
  );

  /** Updates the non-detected status (only valid when signals are empty). */
  const handleStatusChange = useCallback(
    (status: string) => {
      if (status === AllergenAssessmentStatus.NoSignals || status === AllergenAssessmentStatus.InsufficientData) {
        emit({status, signals: []});
      }
    },
    [emit],
  );

  /** Adds a new signal with defaults, flipping status to "detected" if first. */
  const handleAddSignal = useCallback(() => {
    const newSignal = makeEmptySignal();
    const nextSignals = [...working.signals, newSignal];
    emit({status: AllergenAssessmentStatus.Detected, signals: nextSignals});
  }, [working, emit]);

  /** Removes a signal by index. If last signal, reverts status to noSignals. */
  const handleRemoveSignal = useCallback(
    (idx: number) => {
      const nextSignals = working.signals.filter((_, i) => i !== idx);
      const nextStatus = nextSignals.length === 0 ? DEFAULT_EMPTY_STATUS : AllergenAssessmentStatus.Detected;
      emit({status: nextStatus, signals: nextSignals});
    },
    [working, emit],
  );

  /** Updates a specific field of a specific signal. */
  const handleSignalChange = useCallback(
    <K extends keyof AllergenSignal>(signalIdx: number, field: K, raw: AllergenSignal[K]) => {
      const value_ = field === "confidence" ? (clampConfidence(raw as number) as AllergenSignal[K]) : raw;
      const nextSignals = working.signals.map((s, i) =>
        i === signalIdx ? {...s, [field]: value_} : s,
      );
      emit({status: AllergenAssessmentStatus.Detected, signals: nextSignals});
    },
    [working, emit],
  );

  /** Adds an evidence entry to a specific signal. */
  const handleAddEvidence = useCallback(
    (signalIdx: number) => {
      const nextSignals = working.signals.map((s, i) =>
        i === signalIdx ? {...s, evidence: [...s.evidence, makeEmptyEvidence()]} : s,
      );
      emit({status: AllergenAssessmentStatus.Detected, signals: nextSignals});
    },
    [working, emit],
  );

  /** Removes an evidence entry. */
  const handleRemoveEvidence = useCallback(
    (signalIdx: number, evIdx: number) => {
      const nextSignals = working.signals.map((s, i) =>
        i === signalIdx ? {...s, evidence: s.evidence.filter((_, ei) => ei !== evIdx)} : s,
      );
      emit({status: AllergenAssessmentStatus.Detected, signals: nextSignals});
    },
    [working, emit],
  );

  /** Updates a specific field of a specific evidence entry. */
  const handleEvidenceChange = useCallback(
    (signalIdx: number, evIdx: number, field: keyof AllergenEvidence, value_: string) => {
      const nextSignals = working.signals.map((s, i) => {
        if (i !== signalIdx) return s;
        const nextEvidence = s.evidence.map((ev, ei) =>
          ei === evIdx ? {...ev, [field]: value_} : ev,
        );
        return {...s, evidence: nextEvidence};
      });
      emit({status: AllergenAssessmentStatus.Detected, signals: nextSignals});
    },
    [working, emit],
  );

  const hasSignals = working.signals.length > 0;

  return (
    <div className={styles["container"]}>
      {/* Status selector — only editable when there are no signals */}
      {!hasSignals && (
        <div className={styles["statusSection"]}>
          <Label
            htmlFor={`${baseId}-status`}
            className={styles["fieldLabel"]}>
            {t(selectorFromPath("allergens.editor.status.label"))}
          </Label>
          <Select
            value={working.status}
            onValueChange={handleStatusChange}>
            <SelectTrigger
              id={`${baseId}-status`}
              className={styles["selectTrigger"]}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={AllergenAssessmentStatus.NoSignals}>
                {t(selectorFromPath("allergens.editor.status.noSignals"))}
              </SelectItem>
              <SelectItem value={AllergenAssessmentStatus.InsufficientData}>
                {t(selectorFromPath("allergens.editor.status.insufficientData"))}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Signals list */}
      <div className={styles["signalsSection"]}>
        <div className={styles["signalsHeader"]}>
          <span className={styles["signalsTitle"]}>
            {t(selectorFromPath("allergens.editor.signals.title"))}
          </span>
          <Button
            type='button'
            variant='outline'
            size='sm'
            onClick={handleAddSignal}
            className={styles["addSignalBtn"]}>
            <TbPlus className={styles["icon"]} aria-hidden='true' />
            {t(selectorFromPath("allergens.editor.signals.addSignal"))}
          </Button>
        </div>

        {!hasSignals && (
          <p className={styles["emptySignals"]}>{t(selectorFromPath("allergens.editor.signals.empty"))}</p>
        )}

        {working.signals.map((signal, sIdx) => (
          <div
            key={sIdx}
            className={styles["signal"]}
            aria-label={t(selectorFromPath("allergens.editor.signals.userProvided"))}>
            <div className={styles["signalTopRow"]}>
              {/* User-provided badge */}
              <Badge
                variant='outline'
                className={styles["userProvidedBadge"]}>
                {t(selectorFromPath("allergens.editor.signals.userProvided"))}
              </Badge>
              <Button
                type='button'
                variant='ghost'
                size='sm'
                onClick={() => handleRemoveSignal(sIdx)}
                aria-label={t(selectorFromPath("allergens.editor.signals.removeSignal"))}
                className={styles["removeSignalBtn"]}>
                <TbX className={styles["icon"]} aria-hidden='true' />
              </Button>
            </div>

            <div className={styles["signalFields"]}>
              {/* Code selector — exactly 14 options, never free text */}
              <div className={styles["field"]}>
                <Label
                  htmlFor={`${baseId}-signal-${sIdx}-code`}
                  className={styles["fieldLabel"]}>
                  {t(selectorFromPath("allergens.editor.signals.code"))}
                </Label>
                <Select
                  value={signal.code}
                  onValueChange={(v) => handleSignalChange(sIdx, "code", v as AllergenCode)}>
                  <SelectTrigger
                    id={`${baseId}-signal-${sIdx}-code`}
                    className={styles["selectTrigger"]}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ALLERGEN_CODES.map((code) => (
                      <SelectItem
                        key={code}
                        value={code}>
                        {t(selectorFromPath(getAllergenLabelKey(code)))}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Evidence level selector — exactly 3 options */}
              <div className={styles["field"]}>
                <Label
                  htmlFor={`${baseId}-signal-${sIdx}-level`}
                  className={styles["fieldLabel"]}>
                  {t(selectorFromPath("allergens.editor.signals.evidenceLevel"))}
                </Label>
                <Select
                  value={signal.evidenceLevel}
                  onValueChange={(v) => handleSignalChange(sIdx, "evidenceLevel", v as AllergenEvidenceLevel)}>
                  <SelectTrigger
                    id={`${baseId}-signal-${sIdx}-level`}
                    className={styles["selectTrigger"]}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {EVIDENCE_LEVELS.map((level) => (
                      <SelectItem
                        key={level}
                        value={level}>
                        {level}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Confidence input — clamped to [0, 1] */}
              <div className={styles["field"]}>
                <Label
                  htmlFor={`${baseId}-signal-${sIdx}-confidence`}
                  className={styles["fieldLabel"]}>
                  {t(selectorFromPath("allergens.editor.signals.confidence"))}
                </Label>
                <Input
                  id={`${baseId}-signal-${sIdx}-confidence`}
                  type='number'
                  min={0}
                  max={1}
                  step={0.01}
                  value={signal.confidence}
                  onChange={(e) => handleSignalChange(sIdx, "confidence", clampConfidence(parseFloat(e.target.value) || 0))}
                  className={styles["confidenceInput"]}
                />
              </div>
            </div>

            {/* Evidence entries */}
            <div className={styles["evidenceSection"]}>
              <div className={styles["evidenceHeader"]}>
                <span className={styles["evidenceTitle"]}>
                  {t(selectorFromPath("allergens.view.signal.evidenceEntries"))}
                </span>
                <Button
                  type='button'
                  variant='ghost'
                  size='sm'
                  onClick={() => handleAddEvidence(sIdx)}
                  className={styles["addEvidenceBtn"]}>
                  <TbPlus className={styles["icon"]} aria-hidden='true' />
                  {t(selectorFromPath("allergens.editor.signals.addEvidence"))}
                </Button>
              </div>
              {signal.evidence.map((ev, evIdx) => (
                <div
                  key={evIdx}
                  className={styles["evidenceRow"]}>
                  <Input
                    type='text'
                    placeholder={t(selectorFromPath("allergens.editor.signals.evidenceSource"))}
                    value={ev.source}
                    onChange={(e) => handleEvidenceChange(sIdx, evIdx, "source", e.target.value)}
                    className={styles["evidenceInput"]}
                  />
                  <Input
                    type='text'
                    placeholder={t(selectorFromPath("allergens.editor.signals.evidenceValue"))}
                    value={ev.value}
                    onChange={(e) => handleEvidenceChange(sIdx, evIdx, "value", e.target.value)}
                    className={styles["evidenceInput"]}
                  />
                  <Button
                    type='button'
                    variant='ghost'
                    size='sm'
                    onClick={() => handleRemoveEvidence(sIdx, evIdx)}
                    aria-label={t(selectorFromPath("allergens.editor.signals.removeEvidence"))}
                    className={styles["removeEvidenceBtn"]}>
                    <TbX className={styles["icon"]} aria-hidden='true' />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
