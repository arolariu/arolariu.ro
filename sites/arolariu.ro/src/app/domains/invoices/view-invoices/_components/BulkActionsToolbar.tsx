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
import {useTranslations} from "next-intl-selector";
import {useCallback, useState} from "react";
import {TbCategory, TbDownload, TbTrash, TbX} from "react-icons/tb";
import {useShallow} from "zustand/react/shallow";
import {useDialog} from "../../_contexts/DialogContext";
import styles from "./BulkActionsToolbar.module.scss";
import { useInvoiceDelete } from "../../_hooks/invoice";
import { patchInvoice } from "../../_actions/invoices";

/**
 * Toolbar that appears when invoices are selected in the view-invoices list.
 * Provides bulk actions like export, delete, and category change.
 *
 * @remarks
 * **State Management:**
 * - Reads `selectedInvoices` from Zustand store via `useShallow`
 * - Uses `clearSelectedInvoices` and `updateInvoice` store actions
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
  const t = useTranslations();
  const {open: openExportDialog} = useDialog("VIEW_INVOICES__EXPORT");

  // Use shallow selector to optimize re-renders
  const {
    selectedEntities: selectedInvoices,
    clearSelectedEntities: clearSelectedInvoices,
    setSelectedEntities: setSelectedInvoices,
    updateEntity: updateInvoice,
  } = useInvoicesStore(
    useShallow((state) => ({
      selectedEntities: state.selectedEntities,
      clearSelectedEntities: state.clearSelectedEntities,
      setSelectedEntities: state.setSelectedEntities,
      updateEntity: state.updateEntity,
    })),
  );

  const {deleteInvoiceCallback, isDeleting} = useInvoiceDelete();
  const [isCategoryChanging, setIsCategoryChanging] = useState(false);

  /**
   * Opens the export dialog with selected invoices.
   */
  const handleExport = useCallback(() => {
    openExportDialog();
  }, [openExportDialog, selectedInvoices]);

  /**
   * Handles bulk deletion of selected invoices.
   */
  const handleDelete = useCallback(async () => {
    const invoiceIds = selectedInvoices.map((invoice) => invoice.id);

    const {failedIds} = await deleteInvoiceCallback(invoiceIds);

    if (failedIds.length === 0) {
      clearSelectedInvoices();
      return;
    }

    const failedInvoices = selectedInvoices.filter((invoice) => failedIds.includes(invoice.id));
    setSelectedInvoices(failedInvoices);
  }, [selectedInvoices, deleteInvoiceCallback, clearSelectedInvoices, setSelectedInvoices]);

  /**
   * Handles bulk category change for selected invoices.
   *
   * @param newCategory - The new category to apply to all selected invoices
   */
  const handleCategoryChange = useCallback(
    async (newCategory: string) => {
      setIsCategoryChanging(true);
      const category = Number.parseInt(newCategory, 10) as InvoiceCategory;
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
          toast.success(t((m) => m["IMS--List"].bulkActions.categoryChanged, {count: successCount}));
        } else if (successCount === 0) {
          toast.error(t((m) => m["IMS--List"].bulkActions.categoryChangeError));
        } else {
          toast.success(t((m) => m["IMS--List"].bulkActions.categoryPartialSuccess, {success: String(successCount), failed: String(failureCount)}));
        }

        clearSelectedInvoices();
      } catch (error) {
        console.error("Bulk category change error:", error);
        toast.error(t((m) => m["IMS--List"].bulkActions.categoryChangeError));
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
            <span className={styles["selectedCount"]}>{t((m) => m["IMS--List"].bulkActions.selected, {count: selectedInvoices.length})}</span>
            <Button
              variant='ghost'
              size='sm'
              onClick={clearSelectedInvoices}
              className={styles["clearButton"]}
              aria-label={t((m) => m["IMS--List"].bulkActions.clearSelection)}>
              <TbX className={styles["icon"]} />
              <span className={styles["hiddenMobile"]}>{t((m) => m["IMS--List"].bulkActions.clearSelection)}</span>
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
              aria-label={t((m) => m["IMS--List"].bulkActions.export)}>
              <TbDownload className={styles["icon"]} />
              <span className={styles["hiddenMobile"]}>{t((m) => m["IMS--List"].bulkActions.export)}</span>
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
                    aria-label={t((m) => m["IMS--List"].bulkActions.delete)}>
                    <TbTrash className={styles["icon"]} />
                    <span className={styles["hiddenMobile"]}>{t((m) => m["IMS--List"].bulkActions.delete)}</span>
                  </Button>
                }
              />
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>{t((m) => m["IMS--List"].bulkActions.deleteConfirm.title)}</AlertDialogTitle>
                  <AlertDialogDescription>{t((m) => m["IMS--List"].bulkActions.deleteConfirm.description, {count: selectedInvoices.length})}</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>{t((m) => m["IMS--List"].bulkActions.deleteConfirm.cancel)}</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDelete}>{t((m) => m["IMS--List"].bulkActions.deleteConfirm.confirm)}</AlertDialogAction>
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
                  aria-label={t((m) => m["IMS--List"].bulkActions.changeCategory)}>
                  <SelectValue placeholder={t((m) => m["IMS--List"].bulkActions.changeCategory)} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={InvoiceCategory.NOT_DEFINED.toString()}>{t((m) => m["IMS--List"].bulkActions.categories.notDefined)}</SelectItem>
                  <SelectItem value={InvoiceCategory.GROCERY.toString()}>{t((m) => m["IMS--List"].bulkActions.categories.grocery)}</SelectItem>
                  <SelectItem value={InvoiceCategory.FAST_FOOD.toString()}>{t((m) => m["IMS--List"].bulkActions.categories.fastFood)}</SelectItem>
                  <SelectItem value={InvoiceCategory.HOME_CLEANING.toString()}>{t((m) => m["IMS--List"].bulkActions.categories.homeCleaning)}</SelectItem>
                  <SelectItem value={InvoiceCategory.CAR_AUTO.toString()}>{t((m) => m["IMS--List"].bulkActions.categories.carAuto)}</SelectItem>
                  <SelectItem value={InvoiceCategory.OTHER.toString()}>{t((m) => m["IMS--List"].bulkActions.categories.other)}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
