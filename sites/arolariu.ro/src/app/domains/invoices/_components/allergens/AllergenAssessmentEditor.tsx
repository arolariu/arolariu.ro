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

import {
  AllergenAssessmentStatus,
  AllergenCode,
  AllergenEvidenceLevel,
  getAllergenEvidenceLevelLabelKey,
  getAllergenLabelKey,
  isAllergenAssessment,
  type AllergenAssessment,
  type AllergenCode as AllergenCodeType,
  type AllergenEvidence,
  type AllergenEvidenceLevel as AllergenEvidenceLevelType,
  type AllergenSignal,
} from "@/types/invoices/Allergen";
import {Badge, Button, Input, Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from "@arolariu/components";
import {selectorFromPath, useTranslations} from "next-intl-selector";
import {useCallback, useId, useRef, useState, type ChangeEvent} from "react";
import {TbPlus, TbX} from "react-icons/tb";
import styles from "./AllergenAssessmentEditor.module.scss";

/** Props for {@link AllergenAssessmentEditor}. */
type Props = {
  /** Current assessment value. `null` means the product has not been assessed. */
  readonly value: AllergenAssessment | null;
  /** Called whenever the editor produces a valid assessment. */
  readonly onChange: (next: AllergenAssessment) => void;
  /** Reports whether the currently visible draft can be persisted. */
  readonly onValidityChange?: (isValid: boolean) => void;
};

const ALLERGEN_CODES: readonly AllergenCodeType[] = Object.values(AllergenCode);
const EVIDENCE_LEVELS: readonly AllergenEvidenceLevelType[] = Object.values(AllergenEvidenceLevel);

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

/** Resolves an allergen code emitted by the constrained code selector. */
function resolveAllergenCode(value: string): AllergenCodeType {
  const code = ALLERGEN_CODES.find((candidate) => candidate === value);
  if (code === undefined) throw new Error(`Unsupported allergen code: ${value}`);
  return code;
}

/** Resolves an evidence level emitted by the constrained level selector. */
function resolveEvidenceLevel(value: string): AllergenEvidenceLevelType {
  const level = EVIDENCE_LEVELS.find((candidate) => candidate === value);
  if (level === undefined) throw new Error(`Unsupported allergen evidence level: ${value}`);
  return level;
}

/** Returns the row identifier at an expected index or surfaces an internal invariant failure. */
function requireRowId(ids: readonly string[], index: number, rowKind: string): string {
  const id = ids[index];
  if (id === undefined) throw new Error(`Missing ${rowKind} row identifier at index ${index}`);
  return id;
}

/** Reads a non-negative row index from an element data attribute. */
function readRowIndex(element: HTMLElement, attribute: "signalIndex" | "evidenceIndex"): number {
  const rawIndex = element.dataset[attribute];
  const index = rawIndex === undefined ? Number.NaN : Number.parseInt(rawIndex, 10);
  if (!Number.isSafeInteger(index) || index < 0) throw new Error(`Invalid ${attribute}: ${rawIndex ?? "missing"}`);
  return index;
}

/** Removes one evidence-row identifier while preserving all other signal rows. */
function removeEvidenceRowId(current: readonly string[][], signalIndex: number, evidenceIndex: number): string[][] {
  if (current[signalIndex] === undefined) throw new Error(`Missing evidence identifiers for signal index ${signalIndex}`);

  return current.map((ids, index) => (index === signalIndex ? ids.filter((_id, candidateIndex) => candidateIndex !== evidenceIndex) : ids));
}

type SignalFieldProps = Readonly<{
  signal: AllergenSignal;
  signalId: string;
  signalIndex: number;
  onChange: (signalIndex: number, updates: Partial<AllergenSignal>) => void;
}>;

/** Renders the constrained EU-14 allergen code selector for one signal. */
function AllergenCodeField({signal, signalId, signalIndex, onChange}: SignalFieldProps): React.JSX.Element {
  const t = useTranslations();
  const handleValueChange = useCallback(
    (rawCode: string): void => {
      onChange(signalIndex, {code: resolveAllergenCode(rawCode)});
    },
    [onChange, signalIndex],
  );

  return (
    <div className={styles["field"]}>
      <Label
        htmlFor={`${signalId}-code`}
        className={styles["fieldLabel"]}>
        {t(selectorFromPath("allergens.editor.signals.code"))}
      </Label>
      <Select
        value={signal.code}
        onValueChange={handleValueChange}>
        <SelectTrigger
          id={`${signalId}-code`}
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
  );
}

/** Renders the constrained evidence-level selector for one signal. */
function EvidenceLevelField({signal, signalId, signalIndex, onChange}: SignalFieldProps): React.JSX.Element {
  const t = useTranslations();
  const handleValueChange = useCallback(
    (rawLevel: string): void => {
      onChange(signalIndex, {evidenceLevel: resolveEvidenceLevel(rawLevel)});
    },
    [onChange, signalIndex],
  );

  return (
    <div className={styles["field"]}>
      <Label
        htmlFor={`${signalId}-level`}
        className={styles["fieldLabel"]}>
        {t(selectorFromPath("allergens.editor.signals.evidenceLevel"))}
      </Label>
      <Select
        value={signal.evidenceLevel}
        onValueChange={handleValueChange}>
        <SelectTrigger
          id={`${signalId}-level`}
          className={styles["selectTrigger"]}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {EVIDENCE_LEVELS.map((level) => (
            <SelectItem
              key={level}
              value={level}>
              {t(selectorFromPath(getAllergenEvidenceLevelLabelKey(level)))}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
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
export function AllergenAssessmentEditor({value, onChange, onValidityChange}: Readonly<Props>): React.JSX.Element {
  const t = useTranslations();
  const baseId = useId();

  const [working, setWorking] = useState<AllergenAssessment>(value ?? {status: DEFAULT_EMPTY_STATUS, signals: []});
  const nextRowIdRef = useRef(0);
  const [signalIds, setSignalIds] = useState<string[]>(working.signals.map((_signal, index) => `${baseId}-signal-initial-${index}`));
  const [evidenceIds, setEvidenceIds] = useState<string[][]>(
    working.signals.map((signal, signalIndex) =>
      signal.evidence.map((_evidence, evidenceIndex) => `${baseId}-evidence-initial-${signalIndex}-${evidenceIndex}`),
    ),
  );

  /** Creates a stable identifier for a newly added editor row. */
  const createRowId = useCallback(
    (rowKind: "signal" | "evidence"): string => {
      nextRowIdRef.current += 1;
      return `${baseId}-${rowKind}-${nextRowIdRef.current}`;
    },
    [baseId],
  );

  /** Keeps incomplete form rows locally and emits only complete domain values. */
  const updateWorking = useCallback(
    (next: AllergenAssessment) => {
      setWorking(next);
      const isValid = isAllergenAssessment(next);
      onValidityChange?.(isValid);
      if (isValid) {
        onChange(next);
      }
    },
    [onChange, onValidityChange],
  );

  /** Updates the non-detected status (only valid when signals are empty). */
  const handleStatusChange = useCallback(
    (status: string) => {
      if (status === AllergenAssessmentStatus.NoSignals || status === AllergenAssessmentStatus.InsufficientData) {
        updateWorking({status, signals: []});
      }
    },
    [updateWorking],
  );

  /** Adds a new signal with defaults, flipping status to "detected" if first. */
  const handleAddSignal = useCallback(() => {
    const newSignal = makeEmptySignal();
    const signalId = createRowId("signal");
    const nextSignals = [...working.signals, newSignal];
    setSignalIds((current) => [...current, signalId]);
    setEvidenceIds((current) => [...current, []]);
    updateWorking({status: AllergenAssessmentStatus.Detected, signals: nextSignals});
  }, [createRowId, working, updateWorking]);

  /** Removes a signal by index. If last signal, reverts status to noSignals. */
  const handleRemoveSignal = useCallback(
    (idx: number) => {
      const nextSignals = working.signals.filter((_, i) => i !== idx);
      const nextStatus = nextSignals.length === 0 ? DEFAULT_EMPTY_STATUS : AllergenAssessmentStatus.Detected;
      setSignalIds((current) => current.filter((_id, index) => index !== idx));
      setEvidenceIds((current) => current.filter((_ids, index) => index !== idx));
      updateWorking({status: nextStatus, signals: nextSignals});
    },
    [working, updateWorking],
  );

  /** Updates a specific field of a specific signal. */
  const handleSignalChange = useCallback(
    (signalIdx: number, updates: Partial<AllergenSignal>) => {
      const nextSignals = working.signals.map((signal, index) => (index === signalIdx ? {...signal, ...updates} : signal));
      updateWorking({status: AllergenAssessmentStatus.Detected, signals: nextSignals});
    },
    [working, updateWorking],
  );

  /** Adds an evidence entry to a specific signal. */
  const handleAddEvidence = useCallback(
    (signalIdx: number) => {
      const evidenceId = createRowId("evidence");
      const nextSignals = working.signals.map((s, i) => (i === signalIdx ? {...s, evidence: [...s.evidence, makeEmptyEvidence()]} : s));
      setEvidenceIds((current) => {
        if (current[signalIdx] === undefined) throw new Error(`Missing evidence identifiers for signal index ${signalIdx}`);
        return current.map((ids, index) => (index === signalIdx ? [...ids, evidenceId] : ids));
      });
      updateWorking({status: AllergenAssessmentStatus.Detected, signals: nextSignals});
    },
    [createRowId, working, updateWorking],
  );

  /** Removes an evidence entry. */
  const handleRemoveEvidence = useCallback(
    (signalIdx: number, evIdx: number) => {
      const nextSignals = working.signals.map((s, i) =>
        i === signalIdx ? {...s, evidence: s.evidence.filter((_, ei) => ei !== evIdx)} : s,
      );
      setEvidenceIds((current) => removeEvidenceRowId(current, signalIdx, evIdx));
      updateWorking({status: AllergenAssessmentStatus.Detected, signals: nextSignals});
    },
    [working, updateWorking],
  );

  /** Updates a specific field of a specific evidence entry. */
  const handleEvidenceChange = useCallback(
    (signalIdx: number, evIdx: number, field: keyof AllergenEvidence, value_: string) => {
      const nextSignals = working.signals.map((s, i) => {
        if (i !== signalIdx) return s;
        const nextEvidence = s.evidence.map((ev, ei) => (ei === evIdx ? {...ev, [field]: value_} : ev));
        return {...s, evidence: nextEvidence};
      });
      updateWorking({status: AllergenAssessmentStatus.Detected, signals: nextSignals});
    },
    [working, updateWorking],
  );

  const handleRemoveSignalClick = useCallback(
    (event: React.MouseEvent<HTMLButtonElement>): void => {
      handleRemoveSignal(readRowIndex(event.currentTarget, "signalIndex"));
    },
    [handleRemoveSignal],
  );

  const handleConfidenceChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>): void => {
      const signalIndex = readRowIndex(event.currentTarget, "signalIndex");
      const confidence = clampConfidence(Number.parseFloat(event.currentTarget.value) || 0);
      handleSignalChange(signalIndex, {confidence});
    },
    [handleSignalChange],
  );

  const handleAddEvidenceClick = useCallback(
    (event: React.MouseEvent<HTMLButtonElement>): void => {
      handleAddEvidence(readRowIndex(event.currentTarget, "signalIndex"));
    },
    [handleAddEvidence],
  );

  const handleEvidenceInputChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>): void => {
      const signalIndex = readRowIndex(event.currentTarget, "signalIndex");
      const evidenceIndex = readRowIndex(event.currentTarget, "evidenceIndex");
      const field = event.currentTarget.dataset["evidenceField"];
      if (field !== "source" && field !== "value") throw new Error(`Invalid evidence field: ${field ?? "missing"}`);
      handleEvidenceChange(signalIndex, evidenceIndex, field, event.currentTarget.value);
    },
    [handleEvidenceChange],
  );

  const handleRemoveEvidenceClick = useCallback(
    (event: React.MouseEvent<HTMLButtonElement>): void => {
      const signalIndex = readRowIndex(event.currentTarget, "signalIndex");
      const evidenceIndex = readRowIndex(event.currentTarget, "evidenceIndex");
      handleRemoveEvidence(signalIndex, evidenceIndex);
    },
    [handleRemoveEvidence],
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
              <SelectItem value={AllergenAssessmentStatus.NoSignals}>{t(selectorFromPath("allergens.editor.status.noSignals"))}</SelectItem>
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
          <span className={styles["signalsTitle"]}>{t(selectorFromPath("allergens.editor.signals.title"))}</span>
          <Button
            type='button'
            variant='outline'
            size='sm'
            onClick={handleAddSignal}
            className={styles["addSignalBtn"]}>
            <TbPlus
              className={styles["icon"]}
              aria-hidden='true'
            />
            {t(selectorFromPath("allergens.editor.signals.addSignal"))}
          </Button>
        </div>

        {!hasSignals && <p className={styles["emptySignals"]}>{t(selectorFromPath("allergens.editor.signals.empty"))}</p>}

        {working.signals.map((signal, signalIndex) => {
          const signalId = requireRowId(signalIds, signalIndex, "signal");
          const signalEvidenceIds = evidenceIds[signalIndex];
          if (signalEvidenceIds === undefined) {
            throw new Error(`Missing evidence identifiers for signal index ${signalIndex}`);
          }

          return (
            <div
              key={signalId}
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
                  data-signal-index={signalIndex}
                  onClick={handleRemoveSignalClick}
                  aria-label={t(selectorFromPath("allergens.editor.signals.removeSignal"))}
                  className={styles["removeSignalBtn"]}>
                  <TbX
                    className={styles["icon"]}
                    aria-hidden='true'
                  />
                </Button>
              </div>

              <div className={styles["signalFields"]}>
                <AllergenCodeField
                  signal={signal}
                  signalId={signalId}
                  signalIndex={signalIndex}
                  onChange={handleSignalChange}
                />
                <EvidenceLevelField
                  signal={signal}
                  signalId={signalId}
                  signalIndex={signalIndex}
                  onChange={handleSignalChange}
                />

                {/* Confidence input — clamped to [0, 1] */}
                <div className={styles["field"]}>
                  <Label
                    htmlFor={`${signalId}-confidence`}
                    className={styles["fieldLabel"]}>
                    {t(selectorFromPath("allergens.editor.signals.confidence"))}
                  </Label>
                  <Input
                    id={`${signalId}-confidence`}
                    type='number'
                    min={0}
                    max={1}
                    step={0.01}
                    value={signal.confidence}
                    data-signal-index={signalIndex}
                    onChange={handleConfidenceChange}
                    className={styles["confidenceInput"]}
                  />
                </div>
              </div>

              {/* Evidence entries */}
              <div className={styles["evidenceSection"]}>
                <div className={styles["evidenceHeader"]}>
                  <span className={styles["evidenceTitle"]}>{t(selectorFromPath("allergens.view.signal.evidenceEntries"))}</span>
                  <Button
                    type='button'
                    variant='ghost'
                    size='sm'
                    data-signal-index={signalIndex}
                    onClick={handleAddEvidenceClick}
                    className={styles["addEvidenceBtn"]}>
                    <TbPlus
                      className={styles["icon"]}
                      aria-hidden='true'
                    />
                    {t(selectorFromPath("allergens.editor.signals.addEvidence"))}
                  </Button>
                </div>
                {signal.evidence.map((evidence, evidenceIndex) => {
                  const evidenceId = requireRowId(signalEvidenceIds, evidenceIndex, "evidence");

                  return (
                    <div
                      key={evidenceId}
                      className={styles["evidenceRow"]}>
                      <Input
                        type='text'
                        placeholder={t(selectorFromPath("allergens.editor.signals.evidenceSource"))}
                        value={evidence.source}
                        data-signal-index={signalIndex}
                        data-evidence-index={evidenceIndex}
                        data-evidence-field='source'
                        onChange={handleEvidenceInputChange}
                        className={styles["evidenceInput"]}
                      />
                      <Input
                        type='text'
                        placeholder={t(selectorFromPath("allergens.editor.signals.evidenceValue"))}
                        value={evidence.value}
                        data-signal-index={signalIndex}
                        data-evidence-index={evidenceIndex}
                        data-evidence-field='value'
                        onChange={handleEvidenceInputChange}
                        className={styles["evidenceInput"]}
                      />
                      <Button
                        type='button'
                        variant='ghost'
                        size='sm'
                        data-signal-index={signalIndex}
                        data-evidence-index={evidenceIndex}
                        onClick={handleRemoveEvidenceClick}
                        aria-label={t(selectorFromPath("allergens.editor.signals.removeEvidence"))}
                        className={styles["removeEvidenceBtn"]}>
                        <TbX
                          className={styles["icon"]}
                          aria-hidden='true'
                        />
                      </Button>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
