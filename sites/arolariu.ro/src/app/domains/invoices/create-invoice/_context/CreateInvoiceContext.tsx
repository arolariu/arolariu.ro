"use client";

/**
 * @fileoverview Context for managing create invoice wizard state.
 * @module app/domains/invoices/create-invoice/_context/CreateInvoiceContext
 *
 * @remarks
 * Provides centralized state management for the 3-step wizard:
 * - Step navigation and validation
 * - Scan selection state
 * - Invoice details form state
 * - Invoice creation orchestration
 */

import {useScansStore} from "@/stores";
import {AnalysisProfile, type ClassificationSelection, type Invoice, PaymentType} from "@/types/invoices";
import {type CachedScan, ScanMetadataStatus, ScanStatus} from "@/types/scans";
import {toast} from "@arolariu/components";
import {useTranslations} from "next-intl-selector";
import {useRouter} from "next/navigation";
import {createContext, useCallback, useContext, useMemo, useState, type ReactNode} from "react";
import {analyzeInvoice, createInvoice} from "../../_actions/invoices";
import {updateScan} from "../../_actions/scans";
import {scanTypeToInvoiceScanType} from "../../_utils/mimeTypeUtilities";

/**
 * Wizard step type definition.
 */
type WizardStep = "select-scans" | "details" | "review";

/**
 * Selects analysis overrides after the manual classification PATCH outcome.
 *
 * @remarks
 * Invoice classification remains enabled when the manual PATCH fails, so a
 * transient network error cannot silently leave the newly created invoice
 * without either user-selected or analysis-derived classification.
 *
 * @param manualClassificationApplied - Whether the manual classification PATCH succeeded.
 * @returns Exact enqueue overrides for the analysis request.
 */
export function getCreateAnalysisOverrides(
  manualClassificationApplied: boolean,
): Readonly<{}> | Readonly<{invoiceClassification: Readonly<{enabled: false}>}> {
  return manualClassificationApplied ? {invoiceClassification: {enabled: false}} : {};
}

/**
 * Invoice details form data.
 */
interface InvoiceDetails {
  name: string;
  classification: ClassificationSelection | null;
  paymentType: PaymentType;
  transactionDate: Date;
  description: string;
}

/**
 * Retryable attachment work for an invoice that was created successfully.
 *
 * The invoice is deliberately retained so retrying never creates another
 * invoice. Only scans whose blob metadata update did not complete are retried.
 */
type PendingAttachmentFinalization = Readonly<{
  readonly invoice: Invoice;
  readonly pendingScans: ReadonlyArray<CachedScan>;
  readonly manualClassificationApplied: boolean;
}>;

/** Safe UI projection of a retryable attachment-finalization state. */
type AttachmentFinalizationState = Readonly<{
  readonly invoiceId: string;
  readonly pendingScanIds: ReadonlyArray<string>;
}>;

type AttachmentReconciliationResult = Readonly<{
  readonly completedScanIds: ReadonlyArray<string>;
  readonly pendingScans: ReadonlyArray<CachedScan>;
}>;

/**
 * Context value type definition.
 */
interface CreateInvoiceContextValue {
  // Step management
  currentStep: WizardStep;
  goToStep: (step: WizardStep) => void;
  goNext: () => void;
  goBack: () => void;
  canGoNext: boolean;

  // Scan selection
  selectedScans: CachedScan[];
  toggleScan: (scan: CachedScan) => void;
  selectAllScans: () => void;
  clearSelection: () => void;
  hasScans: boolean;

  // Invoice details
  invoiceDetails: InvoiceDetails;
  setName: (name: string) => void;
  setClassification: (classification: ClassificationSelection | null) => void;
  setPaymentType: (type: PaymentType) => void;
  setTransactionDate: (date: Date) => void;
  setDescription: (desc: string) => void;

  // Invoice creation
  isCreating: boolean;
  createInvoiceWithScans: () => Promise<void>;
  attachmentFinalization: AttachmentFinalizationState | null;
  retryAttachmentFinalization: () => Promise<void>;
}

/**
 * Context instance.
 */
const CreateInvoiceContext = createContext<CreateInvoiceContextValue | undefined>(undefined);

/**
 * Provider component props.
 */
interface CreateInvoiceProviderProps {
  children: ReactNode;
}

/**
 * Context provider component.
 *
 * @param props - Provider props
 * @returns JSX element wrapping children with context
 */
export function CreateInvoiceProvider({children}: Readonly<CreateInvoiceProviderProps>): React.JSX.Element {
  const router = useRouter();
  const t = useTranslations();
  const {scans, markScansAsUsedByInvoice} = useScansStore();

  // Filter to only READY scans
  const readyScans = useMemo(() => scans.filter((scan) => scan.status === ScanStatus.READY), [scans]);

  // Wizard state
  const [currentStep, setCurrentStep] = useState<WizardStep>("select-scans");
  const [selectedScans, setSelectedScans] = useState<CachedScan[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [pendingAttachmentFinalization, setPendingAttachmentFinalization] = useState<PendingAttachmentFinalization | null>(null);

  // Invoice details state
  const [invoiceDetails, setInvoiceDetails] = useState<InvoiceDetails>(() => ({
    name: "",
    classification: null,
    paymentType: PaymentType.Unknown,
    transactionDate: new Date(),
    description: "",
  }));

  // Step navigation
  const goToStep = useCallback((step: WizardStep) => {
    setCurrentStep(step);
  }, []);

  const goNext = useCallback(() => {
    if (currentStep === "select-scans") {
      setCurrentStep("details");
      // Auto-suggest name from first scan
      const [firstScan] = selectedScans;
      if (selectedScans.length > 0 && !invoiceDetails.name && firstScan) {
        const firstName = firstScan.name.replaceAll(/\.[^/.]+$/gu, "");
        setInvoiceDetails((prev) => ({...prev, name: firstName}));
      }
    } else if (currentStep === "details") {
      setCurrentStep("review");
    }
  }, [currentStep, selectedScans, invoiceDetails.name]);

  const goBack = useCallback(() => {
    if (currentStep === "review") {
      setCurrentStep("details");
    } else if (currentStep === "details") {
      setCurrentStep("select-scans");
    }
  }, [currentStep]);

  // Validation for next button
  const canGoNext = useMemo(() => {
    if (currentStep === "select-scans") {
      return selectedScans.length > 0;
    }
    if (currentStep === "details") {
      return invoiceDetails.name.trim().length > 0;
    }
    return false;
  }, [currentStep, selectedScans.length, invoiceDetails.name]);

  // Scan selection handlers
  const toggleScan = useCallback((scan: CachedScan) => {
    setSelectedScans((prev) => {
      const isSelected = prev.some((s) => s.id === scan.id);
      return isSelected ? prev.filter((s) => s.id !== scan.id) : [...prev, scan];
    });
  }, []);

  const selectAllScans = useCallback(() => {
    setSelectedScans(readyScans as CachedScan[]);
  }, [readyScans]);

  const clearSelection = useCallback(() => {
    setSelectedScans([]);
  }, []);

  // Invoice details setters
  const setName = useCallback((name: string) => {
    setInvoiceDetails((prev) => ({...prev, name}));
  }, []);

  const setClassification = useCallback((classification: ClassificationSelection | null) => {
    setInvoiceDetails((prev) => ({...prev, classification}));
  }, []);

  const setPaymentType = useCallback((paymentType: PaymentType) => {
    setInvoiceDetails((prev) => ({...prev, paymentType}));
  }, []);

  const setTransactionDate = useCallback((transactionDate: Date) => {
    setInvoiceDetails((prev) => ({...prev, transactionDate}));
  }, []);

  const setDescription = useCallback((description: string) => {
    setInvoiceDetails((prev) => ({...prev, description}));
  }, []);

  /**
   * Persists one authoritative attachment marker for every selected scan.
   *
   * @remarks
   * Every update is awaited. A rejected result and a thrown external-boundary
   * error both remain retryable rather than being suppressed.
   */
  const reconcileScanAttachments = useCallback(
    async (invoice: Invoice, scansToReconcile: ReadonlyArray<CachedScan>): Promise<AttachmentReconciliationResult> => {
      const outcomes = await Promise.all(
        scansToReconcile.map(async (scan) => {
          try {
            const result = await updateScan({
              scanId: scan.id,
              metadataAdd: {
                status: ScanMetadataStatus.ATTACHED,
                attachedTo: invoice.id,
              },
            });
            return {scan, succeeded: result.success} as const;
          } catch {
            return {scan, succeeded: false} as const;
          }
        }),
      );

      return {
        completedScanIds: outcomes.filter((outcome) => outcome.succeeded).map((outcome) => outcome.scan.id),
        pendingScans: outcomes.filter((outcome) => !outcome.succeeded).map((outcome) => outcome.scan),
      };
    },
    [],
  );

  /**
   * Enqueues durable analysis only after all attachment metadata is reconciled.
   */
  const enqueueAnalysisAndNavigate = useCallback(
    async (invoice: Invoice, manualClassificationApplied: boolean): Promise<void> => {
      const analysisResult = await analyzeInvoice({
        invoiceIdentifier: invoice.id,
        request: {
          profile: AnalysisProfile.Comprehensive,
          overrides: getCreateAnalysisOverrides(manualClassificationApplied),
        },
      }).catch(() => null);

      if (analysisResult?.success) {
        toast.success(t((m) => m.forms.invoices.createInvoice.notifications.createdAndAnalysisQueued));
      } else {
        toast.error(t((m) => m.forms.invoices.createInvoice.notifications.analysisNotQueued));
      }

      router.push(`/domains/invoices/view-invoice/${invoice.id}`);
    },
    [router, t],
  );

  /**
   * Retries only attachment metadata that failed after a successful invoice create.
   */
  const retryAttachmentFinalization = useCallback(async (): Promise<void> => {
    if (pendingAttachmentFinalization === null) {
      return;
    }

    setIsCreating(true);
    try {
      const reconciliation = await reconcileScanAttachments(
        pendingAttachmentFinalization.invoice,
        pendingAttachmentFinalization.pendingScans,
      );
      if (reconciliation.pendingScans.length > 0) {
        setPendingAttachmentFinalization({
          ...pendingAttachmentFinalization,
          pendingScans: reconciliation.pendingScans,
        });
        toast.error(
          t((m) => m.forms.invoices.createInvoice.notifications.attachmentFinalizationFailed, {
            count: String(reconciliation.pendingScans.length),
          }),
        );
        return;
      }

      setPendingAttachmentFinalization(null);
      await enqueueAnalysisAndNavigate(pendingAttachmentFinalization.invoice, pendingAttachmentFinalization.manualClassificationApplied);
    } finally {
      setIsCreating(false);
    }
  }, [enqueueAnalysisAndNavigate, pendingAttachmentFinalization, reconcileScanAttachments, t]);

  // Create invoice orchestration
  const createInvoiceWithScans = useCallback(async () => {
    if (pendingAttachmentFinalization !== null) {
      await retryAttachmentFinalization();
      return;
    }

    setIsCreating(true);
    try {
      if (selectedScans.length === 0) {
        toast.error(t((m) => m.forms.invoices.createInvoice.notifications.createFailed));
        return;
      }

      // Send every user-editable creation field in the backend DTO's top-level
      // contract. Ownership is intentionally absent: the authenticated token is
      // the backend's only source of the invoice owner.
      const result = await createInvoice({
        name: invoiceDetails.name,
        description: invoiceDetails.description.trim() === "" ? null : invoiceDetails.description,
        classification: invoiceDetails.classification,
        paymentInformation: {
          transactionDate: invoiceDetails.transactionDate,
          paymentType: invoiceDetails.paymentType,
          currency: {name: "Romanian Leu", code: "RON", symbol: "lei"},
          totalCostAmount: 0,
          totalTaxAmount: 0,
          subtotalAmount: 0,
          tipAmount: 0,
        },
        merchantReference: null,
        isImportant: false,
        scans: selectedScans.map((scan) => ({
          type: scanTypeToInvoiceScanType(scan.scanType),
          location: scan.blobUrl,
          metadata: {
            sourceScanId: scan.metadata.scanId,
            documentKind: scan.metadata.documentKind,
            documentRole: scan.metadata.documentRole,
            uploadedAt: scan.metadata.uploadedAt.toISOString(),
          },
        })),
        items: null,
        metadata: {source: "create-invoice"},
      });

      if (!result.success) {
        toast.error(t((m) => m.forms.invoices.createInvoice.notifications.createFailed));
        return;
      }
      const invoice = result.data;

      const manualClassificationApplied = invoiceDetails.classification !== null;

      // The invoice has already associated these scans. Mark the local store now
      // so a retry cannot create a duplicate invoice while metadata is reconciled.
      const scanIds = selectedScans.map((s) => s.id);
      markScansAsUsedByInvoice(scanIds, invoice.id);

      const reconciliation = await reconcileScanAttachments(invoice, selectedScans);
      if (reconciliation.pendingScans.length > 0) {
        setPendingAttachmentFinalization({
          invoice,
          pendingScans: reconciliation.pendingScans,
          manualClassificationApplied,
        });
        toast.error(
          t((m) => m.forms.invoices.createInvoice.notifications.attachmentFinalizationFailed, {
            count: String(reconciliation.pendingScans.length),
          }),
        );
        return;
      }

      await enqueueAnalysisAndNavigate(invoice, manualClassificationApplied);
    } catch {
      toast.error(t((m) => m.forms.invoices.createInvoice.notifications.createFailed));
    } finally {
      setIsCreating(false);
    }
  }, [
    enqueueAnalysisAndNavigate,
    invoiceDetails,
    markScansAsUsedByInvoice,
    pendingAttachmentFinalization,
    reconcileScanAttachments,
    retryAttachmentFinalization,
    selectedScans,
    t,
  ]);

  const attachmentFinalization = useMemo<AttachmentFinalizationState | null>(
    () =>
      pendingAttachmentFinalization === null
        ? null
        : {
            invoiceId: pendingAttachmentFinalization.invoice.id,
            pendingScanIds: pendingAttachmentFinalization.pendingScans.map((scan) => scan.id),
          },
    [pendingAttachmentFinalization],
  );

  const contextValue: CreateInvoiceContextValue = useMemo(
    () => ({
      currentStep,
      goToStep,
      goNext,
      goBack,
      canGoNext,
      selectedScans,
      toggleScan,
      selectAllScans,
      clearSelection,
      hasScans: readyScans.length > 0,
      invoiceDetails,
      setName,
      setClassification,
      setPaymentType,
      setTransactionDate,
      setDescription,
      isCreating,
      createInvoiceWithScans,
      attachmentFinalization,
      retryAttachmentFinalization,
    }),
    [
      currentStep,
      goToStep,
      goNext,
      goBack,
      canGoNext,
      selectedScans,
      toggleScan,
      selectAllScans,
      clearSelection,
      readyScans.length,
      invoiceDetails,
      setName,
      setClassification,
      setPaymentType,
      setTransactionDate,
      setDescription,
      isCreating,
      createInvoiceWithScans,
      attachmentFinalization,
      retryAttachmentFinalization,
    ],
  );

  return <CreateInvoiceContext.Provider value={contextValue}>{children}</CreateInvoiceContext.Provider>;
}

/**
 * Hook to access create invoice context.
 *
 * @returns Context value
 * @throws Error if used outside provider
 */
export function useCreateInvoiceContext(): CreateInvoiceContextValue {
  const context = useContext(CreateInvoiceContext);
  if (!context) {
    throw new Error("useCreateInvoiceContext must be used within CreateInvoiceProvider");
  }
  return context;
}
