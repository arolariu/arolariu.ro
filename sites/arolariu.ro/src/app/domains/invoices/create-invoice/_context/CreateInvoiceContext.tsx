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
 * - Invoice creation orchestration with partial-failure recovery
 *
 * **Orchestration sequence (RFC contract):**
 * 1. Create minimal invoice (initialScan + required metadata only)
 * 2. PATCH name, description, paymentInformation, classificationCode
 * 3. Attach remaining scans
 * 4. Fire-and-forget analysis (invoiceClassification disabled when manual classification applied)
 * 5. Navigate to invoice view
 *
 * **Partial-failure recovery:**
 * If step 2 (PATCH) fails after a successful create, the invoice id is preserved
 * in `pendingInvoiceId`. A retry via `createInvoiceWithScans` detects the pending
 * id and skips the create step entirely — no duplicate invoices.
 */

import {useScansStore} from "@/stores";
import type {ClassificationSelection} from "@/types/invoices";
import {ClassificationSystem, PaymentType} from "@/types/invoices";
import {type CachedScan, ScanMetadataKey, ScanMetadataStatus, ScanStatus} from "@/types/scans";
import {toast} from "@arolariu/components";
import {useTranslations} from "next-intl-selector";
import {useRouter} from "next/navigation";
import {createContext, useCallback, useContext, useMemo, useState, type ReactNode} from "react";
import {analyzeInvoice, attachScanToInvoice, createInvoice, patchInvoice} from "../../_actions/invoices";
import {updateScan} from "../../_actions/scans";
import {scanTypeToInvoiceScanType} from "../../_utils/mimeTypeUtilities";

/**
 * Wizard step type definition.
 */
type WizardStep = "select-scans" | "details" | "review";

/**
 * Discriminated union modelling every outcome of `createInvoiceWithScans`.
 *
 * @remarks
 * - `"created"` — all steps succeeded; `invoiceIdentifier` is the persisted id.
 * - `"partial"` — the invoice was created but a later step failed; the id is
 *   preserved so a retry can skip the create step and reuse the existing record.
 */
export type CreateInvoiceOutcome =
  | {readonly status: "created"; readonly invoiceIdentifier: string}
  | {
      readonly status: "partial";
      readonly invoiceIdentifier: string;
      readonly failedStep: "patch" | "scans" | "analysis";
      readonly message: string;
    };

/**
 * Invoice details form data.
 */
interface InvoiceDetails {
  name: string;
  paymentType: PaymentType;
  transactionDate: Date;
  description: string;
}

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
  setPaymentType: (type: PaymentType) => void;
  setTransactionDate: (date: Date) => void;
  setDescription: (desc: string) => void;

  // Classification (replaces legacy category)
  classificationSelection: ClassificationSelection | null;
  setClassification: (selection: ClassificationSelection | null) => void;

  // Invoice creation
  isCreating: boolean;
  partialOutcome: CreateInvoiceOutcome | null;
  createInvoiceWithScans: () => Promise<void>;
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

  // Classification selection
  const [classificationSelection, setClassificationSelection] = useState<ClassificationSelection | null>(null);

  // Partial-failure recovery state
  const [pendingInvoiceId, setPendingInvoiceId] = useState<string | null>(null);
  const [partialOutcome, setPartialOutcome] = useState<CreateInvoiceOutcome | null>(null);

  // Invoice details state
  const [invoiceDetails, setInvoiceDetails] = useState<InvoiceDetails>(() => ({
    name: "",
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

  const setPaymentType = useCallback((paymentType: PaymentType) => {
    setInvoiceDetails((prev) => ({...prev, paymentType}));
  }, []);

  const setTransactionDate = useCallback((transactionDate: Date) => {
    setInvoiceDetails((prev) => ({...prev, transactionDate}));
  }, []);

  const setDescription = useCallback((description: string) => {
    setInvoiceDetails((prev) => ({...prev, description}));
  }, []);

  const setClassification = useCallback((selection: ClassificationSelection | null) => {
    setClassificationSelection(selection);
  }, []);

  // Invoice creation orchestration
  const createInvoiceWithScans = useCallback(async () => {
    setIsCreating(true);
    try {
      const [firstScan] = selectedScans;
      if (!firstScan) {
        throw new Error(t((m) => m.forms.invoices.createInvoice.errors.noScansSelected));
      }

      const scanType = scanTypeToInvoiceScanType(firstScan.scanType);

      // ── Step 1: Create minimal invoice ───────────────────────────────────
      // Skip creation when a prior partial-failure preserved an invoice id.
      let invoiceId = pendingInvoiceId;
      if (invoiceId === null) {
        const {success, data: invoice, error} = await createInvoice({
          initialScan: {
            type: scanType,
            location: firstScan.blobUrl,
            metadata: {},
          },
          // Metadata carries ONLY housekeeping flags — form data is NOT smuggled here
          metadata: {
            isImportant: "false",
            requiresAnalysis: "true",
          },
        });

        if (!success || !invoice) {
          throw new Error(error?.message ?? t((m) => m.forms.invoices.createInvoice.errors.createFailed));
        }
        invoiceId = invoice.id;
        // Preserve the id so a later retry can skip this step
        setPendingInvoiceId(invoiceId);
      }

      // ── Step 2: PATCH wizard details ─────────────────────────────────────
      const patchResult = await patchInvoice({
        invoiceId,
        payload: {
          name: invoiceDetails.name,
          description: invoiceDetails.description.length > 0 ? invoiceDetails.description : undefined,
          paymentInformation: {
            transactionDate: invoiceDetails.transactionDate,
            paymentType: invoiceDetails.paymentType,
            // Remaining monetary fields default to zero; AI analysis will populate them
            currency: {code: "", symbol: "", name: ""},
            totalCostAmount: 0,
            totalTaxAmount: 0,
            subtotalAmount: 0,
            tipAmount: 0,
          },
          ...(classificationSelection !== null ? {classificationCode: classificationSelection.code} : {}),
        },
      });

      if (!patchResult.success) {
        const message = patchResult.error?.message ?? t((m) => m.forms.invoices.createInvoice.errors.patchFailed);
        setPartialOutcome({status: "partial", invoiceIdentifier: invoiceId, failedStep: "patch", message});
        toast.error(t((m) => m.forms.invoices.createInvoice.toasts.patchFailed));
        return;
      }

      // Patch succeeded — clear any previous partial outcome
      setPartialOutcome(null);
      setPendingInvoiceId(null);

      // ── Step 3: Mark scans used locally then attach additional scans ──────
      const scanIds = selectedScans.map((s) => s.id);
      markScansAsUsedByInvoice(scanIds, invoiceId);

      // Attach scans 2..N (first is already attached via initialScan)
      for (const scan of selectedScans.slice(1)) {
        const additionalScanType = scanTypeToInvoiceScanType(scan.scanType);
        await attachScanToInvoice({
          invoiceId,
          payload: {
            type: additionalScanType,
            location: scan.blobUrl,
            additionalMetadata: {},
          },
        }).catch((attachError: unknown) => {
          console.warn("Non-critical: failed to attach additional scan", attachError);
        });
      }

      // Persist attachment metadata to blob storage (fire-and-forget)
      for (const scan of selectedScans) {
        updateScan({
          scanId: scan.id,
          metadataAdd: {
            status: ScanMetadataStatus.ATTACHED,
            attachedAt: new Date(),
            attachedBy: scan.userIdentifier,
            attachedTo: invoiceId,
          },
          metadataRemove: [
            ScanMetadataKey.DETACHED_AT,
            ScanMetadataKey.DETACHED_BY,
            ScanMetadataKey.DETACHED_FROM,
            ScanMetadataKey.ARCHIVED_AT,
            ScanMetadataKey.ARCHIVED_BY,
          ],
        }).catch((metaError: unknown) => {
          console.warn("Failed to persist scan attachment metadata (non-critical):", metaError);
        });
      }

      // ── Step 4: Fire-and-forget analysis ─────────────────────────────────
      // D4: When a manual classification was applied, disable invoiceClassification
      // to prevent the analysis pipeline from overwriting the user's explicit choice.
      analyzeInvoice({
        invoiceIdentifier: invoiceId,
        profile: "comprehensive",
        ...(classificationSelection !== null ? {overrides: {invoiceClassification: false}} : {}),
      }).catch((analysisError: unknown) => {
        console.error("Background invoice analysis failed (non-critical):", analysisError);
      });

      toast.success(t((m) => m.forms.invoices.createInvoice.toasts.created));

      // ── Step 5: Navigate ──────────────────────────────────────────────────
      router.push(`/domains/invoices/view-invoice/${invoiceId}`);
    } catch (error: unknown) {
      console.error("Error creating invoice:", error);
      toast.error(
        error instanceof Error ? error.message : t((m) => m.forms.invoices.createInvoice.errors.createFailed),
      );
    } finally {
      setIsCreating(false);
    }
  }, [selectedScans, invoiceDetails, classificationSelection, pendingInvoiceId, markScansAsUsedByInvoice, router, t]);

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
      setPaymentType,
      setTransactionDate,
      setDescription,
      classificationSelection,
      setClassification,
      isCreating,
      partialOutcome,
      createInvoiceWithScans,
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
      setPaymentType,
      setTransactionDate,
      setDescription,
      classificationSelection,
      setClassification,
      isCreating,
      partialOutcome,
      createInvoiceWithScans,
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

// Re-export ClassificationSystem for use in child components without deep imports
export {ClassificationSystem};
