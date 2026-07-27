"use client";

/**
 * @fileoverview Selection toolbar component for bulk scan actions.
 * @module app/domains/invoices/view-scans/_components/ScanSelectionToolbar
 */

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
  toast,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@arolariu/components";
import {motion} from "motion/react";
import {useTranslations} from "next-intl-selector";
import {useRouter} from "next/navigation";
import {useCallback, useState} from "react";
import {TbFileInvoice, TbTrash, TbX} from "react-icons/tb";
import {deleteScan} from "../../_actions/scans";
import {useScans} from "../_hooks/useScans";
import styles from "./ScanSelectionToolbar.module.scss";

type ScanSelectionToolbarProps = {
  onCreateInvoice: () => void;
};

/**
 * Toolbar that appears when scans are selected.
 * Provides bulk actions like create invoice, delete, and deselect all.
 */
export default function ScanSelectionToolbar({onCreateInvoice}: Readonly<ScanSelectionToolbarProps>): React.JSX.Element | null {
  const t = useTranslations();
  const router = useRouter();
  const {selectedScans, clearSelection, removeScan} = useScans();
  const [isDeleting, setIsDeleting] = useState(false);

  /**
   * Handles deletion of all selected scans.
   * Deletes scans in parallel, shows appropriate toast messages,
   * and refreshes the page to update the scan list.
   */
  const handleDeleteSelected = useCallback(async () => {
    setIsDeleting(true);
    try {
      const results = await Promise.allSettled(selectedScans.map((scan) => deleteScan({scanId: scan.id})));

      const succeeded = results.filter((r) => r.status === "fulfilled" && r.value.success).length;
      const failed = results.length - succeeded;

      // Remove successfully deleted scans from store
      results.forEach((result, index) => {
        const scan = selectedScans[index];
        if (scan && result.status === "fulfilled" && result.value.success) {
          removeScan(scan.id);
        }
      });

      if (failed === 0) {
        toast.success(t((m) => m.pages.invoices.viewScans.toolbar.delete.success, {count: String(succeeded)}));
      } else if (succeeded > 0) {
        toast.warning(t((m) => m.pages.invoices.viewScans.toolbar.delete.partial, {success: String(succeeded), failed: String(failed)}));
      } else {
        toast.error(t((m) => m.pages.invoices.viewScans.toolbar.delete.failed));
      }

      clearSelection(); // Clear the selection after deletion
      router.refresh(); // Refresh to update the scan list
    } catch (error) {
      console.error("Failed to delete scans:", error);
      toast.error(t((m) => m.pages.invoices.viewScans.toolbar.delete.error));
    } finally {
      setIsDeleting(false);
    }
  }, [selectedScans, clearSelection, removeScan, router, t]);

  if (selectedScans.length === 0) {
    return null;
  }

  return (
    <div className={styles["toolbar"]}>
      <div className={styles["toolbarContent"]}>
        <div className={styles["toolbarLeft"]}>
          <span className={styles["selectedCount"]}>
            <motion.span
              key={selectedScans.length}
              initial={{scale: 1.2}}
              animate={{scale: 1}}
              transition={{type: "spring", stiffness: 300, damping: 20}}>
              {selectedScans.length}
            </motion.span>{" "}
            {t((m) => m.pages.invoices.viewScans.toolbar.selected)}
          </span>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger
                render={
                  <Button
                    variant='ghost'
                    size='sm'
                    onClick={clearSelection}
                    className={styles["clearButton"]}>
                    <TbX className={styles["clearIcon"]} />
                    <span className={styles["hiddenMobile"]}>{t((m) => m.pages.invoices.viewScans.toolbar.clearSelection)}</span>
                  </Button>
                }
              />
              <TooltipContent>{t((m) => m.pages.invoices.viewScans.toolbar.clearSelection)}</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        <div className={styles["toolbarRight"]}>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger
                render={
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant='destructive'
                        size='sm'
                        disabled={isDeleting}>
                        <TbTrash />
                        <span className={styles["hiddenMobile"]}>
                          {t((m) => m.pages.invoices.viewScans.toolbar.delete.button, {count: String(selectedScans.length)})}
                        </span>
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>{t((m) => m.pages.invoices.viewScans.toolbar.delete.confirmTitle)}</AlertDialogTitle>
                        <AlertDialogDescription>
                          {t((m) => m.pages.invoices.viewScans.toolbar.delete.confirmDescription, {count: String(selectedScans.length)})}
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>{t((m) => m.pages.invoices.viewScans.toolbar.delete.cancel)}</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDeleteSelected}>
                          {t((m) => m.pages.invoices.viewScans.toolbar.delete.confirm)}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                }
              />
              <TooltipContent>
                {t((m) => m.pages.invoices.viewScans.toolbar.delete.button, {count: String(selectedScans.length)})}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger
                render={
                  <Button
                    onClick={onCreateInvoice}
                    className={styles["createButton"]}>
                    <TbFileInvoice className={styles["createIcon"]} />
                    <span className={styles["hiddenMobile"]}>
                      {selectedScans.length > 1
                        ? t((m) => m.pages.invoices.viewScans.toolbar.createInvoices)
                        : t((m) => m.pages.invoices.viewScans.toolbar.createInvoice)}
                    </span>
                    <span className={styles["visibleMobile"]}>
                      {t((m) => m.pages.invoices.viewScans.toolbar.createInvoice).split(" ")[0]}
                    </span>
                  </Button>
                }
              />
              <TooltipContent>
                {selectedScans.length > 1
                  ? t((m) => m.pages.invoices.viewScans.toolbar.createInvoices)
                  : t((m) => m.pages.invoices.viewScans.toolbar.createInvoice)}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>
    </div>
  );
}
