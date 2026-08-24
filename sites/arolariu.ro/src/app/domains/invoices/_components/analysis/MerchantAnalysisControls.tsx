"use client";

/**
 * @fileoverview Reusable controls for configuring merchant analysis capabilities.
 * @module app/domains/invoices/_components/analysis/MerchantAnalysisControls
 *
 * @remarks
 * Renders profile radio buttons and per-capability checkboxes for merchant analysis
 * configuration. The last remaining enabled capability cannot be unchecked.
 *
 * **Rendering Context**: Client Component (`"use client"` directive).
 */

import {useTranslations} from "next-intl-selector";
import {useCallback} from "react";
import {
  MERCHANT_CAPABILITY_KEYS,
  resolveMerchantCapabilities,
} from "@/types/invoices/Analysis";
import type {AnalysisProfile, MerchantAnalysisCapabilities} from "@/types/invoices/Analysis";
import styles from "./MerchantAnalysisControls.module.scss";

/** Props for {@link MerchantAnalysisControls}. */
interface MerchantAnalysisControlsProps {
  /** Currently selected analysis profile. */
  readonly profile: AnalysisProfile;
  /** Current capability set (controlled). */
  readonly value: MerchantAnalysisCapabilities;
  /**
   * Called when the profile or any capability changes.
   *
   * @param profile - The active requestable profile (never `"custom"`).
   * @param capabilities - The updated capabilities.
   */
  readonly onChange: (profile: AnalysisProfile, capabilities: MerchantAnalysisCapabilities) => void;
  /** When `true`, all controls are disabled. */
  readonly disabled?: boolean;
}

/** Profile values in stable order for rendering. */
const PROFILES = ["fast", "balanced", "comprehensive"] as const satisfies readonly AnalysisProfile[];

/** Returns `true` when `value` matches the preset for `profile`. */
function matchesPreset(profile: AnalysisProfile, value: MerchantAnalysisCapabilities): boolean {
  const preset = resolveMerchantCapabilities(profile);
  return MERCHANT_CAPABILITY_KEYS.every((key) => value[key] === preset[key]);
}

/** Number of enabled boolean capabilities in the given set. */
function countEnabled(value: MerchantAnalysisCapabilities): number {
  return MERCHANT_CAPABILITY_KEYS.filter((key) => value[key]).length;
}

/**
 * Renders profile radio buttons and per-capability checkboxes for merchant analysis.
 *
 * @remarks
 * - Iterates {@link MERCHANT_CAPABILITY_KEYS} — no second hard-coded list.
 * - "Custom" is a UI-only label; the emitted `profile` is always one of the three
 *   requestable values.
 * - Disables a capability checkbox when unchecking it would leave zero enabled.
 *
 * @param props - {@link MerchantAnalysisControlsProps}
 * @returns The merchant capability controls section.
 */
export default function MerchantAnalysisControls({
  profile,
  value,
  onChange,
  disabled = false,
}: Readonly<MerchantAnalysisControlsProps>): React.JSX.Element {
  const t = useTranslations();

  const isCustom = !matchesPreset(profile, value);
  const enabledCount = countEnabled(value);

  /** Handles profile radio change — always emits the preset shape. */
  const handleProfileChange = useCallback(
    (newProfile: AnalysisProfile) => {
      onChange(newProfile, resolveMerchantCapabilities(newProfile));
    },
    [onChange],
  );

  /** Handles a single boolean capability toggle. */
  const handleCapabilityChange = useCallback(
    (key: (typeof MERCHANT_CAPABILITY_KEYS)[number], checked: boolean) => {
      onChange(profile, {...value, [key]: checked});
    },
    [value, profile, onChange],
  );

  return (
    <div className={styles["container"]}>
      {/* ── Profile selection ── */}
      <fieldset className={styles["fieldset"]}>
        <legend className={styles["legend"]}>
          {t((m) => m.dialogs.invoices.merchantAnalysisControls.profilesLabel)}
        </legend>
        <div className={styles["radioGroup"]}>
          {PROFILES.map((p) => (
            <label key={p} htmlFor={`merchant-profile-${p}`} className={styles["radioLabel"]}>
              <input
                type="radio"
                id={`merchant-profile-${p}`}
                name="merchantAnalysisProfile"
                value={p}
                checked={profile === p}
                disabled={disabled}
                onChange={() => handleProfileChange(p)}
                className={styles["radio"]}
              />
              {t((m) => m.dialogs.invoices.merchantAnalysisControls.profiles[p])}
            </label>
          ))}
        </div>
        {isCustom && (
          <span className={styles["customBadge"]}>
            {t((m) => m.dialogs.invoices.merchantAnalysisControls.customLabel)}
          </span>
        )}
      </fieldset>

      {/* ── Capability checkboxes ── */}
      <fieldset className={styles["fieldset"]}>
        <legend className={styles["legend"]}>
          {t((m) => m.dialogs.invoices.merchantAnalysisControls.capabilitiesLabel)}
        </legend>
        <div className={styles["checkboxGroup"]}>
          {MERCHANT_CAPABILITY_KEYS.map((key) => {
            const isEnabled = value[key];
            const isLastEnabled = isEnabled && enabledCount === 1;
            return (
              <label key={key} htmlFor={`merchant-capability-${key}`} className={styles["checkboxLabel"]}>
                <input
                  type="checkbox"
                  id={`merchant-capability-${key}`}
                  checked={isEnabled}
                  disabled={disabled || isLastEnabled}
                  onChange={(e) => handleCapabilityChange(key, e.target.checked)}
                  className={styles["checkbox"]}
                />
                {t((m) => m.dialogs.invoices.merchantAnalysisControls.capabilities[key])}
              </label>
            );
          })}
        </div>
      </fieldset>
    </div>
  );
}
