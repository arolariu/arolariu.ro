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
} from "@arolariu/components";
import {AnimatePresence, motion} from "motion/react";
import {useTranslations} from "next-intl-selector";
import {useCallback} from "react";
import {TbDownload, TbTrash, TbX} from "react-icons/tb";
import {useShallow} from "zustand/react/shallow";
import {useDialog} from "../../_contexts/DialogContext";
import {useInvoiceDelete} from "../../_hooks/invoice";
import styles from "./BulkActionsToolbar.module.scss";

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
  } = useInvoicesStore(
    useShallow((state) => ({
      selectedEntities: state.selectedEntities,
      clearSelectedEntities: state.clearSelectedEntities,
      setSelectedEntities: state.setSelectedEntities,
    })),
  );

  const {deleteInvoiceCallback, isDeleting} = useInvoiceDelete();

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
            <span className={styles["selectedCount"]}>
              {t((m) => m.pages.invoices.viewInvoices.bulkActions.selected, {count: selectedInvoices.length})}
            </span>
            <Button
              variant='ghost'
              size='sm'
              onClick={clearSelectedInvoices}
              className={styles["clearButton"]}
              aria-label={t((m) => m.pages.invoices.viewInvoices.bulkActions.clearSelection)}>
              <TbX className={styles["icon"]} />
              <span className={styles["hiddenMobile"]}>{t((m) => m.pages.invoices.viewInvoices.bulkActions.clearSelection)}</span>
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
              aria-label={t((m) => m.pages.invoices.viewInvoices.bulkActions.export)}>
              <TbDownload className={styles["icon"]} />
              <span className={styles["hiddenMobile"]}>{t((m) => m.pages.invoices.viewInvoices.bulkActions.export)}</span>
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
                    aria-label={t((m) => m.pages.invoices.viewInvoices.bulkActions.delete)}>
                    <TbTrash className={styles["icon"]} />
                    <span className={styles["hiddenMobile"]}>{t((m) => m.pages.invoices.viewInvoices.bulkActions.delete)}</span>
                  </Button>
                }
              />
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>{t((m) => m.pages.invoices.viewInvoices.bulkActions.deleteConfirm.title)}</AlertDialogTitle>
                  <AlertDialogDescription>
                    {t((m) => m.pages.invoices.viewInvoices.bulkActions.deleteConfirm.description, {count: selectedInvoices.length})}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>{t((m) => m.pages.invoices.viewInvoices.bulkActions.deleteConfirm.cancel)}</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDelete}>
                    {t((m) => m.pages.invoices.viewInvoices.bulkActions.deleteConfirm.confirm)}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
