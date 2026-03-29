"use client";

/**
 * @fileoverview Selection toolbar component for bulk scan actions.
 * @module app/domains/invoices/view-scans/_components/ScanSelectionToolbar
 */

import {Button, Tooltip, TooltipContent, TooltipProvider, TooltipTrigger} from "@arolariu/components";
import {motion} from "motion/react";
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
