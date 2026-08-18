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
import {AnalysisProfile, type ClassificationSelection, InvoiceCategory, PaymentType} from "@/types/invoices";
import {type CachedScan, ScanMetadataKey, ScanMetadataStatus, ScanStatus} from "@/types/scans";
import {toast} from "@arolariu/components";
import {useTranslations} from "next-intl-selector";
import {useRouter} from "next/navigation";
import {createContext, useCallback, useContext, useMemo, useState, type ReactNode} from "react";
import {analyzeInvoice, createInvoice, patchInvoice} from "../../_actions/invoices";
import {updateScan} from "../../_actions/scans";
import {scanTypeToInvoiceScanType} from "../../_utils/mimeTypeUtilities";

/**
 * Wizard step type definition.
 */
type WizardStep = "select-scans" | "details" | "review";

/**
 * Invoice details form data.
 */
interface InvoiceDetails {
  name: string;
  category: InvoiceCategory;
  classification: ClassificationSelection | null;
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
  setCategory: (category: InvoiceCategory) => void;
  setClassification: (classification: ClassificationSelection | null) => void;
  setPaymentType: (type: PaymentType) => void;
  setTransactionDate: (date: Date) => void;
  setDescription: (desc: string) => void;

  // Invoice creation
  isCreating: boolean;
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

  // Invoice details state
  const [invoiceDetails, setInvoiceDetails] = useState<InvoiceDetails>(() => ({
    name: "",
    category: InvoiceCategory.NOT_DEFINED,
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

  const setCategory = useCallback((category: InvoiceCategory) => {
    setInvoiceDetails((prev) => ({...prev, category}));
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

  // Create invoice orchestration
  const createInvoiceWithScans = useCallback(async () => {
    setIsCreating(true);
    try {
      // Use first scan as initial scan for invoice creation
      const [firstScan] = selectedScans;
      if (!firstScan) {
        toast.error(t((m) => m.forms.invoices.createInvoice.notifications.createFailed));
        return;
      }

      // Derive the invoice scan type through the centralized MIME utility.
      const scanType = scanTypeToInvoiceScanType(firstScan.scanType);

      // Create invoice with first scan and ALL invoice details in metadata
      // Note: All form fields (name, category, paymentType, transactionDate, description)
      // are included in metadata. Backend should extract these to populate top-level Invoice fields.
      const result = await createInvoice({
        initialScan: {
          scanType,
          location: firstScan.blobUrl,
          metadata: {},
        },
        metadata: {
          isImportant: "false",
          requiresAnalysis: "true",
          name: invoiceDetails.name,
          category: invoiceDetails.category.toString(),
          paymentType: invoiceDetails.paymentType.toString(),
          transactionDate: invoiceDetails.transactionDate.toISOString(),
          description: invoiceDetails.description,
        },
      });

      if (!result.success) {
        toast.error(t((m) => m.forms.invoices.createInvoice.notifications.createFailed));
        return;
      }
      const invoice = result.data;

      if (invoiceDetails.classification !== null) {
        const classificationResult = await patchInvoice({
          invoiceId: invoice.id,
          payload: {classification: invoiceDetails.classification},
        });
        if (!classificationResult.success) {
          toast.error(t((m) => m.forms.invoices.createInvoice.notifications.classificationNotSaved));
        }
      }

      // Mark scans as used in local store (immediate UI update)
      const scanIds = selectedScans.map((s) => s.id);
      markScansAsUsedByInvoice(scanIds, invoice.id);

      // Persist attachment metadata to blob storage (fire-and-forget)
      for (const scan of selectedScans) {
        updateScan({
          scanId: scan.id,
          metadataAdd: {
            status: ScanMetadataStatus.ATTACHED,
            attachedAt: new Date(),
            attachedBy: invoice.userIdentifier,
            attachedTo: invoice.id,
          },
          metadataRemove: [
            ScanMetadataKey.DETACHED_AT,
            ScanMetadataKey.DETACHED_BY,
            ScanMetadataKey.DETACHED_FROM,
            ScanMetadataKey.ARCHIVED_AT,
            ScanMetadataKey.ARCHIVED_BY,
          ],
        }).catch(() => undefined);
      }

      // Await only the analysis endpoint's durable HTTP 202 acknowledgement.
      // This never waits for OCR or worker completion, but prevents navigation
      // from terminating the enqueue request before it reaches durable storage.
      const analysisResult = await analyzeInvoice({
        invoiceIdentifier: invoice.id,
        request: {profile: AnalysisProfile.Comprehensive, overrides: {}},
      }).catch(() => null);

      if (analysisResult?.success) {
        toast.success(t((m) => m.forms.invoices.createInvoice.notifications.createdAndAnalysisQueued));
      } else {
        toast.error(t((m) => m.forms.invoices.createInvoice.notifications.analysisNotQueued));
      }

      router.push(`/domains/invoices/view-invoice/${invoice.id}`);
    } catch {
      toast.error(t((m) => m.forms.invoices.createInvoice.notifications.createFailed));
    } finally {
      setIsCreating(false);
    }
  }, [selectedScans, invoiceDetails, markScansAsUsedByInvoice, router]);

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
      setCategory,
      setClassification,
      setPaymentType,
      setTransactionDate,
      setDescription,
      isCreating,
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
      setCategory,
      setClassification,
      setPaymentType,
      setTransactionDate,
      setDescription,
      isCreating,
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
