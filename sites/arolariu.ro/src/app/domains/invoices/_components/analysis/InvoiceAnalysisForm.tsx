"use client";

/**
 * @fileoverview Accessible invoice analysis configuration form.
 * @module app/domains/invoices/_components/analysis/InvoiceAnalysisForm
 */

import {AnalysisProfile, isAnalysisProfile, type AnalyzeInvoiceRequest, type InvoiceAnalysisOverrides} from "@/types/invoices";
import {Button, Checkbox, Input, Label} from "@arolariu/components";
import {useTranslations} from "next-intl-selector";
import {useCallback, useMemo, useState} from "react";
import {useAnalysisSubmission} from "../../_hooks/analysis/useAnalysisSubmission";
import styles from "./AnalysisForms.module.scss";

type InvoiceCapability =
  | "documentExtraction"
  | "merchantResolution"
  | "invoiceSummary"
  | "productClassification"
  | "allergenAssessment"
  | "invoiceClassification"
  | "recipeGeneration";

type InvoiceCapabilitySelection = Readonly<Record<InvoiceCapability, boolean>>;

/**
 * Props for {@link InvoiceAnalysisForm}.
 */
export interface InvoiceAnalysisFormProps {
  /** UUID of the invoice to enqueue. */
  readonly invoiceIdentifier: string;
  /** Whether accepted submissions should reload the document after thirty seconds. */
  readonly refreshAfterAcceptance?: boolean;
}

const invoiceCapabilities: readonly InvoiceCapability[] = [
  "documentExtraction",
  "merchantResolution",
  "invoiceSummary",
  "productClassification",
  "allergenAssessment",
  "invoiceClassification",
  "recipeGeneration",
];

function profileSelection(profile: AnalysisProfile): InvoiceCapabilitySelection {
  switch (profile) {
    case AnalysisProfile.Fast:
      return {
        documentExtraction: true,
        merchantResolution: true,
        invoiceSummary: false,
        productClassification: true,
        allergenAssessment: false,
        invoiceClassification: true,
        recipeGeneration: false,
      };
    case AnalysisProfile.Balanced:
      return {
        documentExtraction: true,
        merchantResolution: true,
        invoiceSummary: true,
        productClassification: true,
        allergenAssessment: true,
        invoiceClassification: true,
        recipeGeneration: false,
      };
    case AnalysisProfile.Comprehensive:
      return {
        documentExtraction: true,
        merchantResolution: true,
        invoiceSummary: true,
        productClassification: true,
        allergenAssessment: true,
        invoiceClassification: true,
        recipeGeneration: true,
      };
  }
}

function createInvoiceRequest(profile: AnalysisProfile, selection: InvoiceCapabilitySelection): AnalyzeInvoiceRequest {
  const baseline = profileSelection(profile);
  const overrides: InvoiceAnalysisOverrides = {
    ...(selection.documentExtraction === baseline.documentExtraction ? {} : {documentExtraction: {enabled: selection.documentExtraction}}),
    ...(selection.merchantResolution === baseline.merchantResolution ? {} : {merchantResolution: {enabled: selection.merchantResolution}}),
    ...(selection.invoiceSummary === baseline.invoiceSummary ? {} : {invoiceSummary: {enabled: selection.invoiceSummary}}),
    ...(selection.productClassification === baseline.productClassification
      ? {}
      : {productClassification: {enabled: selection.productClassification}}),
    ...(selection.allergenAssessment === baseline.allergenAssessment ? {} : {allergenAssessment: {enabled: selection.allergenAssessment}}),
    ...(selection.invoiceClassification === baseline.invoiceClassification
      ? {}
      : {invoiceClassification: {enabled: selection.invoiceClassification}}),
    ...(selection.recipeGeneration === baseline.recipeGeneration ? {} : {recipeGeneration: {enabled: selection.recipeGeneration}}),
  };

  return {profile, overrides};
}

/**
 * Renders valid invoice analysis profile and capability controls.
 *
 * @remarks
 * The form preserves the resolver dependency closure:
 * `recipeGeneration → allergenAssessment → productClassification`. It reports
 * only enqueue acknowledgement status; it never renders inferred worker stages,
 * percentages, or completion claims.
 *
 * @param props - Invoice identifier and optional hard-refresh behavior.
 * @returns Client-side analysis controls for one invoice.
 */
export function InvoiceAnalysisForm({
  invoiceIdentifier,
  refreshAfterAcceptance = false,
}: Readonly<InvoiceAnalysisFormProps>): React.JSX.Element {
  const t = useTranslations();
  const {acceptedRunId, isSubmitting, submitInvoice} = useAnalysisSubmission({scopeKey: invoiceIdentifier});
  const [profile, setProfile] = useState<AnalysisProfile>(AnalysisProfile.Comprehensive);
  const [selection, setSelection] = useState<InvoiceCapabilitySelection>(() => profileSelection(AnalysisProfile.Comprehensive));

  const selectedCapabilityCount = useMemo(() => invoiceCapabilities.filter((capability) => selection[capability]).length, [selection]);

  const handleProfileChange = useCallback((event: React.ChangeEvent<HTMLInputElement>): void => {
    const nextProfile = event.target.value;
    if (!isAnalysisProfile(nextProfile)) {
      return;
    }

    setProfile(nextProfile);
    setSelection(profileSelection(nextProfile));
  }, []);

  const handleCapabilityChange = useCallback((capability: InvoiceCapability, checked: boolean): void => {
    setSelection((current) => {
      let next: InvoiceCapabilitySelection = {...current, [capability]: checked};

      if (capability === "productClassification" && !checked) {
        next = {...next, allergenAssessment: false, recipeGeneration: false};
      }
      if (capability === "allergenAssessment" && !checked) {
        next = {...next, recipeGeneration: false};
      }
      if (capability === "allergenAssessment" && checked) {
        next = {...next, productClassification: true};
      }
      if (capability === "recipeGeneration" && checked) {
        next = {...next, productClassification: true, allergenAssessment: true};
      }

      return invoiceCapabilities.some((item) => next[item]) ? next : current;
    });
  }, []);

  const handleSubmit = useCallback(
    (event: React.FormEvent<HTMLFormElement>): void => {
      event.preventDefault();
      void submitInvoice({
        invoiceIdentifier,
        request: createInvoiceRequest(profile, selection),
        refreshAfterAcceptance,
      });
    },
    [invoiceIdentifier, profile, refreshAfterAcceptance, selection, submitInvoice],
  );

  const capabilityLabel = useCallback(
    (capability: InvoiceCapability): string => t((messages) => messages.forms.invoices.analysis.capabilities[capability]),
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
        <h3 className={styles["heading"]}>{t((messages) => messages.forms.invoices.analysis.invoice.title)}</h3>
        <p className={styles["description"]}>{t((messages) => messages.forms.invoices.analysis.descriptions.invoice)}</p>
      </div>

      <fieldset className={styles["fieldset"]}>
        <legend className={styles["legend"]}>{t((messages) => messages.forms.invoices.analysis.invoice.profileLegend)}</legend>
        <p className={styles["fieldsetDescription"]}>{t((messages) => messages.forms.invoices.analysis.descriptions.profiles)}</p>
        <div className={styles["profileGrid"]}>
          {Object.values(AnalysisProfile).map((option) => {
            const inputIdentifier = `invoice-analysis-profile-${option}`;
            return (
              <Label
                key={option}
                htmlFor={inputIdentifier}
                className={styles["profileOption"]}>
                <Input
                  id={inputIdentifier}
                  name='invoice-analysis-profile'
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
        <legend className={styles["legend"]}>{t((messages) => messages.forms.invoices.analysis.invoice.capabilitiesLegend)}</legend>
        <div className={styles["capabilityList"]}>
          {invoiceCapabilities.map((capability) => {
            const inputIdentifier = `invoice-analysis-capability-${capability}`;
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
