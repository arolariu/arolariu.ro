/** @format */

"use client";

import {createContext, useCallback, useContext, useMemo, useState, type ReactNode} from "react";

/**
 * DialogType is a union type representing the different types of dialogs that can be opened.
 * Each string literal corresponds to a specific dialog type.
 * The null value indicates that no dialog is currently open.
 * This is useful for managing the state of the dialog in the application.
 */
export type DialogType =
  | "share"
  | "merchant"
  | "merchantReceipts"
  | "recipe"
  | "metadata"
  | "analysis"
  | "editItems"
  | "delete"
  | "analysisOptions"
  | "shareAnalytics"
  | "feedback"
  | null; // null is used to indicate no dialog is open

/**
 * Interface representing the value of the Dialog context.
 */
interface DialogContextValue {
  currentDialog: DialogType;
  isOpen: (dialog: DialogType) => boolean;
  openDialog: (dialog: DialogType) => void;
  closeDialog: () => void;
}

/**
 * DialogContext is a React context that provides the current dialog state and functions to manage it.
 * It is initialized with default values, which can be overridden by the provider.
 */
const DialogContext = createContext<DialogContextValue>({
  currentDialog: null,
  isOpen: () => false,
  openDialog: () => {},
  closeDialog: () => {},
});

/**
 * DialogProvider component that manages dialog state for the application.
 * This component creates a context that tracks which dialog is currently open
 * and provides methods to open and close dialogs.
 *
 * @component
 * @example
 * ```tsx
 * // Wrap your component tree with DialogProvider
 * <DialogProvider>
 *   <YourApp />
 * </DialogProvider>
 * ```
 *
 * @param props - The component props
 * @param props.children - The child components to be wrapped by the provider
 * @returns A context provider component that manages dialog state
 */
export function DialogProvider({children}: Readonly<{children: ReactNode}>) {
  const [currentDialog, setCurrentDialog] = useState<DialogType>(null);

  /**
   * Check to see if a specific dialog is open.
   * This function takes a dialog type as an argument and returns a boolean indicating
   * whether that dialog is currently open.
   * It uses the currentDialog state to determine if the dialog is open.
   */
  const isOpen = useCallback((dialog: DialogType) => currentDialog === dialog, [currentDialog]);

  /**
   * This function tries to open a dialog.
   * If there is already a dialog open, it does nothing.
   * If there is no dialog open, it sets the currentDialog state to the new dialog.
   * This is useful for preventing multiple dialogs from being open at the same time.
   * It uses the setCurrentDialog function to update the state.
   */
  const openDialog = useCallback((dialog: DialogType) => {
    setCurrentDialog((current) => {
      if (current === null) return dialog;
      return current;
    });
  }, []);

  /**
   * This function closes the currently open dialog.
   * It sets the currentDialog state back to null,
   * indicating that no dialog is currently open.
   * This is useful for resetting the dialog state when a dialog is closed.
   * It uses the setCurrentDialog function to update the state.
   * This function does not take any arguments.
   */
  const closeDialog = useCallback(() => setCurrentDialog(null), []);

  // The context value
  const value = useMemo(
    () => ({
      currentDialog,
      isOpen,
      openDialog,
      closeDialog,
    }),
    [currentDialog],
  );

  return <DialogContext.Provider value={value}>{children}</DialogContext.Provider>;
}

// Custom hook for consuming the context
function useDialogs() {
  const context = useContext(DialogContext);
  if (context === undefined) {
    throw new Error("useDialogs must be used within a DialogProvider");
  }

  return context;
}

/**
 * useDialog is a custom hook that provides an interface for managing dialog state.
 * It returns an object containing the current dialog state and functions to open and close dialogs.
 *
 * @param dialogType - The type of dialog to manage
 * @returns An object containing the current dialog state and functions to open and close dialogs
 *
 * @example
 * const {isOpen, open, close} = useDialog("share");
 */
export function useDialog(dialogType: Exclude<DialogType, null>) {
  const {currentDialog, isOpen, openDialog, closeDialog} = useDialogs();

  return {
    currentDialog,
    isOpen: isOpen(dialogType),
    open: () => openDialog(dialogType),
    close: closeDialog,
  } as const;
}
