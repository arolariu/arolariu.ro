"use client";

/**
 * @fileoverview Header component for the view scans page.
 * @module app/domains/invoices/view-scans/_components/ScansHeader
 */

import {Button, Tooltip, TooltipContent, TooltipProvider, TooltipTrigger} from "@arolariu/components";
import {useTranslations} from "next-intl";
import Link from "next/link";
import {TbFileInvoice, TbInfoCircle, TbRefresh, TbUpload} from "react-icons/tb";
import {useScans} from "../_hooks/useScans";
import styles from "./ScansHeader.module.scss";

/**
 * Formats a date as a relative time string.
 */
function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60_000);

  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}

/**
 * Header component showing scan count and sync button.
 */
export default function ScansHeader(): React.JSX.Element {
  const t = useTranslations("Invoices.ViewScans.header");
  const {scans, isSyncing, lastSyncTimestamp, syncScans} = useScans();

  return (
    <div className={styles["header"]}>
      <div className={styles["headerLeft"]}>
        <div>
          <h1 className={styles["headerTitle"]}>{t("titleWithCount", {count: String(scans.length)})}</h1>
          {lastSyncTimestamp ? (
            <p className={styles["lastSynced"]}>{t("lastSynced", {time: formatRelativeTime(lastSyncTimestamp)})}</p>
          ) : null}
        </div>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger render={
              <Button
                variant='ghost'
                size='icon'
                className={styles["infoButton"]}>
                <TbInfoCircle className={styles["infoIcon"]} />
              </Button>
            } />
            <TooltipContent
              side='right'
              className={styles["tooltipContent"]}>
              <p>{t("tooltip")}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      <div className={styles["headerActions"]}>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger render={
              <Button
                className={styles["uploadButton"]}
                render={
                  <Link href='/domains/invoices/upload-scans'>
                    <TbUpload className={styles["actionIcon"]} />
                    <span className={styles["hiddenMobile"]}>{t("uploadMore")}</span>
                    <span className={styles["visibleMobile"]}>{t("upload")}</span>
                  </Link>
                } />
            } />
            <TooltipContent>{t("uploadTooltip")}</TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger render={
              <Button
                variant='outline'
                className={styles["outlineButton"]}
                render={
                  <Link href='/domains/invoices/view-invoices'>
                    <TbFileInvoice className={styles["actionIcon"]} />
                    <span className={styles["hiddenMobile"]}>{t("myInvoices")}</span>
                    <span className={styles["visibleMobile"]}>{t("invoices")}</span>
                  </Link>
                } />
            } />
            <TooltipContent>{t("myInvoicesTooltip")}</TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger render={
              <Button
                variant='outline'
                onClick={syncScans}
                disabled={isSyncing}
                className={styles["outlineButton"]}>
                <TbRefresh className={`${styles["syncIcon"]} ${isSyncing ? styles["syncIconSpinning"] : ""}`} />
                <span className={styles["hiddenMobile"]}>{isSyncing ? t("syncing") : t("sync")}</span>
              </Button>
            } />
            <TooltipContent>{t("syncTooltip")}</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </div>
  );
}
