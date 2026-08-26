"use client";

/**
 * @fileoverview Reusable controls for configuring invoice analysis capabilities.
 * @module app/domains/invoices/_components/analysis/InvoiceAnalysisControls
 *
 * @remarks
 * Renders profile radio buttons and per-capability checkboxes for invoice analysis
 * configuration. All dependency rules are enforced via `applyInvoiceDependencyClosure`
 * before emitting; the last remaining enabled capability cannot be unchecked.
 *
 * **Rendering Context**: Client Component (`"use client"` directive) — uses callbacks
 * and local state.
 */

import {useTranslations} from "next-intl-selector";
import {useCallback, useState, type ChangeEvent} from "react";
import {
  INVOICE_CAPABILITY_KEYS,
  applyInvoiceDependencyClosure,
  resolveAnalysisCapabilities,
  type AnalysisProfile,
  type InvoiceAnalysisCapabilities,
} from "@/types/invoices/Analysis";
import styles from "./InvoiceAnalysisControls.module.scss";

/** Props for {@link InvoiceAnalysisControls}. */
type Props = {
  /** Currently selected analysis profile. */
  readonly profile: AnalysisProfile;
  /** Current capability set (controlled). */
  readonly value: InvoiceAnalysisCapabilities;
  /**
   * When `true`, enabling `invoiceClassification` will prompt an inline
   * alert warning that manual classifications will be overwritten.
   */
  readonly manualClassificationPresent?: boolean;
  /**
   * Called when the profile or any capability changes.
   *
   * @param profile - The active requestable profile (never `"custom"`).
   * @param capabilities - The updated capabilities after dependency closure.
   */
  readonly onChange: (profile: AnalysisProfile, capabilities: InvoiceAnalysisCapabilities) => void;
  /** When `true`, all controls are disabled. */
  readonly disabled?: boolean;
};

/** Profile values in stable order for rendering. */
const PROFILES = ["fast", "balanced", "comprehensive"] as const satisfies readonly AnalysisProfile[];

/** Number of enabled boolean capabilities in the given set. */
function countEnabled(value: InvoiceAnalysisCapabilities): number {
  return INVOICE_CAPABILITY_KEYS.filter((key) => value[key]).length;
}

/** Returns `true` when `value` matches the preset for `profile`. */
function matchesPreset(profile: AnalysisProfile, value: InvoiceAnalysisCapabilities): boolean {
  const preset = resolveAnalysisCapabilities("invoice", profile);
  return INVOICE_CAPABILITY_KEYS.every((key) => value[key] === preset[key]) && value.maximumRecipes === preset.maximumRecipes;
}

/** Resolves a profile value emitted by one of the rendered radio inputs. */
function resolveProfile(value: string): AnalysisProfile {
  const profile = PROFILES.find((candidate) => candidate === value);
  if (profile === undefined) throw new Error(`Unsupported invoice analysis profile: ${value}`);
  return profile;
}

/** Resolves a capability value emitted by one of the rendered checkbox inputs. */
function resolveCapability(value: string): (typeof INVOICE_CAPABILITY_KEYS)[number] {
  const capability = INVOICE_CAPABILITY_KEYS.find((candidate) => candidate === value);
  if (capability === undefined) throw new Error(`Unsupported invoice analysis capability: ${value}`);
  return capability;
}

/**
 * Renders profile radio buttons and per-capability checkboxes for invoice analysis.
 *
 * @remarks
 * - Iterates {@link INVOICE_CAPABILITY_KEYS} — no second hard-coded list.
 * - Runs every capability edit through {@link applyInvoiceDependencyClosure}.
 * - "Custom" is a UI-only label; the emitted `profile` is always one of the three
 *   requestable values.
 * - Disables a capability checkbox when unchecking it would leave zero enabled.
 *
 * @param props - Component properties.
 * @returns The capability controls section.
 */
export default function InvoiceAnalysisControls({
  profile,
  value,
  manualClassificationPresent = false,
  onChange,
  disabled = false,
}: Readonly<Props>): React.JSX.Element {
  const t = useTranslations();
  const [showOverwriteAlert, setShowOverwriteAlert] = useState(false);

  const isCustom = !matchesPreset(profile, value);
  const enabledCount = countEnabled(value);

  /** Handles profile radio change — always emits the preset shape. */
  const handleProfileChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const newProfile = resolveProfile(event.currentTarget.value);
      setShowOverwriteAlert(false);
      onChange(newProfile, resolveAnalysisCapabilities("invoice", newProfile));
    },
    [onChange],
  );

  /** Handles a single boolean capability toggle. */
  const handleCapabilityChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const key = resolveCapability(event.currentTarget.value);
      const {checked} = event.currentTarget;
      if (key === "invoiceClassification" && checked && manualClassificationPresent) {
        setShowOverwriteAlert(true);
      } else {
        setShowOverwriteAlert(false);
      }
      const updated = applyInvoiceDependencyClosure({...value, [key]: checked});
      onChange(profile, updated);
    },
    [value, profile, onChange, manualClassificationPresent],
  );

  /** Handles the maximumRecipes number input change. */
  const handleMaxRecipesChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const num = parseInt(e.target.value, 10);
      if (!Number.isNaN(num)) {
        const updated = applyInvoiceDependencyClosure({...value, maximumRecipes: num});
        onChange(profile, updated);
      }
    },
    [value, profile, onChange],
  );

  return (
    <div className={styles["container"]}>
      {/* ── Profile selection ── */}
      <fieldset className={styles["fieldset"]}>
        <legend className={styles["legend"]}>{t((m) => m.dialogs.invoices.invoiceAnalysisControls.profilesLabel)}</legend>
        <div className={styles["radioGroup"]}>
          {PROFILES.map((p) => (
            <label
              key={p}
              htmlFor={`profile-${p}`}
              className={styles["radioLabel"]}>
              <input
                type='radio'
                id={`profile-${p}`}
                name='analysisProfile'
                value={p}
                checked={profile === p}
                disabled={disabled}
                onChange={handleProfileChange}
                className={styles["radio"]}
              />
              {t((m) => m.dialogs.invoices.invoiceAnalysisControls.profiles[p])}
            </label>
          ))}
        </div>
        {isCustom ? (
          <span className={styles["customBadge"]}>{t((m) => m.dialogs.invoices.invoiceAnalysisControls.customLabel)}</span>
        ) : null}
      </fieldset>

      {/* ── Capability checkboxes ── */}
      <fieldset className={styles["fieldset"]}>
        <legend className={styles["legend"]}>{t((m) => m.dialogs.invoices.invoiceAnalysisControls.capabilitiesLabel)}</legend>
        <div className={styles["checkboxGroup"]}>
          {INVOICE_CAPABILITY_KEYS.map((key) => {
            const isEnabled = value[key];
            const isLastEnabled = isEnabled && enabledCount === 1;
            return (
              <label
                key={key}
                htmlFor={`capability-${key}`}
                className={styles["checkboxLabel"]}>
                <input
                  type='checkbox'
                  id={`capability-${key}`}
                  value={key}
                  checked={isEnabled}
                  disabled={disabled || isLastEnabled}
                  onChange={handleCapabilityChange}
                  className={styles["checkbox"]}
                />
                {t((m) => m.dialogs.invoices.invoiceAnalysisControls.capabilities[key])}
              </label>
            );
          })}
        </div>
      </fieldset>

      {/* ── Maximum recipes ── */}
      <div className={styles["spinbuttonRow"]}>
        <label
          htmlFor='max-recipes'
          className={styles["spinbuttonLabel"]}>
          {t((m) => m.dialogs.invoices.invoiceAnalysisControls.maximumRecipesLabel)}
        </label>
        <input
          type='number'
          id='max-recipes'
          min={1}
          max={3}
          value={value.maximumRecipes === 0 ? "" : value.maximumRecipes}
          disabled={disabled || !value.recipeGeneration}
          onChange={handleMaxRecipesChange}
          className={styles["spinbutton"]}
        />
      </div>

      {/* ── Overwrite alert ── */}
      {showOverwriteAlert ? (
        <div
          role='alert'
          className={styles["overwriteAlert"]}>
          {t((m) => m.dialogs.invoices.invoiceAnalysisControls.classificationOverwriteAlert)}
        </div>
      ) : null}
    </div>
  );
}
