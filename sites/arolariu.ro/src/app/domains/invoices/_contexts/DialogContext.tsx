"use client";

import {createContext, use, useCallback, useMemo, useRef, useState, type ReactNode} from "react";

/**
 * DialogType is a union type representing the different types of dialogs that can be opened.
 * Each string literal corresponds to a specific dialog type.
 * The null value indicates that no dialog is currently open.
 * This is useful for managing the state of the dialog in the application.
 */
export type DialogType = Readonly<
  | "EDIT_INVOICE__ANALYSIS"
  | "EDIT_INVOICE__IMAGE"
  | "EDIT_INVOICE__SCAN"
  | "EDIT_INVOICE__MERCHANT"
  | "EDIT_INVOICE__MERCHANT_INVOICES"
  | "EDIT_INVOICE__RECIPE"
  | "EDIT_INVOICE__METADATA"
  | "EDIT_INVOICE__ITEMS"
  | "EDIT_INVOICE__FEEDBACK"
  | "VIEW_INVOICE__SHARE_ANALYTICS"
  | "VIEW_INVOICES__IMPORT"
  | "VIEW_INVOICES__EXPORT"
  | "SHARED__INVOICE_DELETE"
  | "SHARED__INVOICE_SHARE"
  | null
>; // null is used to indicate no dialog is open

export type DialogMode = Readonly<"view" | "add" | "edit" | "delete" | "share"> | null;

// eslint-disable-next-line sonarjs/redundant-type-aliases
export type DialogPayload = unknown;

type DialogCurrent = {
  type: DialogType;
  mode: DialogMode;
  payload: DialogPayload;
};

/**
 * Interface representing the value of the Dialog context.
 */
interface DialogContextValue {
  currentDialog: DialogCurrent;
  isOpen: (dialog: DialogType) => boolean;
  openDialog: (dialog: DialogType, mode?: DialogMode, payload?: DialogPayload) => void;
  closeDialog: () => void;
}

/**
 * DialogContext is a React context that provides the current dialog state and functions to manage it.
 * It is initialized with default values, which can be overridden by the provider.
 */
const DialogContext = createContext<DialogContextValue | undefined>(undefined);

/**
 * DialogProvider component that manages dialog state for the application.
 * This component creates a context that tracks which dialog is currently open
 * and provides methods to open and close dialogs.
 * @example
 * ```tsx
 * // Wrap your component tree with DialogProvider
 * <DialogProvider>
 *   <YourApp />
 * </DialogProvider>
 * ```
 * @returns A context provider component that manages dialog state
 */
export function DialogProvider({children}: Readonly<{children: ReactNode}>) {
  const [dialogState, setDialogState] = useState<DialogCurrent>({
    type: null,
    mode: null,
    payload: null,
  });

  // Create a stable reference to the current dialog
  const currentDialog = useRef<DialogCurrent>({
    type: null,
    mode: null,
    payload: null,
  });

  /**
   * Check to see if a specific dialog is open.
   * This function takes a dialog type as an argument and returns a boolean indicating
   * whether that dialog is currently open.
   * It uses the currentDialog state to determine if the dialog is open.
   */
  const isOpen = useCallback((dialog: DialogType) => currentDialog.current.type === dialog, []);

  /**
   * This function tries to open a dialog.
   * If there is already a dialog open, it does nothing.
   * If there is no dialog open, it sets the currentDialog state to the new dialog.
   * This is useful for preventing multiple dialogs from being open at the same time.
   * It uses the setCurrentDialog function to update the state.
   */
  const openDialog = useCallback((dialog: DialogType, mode: DialogMode = "view", payload: DialogPayload = null) => {
    if (currentDialog.current.type === null) {
      // Update both ref and state atomically
      currentDialog.current = {type: dialog, mode, payload};
      setDialogState(currentDialog.current);
    }
  }, []);

  /**
   * This function closes the currently open dialog.
   * It sets the currentDialog state back to null,
   * indicating that no dialog is currently open.
   * This is useful for resetting the dialog state when a dialog is closed.
   * It uses the setCurrentDialog function to update the state.
   * This function does not take any arguments.
   */
  const closeDialog = useCallback(() => {
    currentDialog.current = {type: null, mode: null, payload: null};
    setDialogState(currentDialog.current);
  }, []);

  // The context value
  const value = useMemo(
    () => ({
      currentDialog: currentDialog.current,
      isOpen,
      openDialog,
      closeDialog,
    }),

    /**
     * Only dialogState is used in the dependency array.
     * This is to ensure that the context value is updated when the dialog state changes.
     * The other functions (isOpen, openDialog, closeDialog) are stable and do not need to be re-created.
     */
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [dialogState],
  );

  return <DialogContext value={value}>{children}</DialogContext>;
}

/**
 * Custom hook to use the Dialog context, providing access to the current dialog state and functions to manage it.
 * @returns The current dialog state and functions to manage it.
 */
export function useDialogs() {
  const context = use(DialogContext);
  if (context === undefined) {
    throw new Error("useDialogs must be used within a DialogProvider");
  }

  return context;
}

/**
 * Is a custom hook that provides an interface for managing dialog state.
 * It returns an object containing the current dialog state and functions to open and close dialogs.
 * @param dialogType The type of dialog to manage (e.g., "share", "merchant", "recipe")
 * @param dialogMode Optional mode for the dialog (e.g., "view", "add", "edit", "delete")
 * @param dialogPayload Optional payload to pass (e.g., data to be displayed in the dialog)
 * @returns An object containing the current dialog state and functions to open and close dialogs
 * @example
 * const {isOpen, open, close} = useDialog("EDIT_INVOICE__SCAN", "add", invoice);
 */
export function useDialog(dialogType: Exclude<DialogType, null>, dialogMode?: Exclude<DialogMode, null>, dialogPayload?: DialogPayload) {
  const {currentDialog, isOpen, openDialog, closeDialog} = useDialogs();

  return {
    currentDialog,
    isOpen: isOpen(dialogType),
    // We make the open function easier to call for the consumer.
    open: () => openDialog(dialogType, dialogMode, dialogPayload),
    close: closeDialog,
  } as const;
}
