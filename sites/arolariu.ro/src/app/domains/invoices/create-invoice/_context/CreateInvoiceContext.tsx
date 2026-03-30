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

import {createInvoice} from "@/lib/actions/invoices/createInvoice";
import {useScansStore} from "@/stores";
import {InvoiceCategory, InvoiceScanType, PaymentType} from "@/types/invoices";
import type {CachedScan} from "@/types/scans";
import {ScanStatus} from "@/types/scans";
import {toast} from "@arolariu/components";
import {useRouter} from "next/navigation";
import {createContext, useCallback, useContext, useMemo, useState, type ReactNode} from "react";

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
  const {scans, markScansAsUsedByInvoice} = useScansStore();

  // Filter to only READY scans
  const readyScans = useMemo(() => scans.filter((scan) => scan.status === ScanStatus.READY), [scans]);

  // Wizard state
  const [currentStep, setCurrentStep] = useState<WizardStep>("select-scans");
  const [selectedScans, setSelectedScans] = useState<CachedScan[]>([]);
  const [isCreating, setIsCreating] = useState(false);

  // Invoice details state
  const [invoiceDetails, setInvoiceDetails] = useState<InvoiceDetails>({
    name: "",
    category: InvoiceCategory.NOT_DEFINED,
    paymentType: PaymentType.Unknown,
    transactionDate: new Date(),
    description: "",
  });

  // Step navigation
  const goToStep = useCallback((step: WizardStep) => {
    setCurrentStep(step);
  }, []);

  const goNext = useCallback(() => {
    if (currentStep === "select-scans") {
      setCurrentStep("details");
      // Auto-suggest name from first scan
      if (selectedScans.length > 0 && !invoiceDetails.name) {
        const firstScan = selectedScans[0];
        if (firstScan) {
          const firstName = firstScan.name.replace(/\.[^/.]+$/, "");
          setInvoiceDetails((prev) => ({...prev, name: firstName}));
        }
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
      const firstScan = selectedScans[0];
      if (!firstScan) {
        throw new Error("No scans selected");
      }

      // Map scan type to InvoiceScanType enum
      let scanType = InvoiceScanType.UNKNOWN;
      if (firstScan.scanType === "JPEG") scanType = InvoiceScanType.JPEG;
      else if (firstScan.scanType === "PNG") scanType = InvoiceScanType.PNG;
      else if (firstScan.scanType === "PDF") scanType = InvoiceScanType.PDF;

      // Create invoice with first scan and ALL invoice details in metadata
      // UX-6 FIX VERIFIED: All form fields are properly included in metadata
      // - name, category, paymentType, transactionDate (ISO), description
      // Backend should extract these from metadata to populate top-level Invoice fields
      const invoice = await createInvoice({
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

      // Mark scans as used
      const scanIds = selectedScans.map((s) => s.id);
      markScansAsUsedByInvoice(scanIds, invoice.id);

      toast.success(`Invoice "${invoiceDetails.name}" has been created successfully.`);

      // Navigate to view invoice page — user can trigger analysis from there
      router.push(`/domains/invoices/view-invoice/${invoice.id}`);
    } catch (error) {
      console.error("Error creating invoice:", error);
      toast.error(error instanceof Error ? error.message : "Failed to create invoice. Please try again.");
    } finally {
      setIsCreating(false);
    }
  }, [selectedScans, invoiceDetails, markScansAsUsedByInvoice, router]);

  const contextValue: CreateInvoiceContextValue = {
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
    setPaymentType,
    setTransactionDate,
    setDescription,
    isCreating,
    createInvoiceWithScans,
  };

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
