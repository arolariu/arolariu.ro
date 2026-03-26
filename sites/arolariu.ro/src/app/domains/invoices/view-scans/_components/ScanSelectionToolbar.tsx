"use client";

/**
 * @fileoverview Selection toolbar component for bulk scan actions.
 * @module app/domains/invoices/view-scans/_components/ScanSelectionToolbar
 */

import {Button, Tooltip, TooltipContent, TooltipProvider, TooltipTrigger} from "@arolariu/components";
import {useTranslations} from "next-intl";
import {TbFileInvoice, TbX} from "react-icons/tb";
import {useScans} from "../_hooks/useScans";
import styles from "./ScanSelectionToolbar.module.scss";

type ScanSelectionToolbarProps = {
  onCreateInvoice: () => void;
};

/**
 * Toolbar that appears when scans are selected.
 * Provides bulk actions like create invoice, deselect all.
 */
export default function ScanSelectionToolbar({onCreateInvoice}: Readonly<ScanSelectionToolbarProps>): React.JSX.Element | null {
  const t = useTranslations("Invoices.ViewScans.toolbar");
  const {selectedScans, clearSelection} = useScans();

  if (selectedScans.length === 0) {
    return null;
  }

  return (
    <div className={styles["toolbar"]}>
      <div className={styles["toolbarContent"]}>
        <div className={styles["toolbarLeft"]}>
          <span className={styles["selectedCount"]}>
            {selectedScans.length} {t("selected")}
          </span>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger render={
                <Button
                  variant='ghost'
                  size='sm'
                  onClick={clearSelection}
                  className='text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'>
                  <TbX className={styles["clearIcon"]} />
                  <span className={styles["hiddenMobile"]}>{t("clearSelection")}</span>
                </Button>
              } />
              <TooltipContent>{t("clearSelection")}</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        <div className={styles["toolbarRight"]}>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger render={
                <Button
                  onClick={onCreateInvoice}
                  className='bg-linear-to-r from-green-600 to-emerald-600 text-white hover:from-green-700 hover:to-emerald-700'>
                  <TbFileInvoice className={styles["createIcon"]} />
                  <span className={styles["hiddenMobile"]}>{selectedScans.length > 1 ? t("createInvoices") : t("createInvoice")}</span>
                  <span className={styles["visibleMobile"]}>{t("createInvoice").split(" ")[0]}</span>
                </Button>
              } />
              <TooltipContent>{selectedScans.length > 1 ? t("createInvoices") : t("createInvoice")}</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>
    </div>
  );
}
