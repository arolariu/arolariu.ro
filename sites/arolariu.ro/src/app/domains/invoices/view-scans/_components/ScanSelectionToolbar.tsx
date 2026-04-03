"use client";

/**
 * @fileoverview Selection toolbar component for bulk scan actions.
 * @module app/domains/invoices/view-scans/_components/ScanSelectionToolbar
 */

import {deleteScan} from "@/lib/actions/scans";
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
import {useTranslations} from "next-intl";
import {useRouter} from "next/navigation";
import {useCallback, useState} from "react";
import {TbFileInvoice, TbTrash, TbX} from "react-icons/tb";
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
  const t = useTranslations("IMS--ViewScans.toolbar");
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
      const results = await Promise.allSettled(selectedScans.map((scan) => deleteScan({blobUrl: scan.blobUrl})));

      const succeeded = results.filter((r) => r.status === "fulfilled" && r.value.success).length;
      const failed = results.length - succeeded;

      // Remove successfully deleted scans from store
      results.forEach((result, index) => {
        if (result.status === "fulfilled" && result.value.success) {
          removeScan(selectedScans[index]!.id);
        }
      });

      if (failed === 0) {
        toast.success(t("delete.success", {count: succeeded}));
      } else if (succeeded > 0) {
        toast.warning(t("delete.partial", {success: succeeded, failed}));
      } else {
        toast.error(t("delete.failed"));
      }

      clearSelection(); // Clear the selection after deletion
      router.refresh(); // Refresh to update the scan list
    } catch (error) {
      console.error("Failed to delete scans:", error);
      toast.error(t("delete.error"));
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
            {t("selected")}
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
                    <span className={styles["hiddenMobile"]}>{t("clearSelection")}</span>
                  </Button>
                }
              />
              <TooltipContent>{t("clearSelection")}</TooltipContent>
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
                        <span className={styles["hiddenMobile"]}>{t("delete.button", {count: selectedScans.length})}</span>
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>{t("delete.confirmTitle")}</AlertDialogTitle>
                        <AlertDialogDescription>{t("delete.confirmDescription", {count: selectedScans.length})}</AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>{t("delete.cancel")}</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDeleteSelected}>{t("delete.confirm")}</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                }
              />
              <TooltipContent>{t("delete.button", {count: selectedScans.length})}</TooltipContent>
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
                    <span className={styles["hiddenMobile"]}>{selectedScans.length > 1 ? t("createInvoices") : t("createInvoice")}</span>
                    <span className={styles["visibleMobile"]}>{t("createInvoice").split(" ")[0]}</span>
                  </Button>
                }
              />
              <TooltipContent>{selectedScans.length > 1 ? t("createInvoices") : t("createInvoice")}</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>
    </div>
  );
}
