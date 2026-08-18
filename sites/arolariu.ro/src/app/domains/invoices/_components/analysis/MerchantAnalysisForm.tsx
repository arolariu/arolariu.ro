"use client";

/**
 * @fileoverview Accessible merchant analysis configuration form.
 * @module app/domains/invoices/_components/analysis/MerchantAnalysisForm
 */

import {AnalysisProfile, isAnalysisProfile, type AnalyzeMerchantRequest, type MerchantAnalysisOverrides} from "@/types/invoices";
import {Button, Checkbox, Input, Label} from "@arolariu/components";
import {useTranslations} from "next-intl-selector";
import {useCallback, useMemo, useState} from "react";
import {useAnalysisSubmission} from "../../_hooks/analysis/useAnalysisSubmission";
import styles from "./AnalysisForms.module.scss";

type MerchantCapability = "merchantClassification" | "descriptionGeneration";

type MerchantCapabilitySelection = Readonly<Record<MerchantCapability, boolean>>;

/**
 * Props for {@link MerchantAnalysisForm}.
 */
export interface MerchantAnalysisFormProps {
  /** UUID of the merchant to enqueue. */
  readonly merchantIdentifier: string;
  /** Whether accepted submissions should reload the document after thirty seconds. */
  readonly refreshAfterAcceptance?: boolean;
}

const merchantCapabilities: readonly MerchantCapability[] = ["merchantClassification", "descriptionGeneration"];

function profileSelection(profile: AnalysisProfile): MerchantCapabilitySelection {
  return {
    merchantClassification: true,
    descriptionGeneration: profile !== AnalysisProfile.Fast,
  };
}

function createMerchantRequest(profile: AnalysisProfile, selection: MerchantCapabilitySelection): AnalyzeMerchantRequest {
  const baseline = profileSelection(profile);
  const overrides: MerchantAnalysisOverrides = {
    ...(selection.merchantClassification === baseline.merchantClassification
      ? {}
      : {merchantClassification: {enabled: selection.merchantClassification}}),
    ...(selection.descriptionGeneration === baseline.descriptionGeneration
      ? {}
      : {descriptionGeneration: {enabled: selection.descriptionGeneration}}),
  };

  return {profile, overrides};
}

/**
 * Renders valid merchant analysis profile and capability controls.
 *
 * @remarks
 * Merchant analysis intentionally exposes only NACE classification and
 * description generation overrides. It announces durable enqueue acceptance,
 * not background worker completion.
 *
 * @param props - Merchant identifier and optional hard-refresh behavior.
 * @returns Client-side analysis controls for one linked merchant.
 */
export function MerchantAnalysisForm({
  merchantIdentifier,
  refreshAfterAcceptance = false,
}: Readonly<MerchantAnalysisFormProps>): React.JSX.Element {
  const t = useTranslations();
  const {acceptedRunId, isSubmitting, submitMerchant} = useAnalysisSubmission({scopeKey: merchantIdentifier});
  const [profile, setProfile] = useState<AnalysisProfile>(AnalysisProfile.Comprehensive);
  const [selection, setSelection] = useState<MerchantCapabilitySelection>(() => profileSelection(AnalysisProfile.Comprehensive));

  const selectedCapabilityCount = useMemo(() => merchantCapabilities.filter((capability) => selection[capability]).length, [selection]);

  const handleProfileChange = useCallback((event: React.ChangeEvent<HTMLInputElement>): void => {
    const nextProfile = event.target.value;
    if (!isAnalysisProfile(nextProfile)) {
      return;
    }

    setProfile(nextProfile);
    setSelection(profileSelection(nextProfile));
  }, []);

  const handleCapabilityChange = useCallback((capability: MerchantCapability, checked: boolean): void => {
    setSelection((current) => {
      const next: MerchantCapabilitySelection = {...current, [capability]: checked};
      return merchantCapabilities.some((item) => next[item]) ? next : current;
    });
  }, []);

  const handleSubmit = useCallback(
    (event: React.FormEvent<HTMLFormElement>): void => {
      event.preventDefault();
      void submitMerchant({
        merchantIdentifier,
        request: createMerchantRequest(profile, selection),
        refreshAfterAcceptance,
      });
    },
    [merchantIdentifier, profile, refreshAfterAcceptance, selection, submitMerchant],
  );

  const capabilityLabel = useCallback(
    (capability: MerchantCapability): string => {
      if (capability === "merchantClassification") {
        return t((messages) => messages.forms.invoices.analysis.merchantCapabilities.naceClassification);
      }
      return t((messages) => messages.forms.invoices.analysis.merchantCapabilities.descriptionGeneration);
    },
    [t],
  );

  const statusMessage = isSubmitting
    ? t((messages) => messages.forms.invoices.analysis.status.submitting)
    : acceptedRunId !== null
      ? t((messages) => messages.forms.invoices.analysis.status.queued)
      : "";

  return (
    <form
      className={styles["form"]}
      aria-busy={isSubmitting}
      onSubmit={handleSubmit}>
      <div>
        <h3 className={styles["heading"]}>{t((messages) => messages.forms.invoices.analysis.merchant.title)}</h3>
        <p className={styles["description"]}>{t((messages) => messages.forms.invoices.analysis.descriptions.merchant)}</p>
      </div>

      <fieldset className={styles["fieldset"]}>
        <legend className={styles["legend"]}>{t((messages) => messages.forms.invoices.analysis.merchant.profileLegend)}</legend>
        <p className={styles["fieldsetDescription"]}>{t((messages) => messages.forms.invoices.analysis.descriptions.profiles)}</p>
        <div className={styles["profileGrid"]}>
          {Object.values(AnalysisProfile).map((option) => {
            const inputIdentifier = `merchant-analysis-profile-${option}`;
            return (
              <Label
                key={option}
                htmlFor={inputIdentifier}
                className={styles["profileOption"]}>
                <Input
                  id={inputIdentifier}
                  name='merchant-analysis-profile'
                  type='radio'
                  value={option}
                  checked={profile === option}
                  disabled={isSubmitting}
                  onChange={handleProfileChange}
                  className={styles["radio"]}
                />
                {t((messages) => messages.forms.invoices.analysis.profiles[option])}
              </Label>
            );
          })}
        </div>
      </fieldset>

      <fieldset className={styles["fieldset"]}>
        <legend className={styles["legend"]}>{t((messages) => messages.forms.invoices.analysis.merchant.capabilitiesLegend)}</legend>
        <div className={styles["capabilityList"]}>
          {merchantCapabilities.map((capability) => {
            const inputIdentifier = `merchant-analysis-capability-${capability}`;
            const isLastEnabledCapability = selection[capability] && selectedCapabilityCount === 1;
            return (
              <div
                key={capability}
                className={styles["capabilityOption"]}>
                <Checkbox
                  nativeButton
                  id={inputIdentifier}
                  checked={selection[capability]}
                  disabled={isSubmitting || isLastEnabledCapability}
                  onCheckedChange={(checked) => handleCapabilityChange(capability, checked === true)}
                />
                <Label
                  htmlFor={inputIdentifier}
                  className={styles["capabilityLabel"]}>
                  {capabilityLabel(capability)}
                </Label>
              </div>
            );
          })}
        </div>
      </fieldset>

      <p
        className={styles["status"]}
        role='status'
        aria-live='polite'>
        {statusMessage}
      </p>

      <Button
        type='submit'
        disabled={isSubmitting}
        className={styles["submitButton"]}>
        {isSubmitting
          ? t((messages) => messages.forms.invoices.analysis.buttons.submitting)
          : t((messages) => messages.forms.invoices.analysis.buttons.start)}
      </Button>
    </form>
  );
}
