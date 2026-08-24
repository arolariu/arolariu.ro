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
import {useCallback, type ChangeEvent} from "react";
import {
  MERCHANT_CAPABILITY_KEYS,
  resolveMerchantCapabilities,
  type AnalysisProfile,
  type MerchantAnalysisCapabilities,
} from "@/types/invoices/Analysis";
import styles from "./MerchantAnalysisControls.module.scss";

/** Props for {@link MerchantAnalysisControls}. */
type Props = {
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
};

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

/** Resolves a profile value emitted by one of the rendered radio inputs. */
function resolveProfile(value: string): AnalysisProfile {
  const profile = PROFILES.find((candidate) => candidate === value);
  if (profile === undefined) throw new Error(`Unsupported merchant analysis profile: ${value}`);
  return profile;
}

/** Resolves a capability value emitted by one of the rendered checkbox inputs. */
function resolveCapability(value: string): (typeof MERCHANT_CAPABILITY_KEYS)[number] {
  const capability = MERCHANT_CAPABILITY_KEYS.find((candidate) => candidate === value);
  if (capability === undefined) throw new Error(`Unsupported merchant analysis capability: ${value}`);
  return capability;
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
 * @param props - Component properties.
 * @returns The merchant capability controls section.
 */
export default function MerchantAnalysisControls({profile, value, onChange, disabled = false}: Readonly<Props>): React.JSX.Element {
  const t = useTranslations();

  const isCustom = !matchesPreset(profile, value);
  const enabledCount = countEnabled(value);

  /** Handles profile radio change — always emits the preset shape. */
  const handleProfileChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const newProfile = resolveProfile(event.currentTarget.value);
      onChange(newProfile, resolveMerchantCapabilities(newProfile));
    },
    [onChange],
  );

  /** Handles a single boolean capability toggle. */
  const handleCapabilityChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const key = resolveCapability(event.currentTarget.value);
      const {checked} = event.currentTarget;
      onChange(profile, {...value, [key]: checked});
    },
    [value, profile, onChange],
  );

  return (
    <div className={styles["container"]}>
      {/* ── Profile selection ── */}
      <fieldset className={styles["fieldset"]}>
        <legend className={styles["legend"]}>{t((m) => m.dialogs.invoices.merchantAnalysisControls.profilesLabel)}</legend>
        <div className={styles["radioGroup"]}>
          {PROFILES.map((p) => (
            <label
              key={p}
              htmlFor={`merchant-profile-${p}`}
              className={styles["radioLabel"]}>
              <input
                type='radio'
                id={`merchant-profile-${p}`}
                name='merchantAnalysisProfile'
                value={p}
                checked={profile === p}
                disabled={disabled}
                onChange={handleProfileChange}
                className={styles["radio"]}
              />
              {t((m) => m.dialogs.invoices.merchantAnalysisControls.profiles[p])}
            </label>
          ))}
        </div>
        {isCustom ? (
          <span className={styles["customBadge"]}>{t((m) => m.dialogs.invoices.merchantAnalysisControls.customLabel)}</span>
        ) : null}
      </fieldset>

      {/* ── Capability checkboxes ── */}
      <fieldset className={styles["fieldset"]}>
        <legend className={styles["legend"]}>{t((m) => m.dialogs.invoices.merchantAnalysisControls.capabilitiesLabel)}</legend>
        <div className={styles["checkboxGroup"]}>
          {MERCHANT_CAPABILITY_KEYS.map((key) => {
            const isEnabled = value[key];
            const isLastEnabled = isEnabled && enabledCount === 1;
            return (
              <label
                key={key}
                htmlFor={`merchant-capability-${key}`}
                className={styles["checkboxLabel"]}>
                <input
                  type='checkbox'
                  id={`merchant-capability-${key}`}
                  value={key}
                  checked={isEnabled}
                  disabled={disabled || isLastEnabled}
                  onChange={handleCapabilityChange}
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
