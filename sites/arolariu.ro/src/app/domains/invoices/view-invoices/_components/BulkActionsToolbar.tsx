"use client";

/**
 * @fileoverview Bulk actions toolbar component for invoice operations.
 * @module app/domains/invoices/view-invoices/_components/BulkActionsToolbar
 *
 * @remarks
 * This component provides a sticky bottom toolbar that appears when invoices
 * are selected in the view-invoices list. It enables bulk operations like:
 * - Export selected invoices
 * - Delete multiple invoices with confirmation
 * - Change category for multiple invoices at once
 *
 * The toolbar uses AnimatePresence for smooth entrance/exit animations and
 * follows the glass morphism design pattern with backdrop blur.
 *
 * @example
 * ```tsx
 * // Used in view-invoices/island.tsx
 * <DialogProvider>
 *   <ViewInvoicesContent />
 *   <DialogContainer />
 *   <BulkActionsToolbar />
 * </DialogProvider>
 * ```
 */

import deleteInvoice from "@/lib/actions/invoices/deleteInvoice";
import patchInvoice from "@/lib/actions/invoices/patchInvoice";
import {useInvoicesStore} from "@/stores";
import {InvoiceCategory} from "@/types/invoices";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
  Button,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  toast,
} from "@arolariu/components";
import {AnimatePresence, motion} from "motion/react";
import {useTranslations} from "next-intl";
import {useCallback, useState} from "react";
import {TbCategory, TbDownload, TbTrash, TbX} from "react-icons/tb";
import {useShallow} from "zustand/react/shallow";
import {useDialog} from "../../_contexts/DialogContext";
import styles from "./BulkActionsToolbar.module.scss";

/**
 * Toolbar that appears when invoices are selected in the view-invoices list.
 * Provides bulk actions like export, delete, and category change.
 *
 * @remarks
 * **State Management:**
 * - Reads `selectedInvoices` from Zustand store via `useShallow`
 * - Uses `clearSelectedInvoices`, `removeInvoice`, and `updateInvoice` store actions
 *
 * **Features:**
 * - Sticky bottom positioning with glass morphism
 * - Responsive design (icons only on mobile, icons+text on desktop)
 * - AnimatePresence for smooth slide-in/out animations
 * - Confirmation dialogs for destructive actions
 *
 * **Accessibility:**
 * - ARIA labels for icon-only buttons on mobile
 * - Keyboard navigation support via AlertDialog
 * - Clear visual feedback for actions
 *
 * @returns The bulk actions toolbar or null if no invoices are selected
 */
export default function BulkActionsToolbar(): React.JSX.Element | null {
  const t = useTranslations("Invoices.ViewInvoices.bulkActions");
  const {open: openExportDialog} = useDialog("VIEW_INVOICES__EXPORT");

  // Use shallow selector to optimize re-renders
  const {selectedInvoices, clearSelectedInvoices, removeInvoice, updateInvoice} = useInvoicesStore(
    useShallow((state) => ({
      selectedInvoices: state.selectedInvoices,
      clearSelectedInvoices: state.clearSelectedInvoices,
      removeInvoice: state.removeInvoice,
      updateInvoice: state.updateInvoice,
    })),
  );

  const [isDeleting, setIsDeleting] = useState(false);
  const [isCategoryChanging, setIsCategoryChanging] = useState(false);

  /**
   * Opens the export dialog with selected invoices.
   */
  const handleExport = useCallback(() => {
    openExportDialog();
  }, [openExportDialog, selectedInvoices]);

  /**
   * Handles bulk deletion of selected invoices.
   * Shows toast notifications for progress and completion.
   */
  const handleDelete = useCallback(async () => {
    setIsDeleting(true);
    const invoiceIds = selectedInvoices.map((invoice) => invoice.id);
    let successCount = 0;
    let failureCount = 0;

    try {
      // Delete each invoice sequentially
      for (const invoiceId of invoiceIds) {
        try {
          await deleteInvoice({invoiceId});
          removeInvoice(invoiceId);
          successCount++;
        } catch (error) {
          console.error(`Failed to delete invoice ${invoiceId}:`, error);
          failureCount++;
        }
      }

      // Show appropriate toast based on results
      if (failureCount === 0) {
        toast.success(t("deleteSuccess", {count: successCount}));
      } else if (successCount === 0) {
        toast.error(t("deleteError"));
      } else {
        toast.success(t("deletePartialSuccess", {success: String(successCount), failed: String(failureCount)}));
      }

      clearSelectedInvoices();
    } catch (error) {
      console.error("Bulk delete error:", error);
      toast.error(t("deleteError"));
    } finally {
      setIsDeleting(false);
    }
  }, [selectedInvoices, removeInvoice, clearSelectedInvoices, t]);

  /**
   * Handles bulk category change for selected invoices.
   *
   * @param newCategory - The new category to apply to all selected invoices
   */
  const handleCategoryChange = useCallback(
    async (newCategory: string) => {
      setIsCategoryChanging(true);
      const category = parseInt(newCategory, 10) as InvoiceCategory;
      const invoiceIds = selectedInvoices.map((invoice) => invoice.id);
      let successCount = 0;
      let failureCount = 0;

      try {
        // Update each invoice sequentially
        for (const invoiceId of invoiceIds) {
          try {
            const result = await patchInvoice({
              invoiceId,
              payload: {category},
            });

            if (result.success) {
              updateInvoice(invoiceId, {category});
              successCount++;
            } else {
              failureCount++;
            }
          } catch (error) {
            console.error(`Failed to update invoice ${invoiceId}:`, error);
            failureCount++;
          }
        }

        // Show appropriate toast based on results
        if (failureCount === 0) {
          toast.success(t("categoryChanged", {count: successCount}));
        } else if (successCount === 0) {
          toast.error(t("categoryChangeError"));
        } else {
          toast.success(t("categoryPartialSuccess", {success: String(successCount), failed: String(failureCount)}));
        }

        clearSelectedInvoices();
      } catch (error) {
        console.error("Bulk category change error:", error);
        toast.error(t("categoryChangeError"));
      } finally {
        setIsCategoryChanging(false);
      }
    },
    [selectedInvoices, updateInvoice, clearSelectedInvoices, t],
  );

  // Don't render if no invoices are selected
  if (selectedInvoices.length === 0) {
    return null;
  }

  return (
    <AnimatePresence>
      <motion.div
        className={styles["toolbar"]}
        initial={{y: 100, opacity: 0}}
        animate={{y: 0, opacity: 1}}
        exit={{y: 100, opacity: 0}}
        transition={{duration: 0.3, ease: "easeInOut"}}>
        <div className={styles["toolbarContent"]}>
          {/* Left side: Selection count and clear button */}
          <div className={styles["toolbarLeft"]}>
            <span className={styles["selectedCount"]}>{t("selected", {count: selectedInvoices.length})}</span>
            <Button
              variant='ghost'
              size='sm'
              onClick={clearSelectedInvoices}
              className={styles["clearButton"]}
              aria-label={t("clearSelection")}>
              <TbX className={styles["icon"]} />
              <span className={styles["hiddenMobile"]}>{t("clearSelection")}</span>
            </Button>
          </div>

          {/* Right side: Action buttons */}
          <div className={styles["toolbarRight"]}>
            {/* Export button */}
            <Button
              variant='outline'
              size='sm'
              onClick={handleExport}
              className={styles["actionButton"]}
              aria-label={t("export")}>
              <TbDownload className={styles["icon"]} />
              <span className={styles["hiddenMobile"]}>{t("export")}</span>
            </Button>

            {/* Delete button with confirmation dialog */}
            <AlertDialog>
              <AlertDialogTrigger
                render={
                  <Button
                    variant='destructive'
                    size='sm'
                    className={styles["actionButton"]}
                    disabled={isDeleting}
                    aria-label={t("delete")}>
                    <TbTrash className={styles["icon"]} />
                    <span className={styles["hiddenMobile"]}>{t("delete")}</span>
                  </Button>
                }
              />
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>{t("deleteConfirm.title")}</AlertDialogTitle>
                  <AlertDialogDescription>{t("deleteConfirm.description", {count: selectedInvoices.length})}</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>{t("deleteConfirm.cancel")}</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDelete}>{t("deleteConfirm.confirm")}</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            {/* Category change dropdown */}
            <div className={styles["categorySelect"]}>
              <TbCategory className={styles["categoryIcon"]} />
              <Select
                onValueChange={handleCategoryChange}
                disabled={isCategoryChanging}>
                <SelectTrigger
                  className={styles["selectTrigger"]}
                  aria-label={t("changeCategory")}>
                  <SelectValue placeholder={t("changeCategory")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={InvoiceCategory.NOT_DEFINED.toString()}>{t("categories.notDefined")}</SelectItem>
                  <SelectItem value={InvoiceCategory.GROCERY.toString()}>{t("categories.grocery")}</SelectItem>
                  <SelectItem value={InvoiceCategory.FAST_FOOD.toString()}>{t("categories.fastFood")}</SelectItem>
                  <SelectItem value={InvoiceCategory.HOME_CLEANING.toString()}>{t("categories.homeCleaning")}</SelectItem>
                  <SelectItem value={InvoiceCategory.CAR_AUTO.toString()}>{t("categories.carAuto")}</SelectItem>
                  <SelectItem value={InvoiceCategory.OTHER.toString()}>{t("categories.other")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
