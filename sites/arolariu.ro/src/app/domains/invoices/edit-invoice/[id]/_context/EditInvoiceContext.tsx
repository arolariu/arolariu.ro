"use client";

/**
 * @fileoverview Edit invoice context for tracking pending modifications.
 * @module domains/invoices/edit-invoice/[id]/context/EditInvoiceContext
 *
 * @remarks
 * Provides centralized state management for invoice editing:
 * - Tracks all pending field modifications across components
 * - Enables a single "Save" action to persist all changes
 * - Prevents prop drilling of edit handlers
 *
 * **Design Pattern:**
 * Components update individual fields via context setters.
 * The InvoiceHeader's Save button gathers all changes and calls patchInvoice.
 *
 * @see {@link useEditInvoiceContext} for consuming the context
 * @see patchInvoice server action for persistence
 */

import patchInvoice from "@/lib/actions/invoices/patchInvoice";
import type {Invoice, InvoiceCategory, Merchant, PaymentType} from "@/types/invoices";
import {toast} from "@arolariu/components";
import {createContext, use, useCallback, useMemo, useState} from "react";

/**
 * Tracks which fields have been modified and their new values.
 *
 * @remarks
 * Only modified fields are included. Undefined means "no change".
 * This maps directly to the PatchInvoicePayload shape.
 */
interface PendingChanges {
  name?: string;
  description?: string;
  category?: InvoiceCategory;
  paymentType?: PaymentType;
  isImportant?: boolean;
  transactionDate?: Date;
}

/**
 * Context value shape for edit invoice functionality.
 */
interface EditInvoiceContextValue {
  /** The original invoice being edited */
  readonly invoice: Invoice;
  /** The merchant associated with the invoice */
  readonly merchant: Merchant;
  /** Current pending changes (not yet saved) */
  readonly pendingChanges: PendingChanges;
  /** Whether there are unsaved changes */
  readonly hasChanges: boolean;
  /** Whether a save operation is in progress */
  readonly isSaving: boolean;

  // Field setters
  setName: (name: string) => void;
  setDescription: (description: string) => void;
  setCategory: (category: InvoiceCategory) => void;
  setPaymentType: (paymentType: PaymentType) => void;
  setIsImportant: (isImportant: boolean) => void;
  setTransactionDate: (date: Date) => void;

  // Actions
  saveChanges: () => Promise<boolean>;
  discardChanges: () => void;
}

const EditInvoiceContext = createContext<EditInvoiceContextValue | undefined>(undefined);

interface EditInvoiceContextProviderProps {
  readonly invoice: Invoice;
  readonly merchant: Merchant;
  readonly children: React.ReactNode;
}

/**
 * Provider component for edit invoice functionality.
 *
 * @remarks
 * Wraps the edit-invoice page components to provide:
 * - Original invoice/merchant data
 * - Pending changes tracking
 * - Save/discard actions
 *
 * @param props - Component props with invoice, merchant, and children
 * @returns Provider component wrapping children
 */
export function EditInvoiceContextProvider({invoice, merchant, children}: Readonly<EditInvoiceContextProviderProps>): React.JSX.Element {
  const [pendingChanges, setPendingChanges] = useState<PendingChanges>({});
  const [isSaving, setIsSaving] = useState(false);

  // Check if any field has been modified
  const hasChanges = useMemo(() => {
    return Object.keys(pendingChanges).length > 0;
  }, [pendingChanges]);

  /**
   * Generic field setter that handles the common pattern:
   * - Compare new value with original
   * - If same, remove from pending changes
   * - If different, add to pending changes
   */
  const createFieldSetter = useCallback(
    <K extends keyof PendingChanges>(
      field: K,
      originalValue: PendingChanges[K],
      compareFn?: (a: PendingChanges[K], b: PendingChanges[K]) => boolean,
    ) => {
      return (newValue: PendingChanges[K]) => {
        setPendingChanges((prev) => {
          const isEqual = compareFn ? compareFn(newValue, originalValue) : newValue === originalValue;
          if (isEqual) {
            const {[field]: _, ...rest} = prev;
            return rest;
          }
          return {...prev, [field]: newValue};
        });
      };
    },
    [],
  );

  // Field setters using the generic helper
  const setName = useMemo(() => createFieldSetter("name", invoice.name), [createFieldSetter, invoice.name]);
  const setDescription = useMemo(() => createFieldSetter("description", invoice.description), [createFieldSetter, invoice.description]);
  const setCategory = useMemo(() => createFieldSetter("category", invoice.category), [createFieldSetter, invoice.category]);
  const setPaymentType = useMemo(
    () => createFieldSetter("paymentType", invoice.paymentInformation.paymentType),
    [createFieldSetter, invoice.paymentInformation.paymentType],
  );
  const setIsImportant = useMemo(() => createFieldSetter("isImportant", invoice.isImportant), [createFieldSetter, invoice.isImportant]);
  const setTransactionDate = useMemo(
    () =>
      createFieldSetter("transactionDate", new Date(invoice.paymentInformation.transactionDate), (a, b) =>
        a instanceof Date && b instanceof Date ? a.toDateString() === b.toDateString() : false,
      ),
    [createFieldSetter, invoice.paymentInformation.transactionDate],
  );

  const discardChanges = useCallback(() => {
    setPendingChanges({});
  }, []);

  const saveChanges = useCallback(async (): Promise<boolean> => {
    if (!hasChanges) {
      toast.info("No changes to save");
      return true;
    }

    setIsSaving(true);

    try {
      // Build the patch payload
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const payload: Record<string, any> = {};

      if (pendingChanges.name !== undefined) {
        payload["name"] = pendingChanges.name;
      }
      if (pendingChanges.description !== undefined) {
        payload["description"] = pendingChanges.description;
      }
      if (pendingChanges.category !== undefined) {
        payload["category"] = pendingChanges.category;
      }
      if (pendingChanges.isImportant !== undefined) {
        payload["isImportant"] = pendingChanges.isImportant;
      }
      if (pendingChanges.paymentType !== undefined) {
        // Payment type needs to be wrapped in paymentInformation
        payload["paymentInformation"] = {
          ...invoice.paymentInformation,
          paymentType: pendingChanges.paymentType,
        };
      }
      if (pendingChanges.transactionDate !== undefined) {
        // Transaction date needs to be wrapped in paymentInformation
        payload["paymentInformation"] = {
          ...(payload["paymentInformation"] ?? invoice.paymentInformation),
          transactionDate: pendingChanges.transactionDate.toISOString(),
        };
      }

      const result = await patchInvoice({
        invoiceId: invoice.id,
        payload,
      });

      if (result.success) {
        toast.success("Invoice updated successfully");
        setPendingChanges({});
        // Trigger a page refresh to get the updated data
        globalThis.window.location.reload();
        return true;
      } else {
        toast.error(result.error);
        return false;
      }
    } catch (error) {
      console.error("Failed to save invoice:", error);
      toast.error("Failed to save changes");
      return false;
    } finally {
      setIsSaving(false);
    }
  }, [hasChanges, pendingChanges, invoice]);

  const value = useMemo(
    () => ({
      invoice,
      merchant,
      pendingChanges,
      hasChanges,
      isSaving,
      setName,
      setDescription,
      setCategory,
      setPaymentType,
      setIsImportant,
      setTransactionDate,
      saveChanges,
      discardChanges,
    }),
    [
      invoice,
      merchant,
      pendingChanges,
      hasChanges,
      isSaving,
      setName,
      setDescription,
      setCategory,
      setPaymentType,
      setIsImportant,
      setTransactionDate,
      saveChanges,
      discardChanges,
    ],
  );

  return <EditInvoiceContext value={value}>{children}</EditInvoiceContext>;
}

/**
 * Custom hook to consume edit invoice context.
 *
 * @remarks
 * Must be called within an EditInvoiceContextProvider tree.
 *
 * @returns The edit invoice context value
 * @throws Error if used outside of provider
 *
 * @example
 * ```tsx
 * const { pendingChanges, setPaymentType, saveChanges } = useEditInvoiceContext();
 * ```
 */
export function useEditInvoiceContext(): EditInvoiceContextValue {
  const context = use(EditInvoiceContext);
  if (context === undefined) {
    throw new Error("useEditInvoiceContext must be used within EditInvoiceContextProvider");
  }

  return context;
}
