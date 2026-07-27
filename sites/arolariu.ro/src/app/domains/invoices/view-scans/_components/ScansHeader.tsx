"use client";

/**
 * @fileoverview Header component for the view scans page.
 * @module app/domains/invoices/view-scans/_components/ScansHeader
 */

import {formatRelativeTime} from "@/lib/utils.generic";
import {Button, Tooltip, TooltipContent, TooltipProvider, TooltipTrigger} from "@arolariu/components";
import {motion} from "motion/react";
import {useTranslations} from "next-intl-selector";
import Link from "next/link";
import {useCallback} from "react";
import {TbFileInvoice, TbInfoCircle, TbRefresh, TbUpload} from "react-icons/tb";
import {useScans} from "../_hooks/useScans";
import styles from "./ScansHeader.module.scss";

/**
 * Header component showing scan count and sync button.
 */
export default function ScansHeader(): React.JSX.Element {
  const t = useTranslations();
  const {scans, isSyncing, lastSyncTimestamp, syncScans} = useScans();

  /**
   * Triggers a forced sync of scans from the server.
   * Always includes force=true to bypass cache.
   */
  const handleSyncScans = useCallback(() => {
    syncScans(true);
  }, [syncScans]);

  return (
    <div className={styles["header"]}>
      <div className={styles["headerLeft"]}>
        <div>
          <h1 className={styles["headerTitle"]}>
            {t((m) => m.pages.invoices.viewScans.header.titleWithCount, {count: String(scans.length)})}
          </h1>
          {lastSyncTimestamp ? (
            <motion.p
              key={lastSyncTimestamp.getTime()}
              initial={{backgroundColor: "hsl(var(--primary) / 0.2)"}}
              animate={{backgroundColor: "transparent"}}
              transition={{duration: 1}}
              className={styles["lastSynced"]}>
              {t((m) => m.pages.invoices.viewScans.header.lastSynced, {time: formatRelativeTime(lastSyncTimestamp)})}
            </motion.p>
          ) : null}
        </div>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  variant='ghost'
                  size='icon'
                  className={styles["infoButton"]}>
                  <TbInfoCircle className={styles["infoIcon"]} />
                </Button>
              }
            />
            <TooltipContent
              side='right'
              className={styles["tooltipContent"]}>
              <p>{t((m) => m.pages.invoices.viewScans.header.tooltip)}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      <div className={styles["headerActions"]}>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  className={styles["uploadButton"]}
                  render={
                    <Link href='/domains/invoices/upload-scans'>
                      <TbUpload className={styles["actionIcon"]} />
                      <span className={styles["hiddenMobile"]}>{t((m) => m.pages.invoices.viewScans.header.uploadMore)}</span>
                      <span className={styles["visibleMobile"]}>{t((m) => m.pages.invoices.viewScans.header.upload)}</span>
                    </Link>
                  }
                />
              }
            />
            <TooltipContent>{t((m) => m.pages.invoices.viewScans.header.uploadTooltip)}</TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  variant='outline'
                  className={styles["outlineButton"]}
                  render={
                    <Link href='/domains/invoices/view-invoices'>
                      <TbFileInvoice className={styles["actionIcon"]} />
                      <span className={styles["hiddenMobile"]}>{t((m) => m.pages.invoices.viewScans.header.myInvoices)}</span>
                      <span className={styles["visibleMobile"]}>{t((m) => m.pages.invoices.viewScans.header.invoices)}</span>
                    </Link>
                  }
                />
              }
            />
            <TooltipContent>{t((m) => m.pages.invoices.viewScans.header.myInvoicesTooltip)}</TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  variant='outline'
                  onClick={handleSyncScans}
                  disabled={isSyncing}
                  className={styles["outlineButton"]}>
                  <TbRefresh className={`${styles["syncIcon"]} ${isSyncing ? styles["syncIconSpinning"] : ""}`} />
                  <span className={styles["hiddenMobile"]}>
                    {isSyncing ? t((m) => m.pages.invoices.viewScans.header.syncing) : t((m) => m.pages.invoices.viewScans.header.sync)}
                  </span>
                </Button>
              }
            />
            <TooltipContent>{t((m) => m.pages.invoices.viewScans.header.syncTooltip)}</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </div>
  );
}
