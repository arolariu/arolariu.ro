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
  const t = useTranslations("Domains.services.invoices.service.view-scans.header");
  const {scans, isSyncing, lastSyncTimestamp, syncScans} = useScans();

  return (
    <main className={styles["header"]}>
      <main className={styles["headerLeft"]}>
        <main>
          <h1 className={styles["headerTitle"]}>
            {t("titleWithCount", {count: String(scans.length)})}
          </h1>
          {lastSyncTimestamp ? (
            <p className={styles["lastSynced"]}>{t("lastSynced", {time: formatRelativeTime(lastSyncTimestamp)})}</p>
          ) : null}
        </main>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant='ghost'
                size='icon'
                className='mt-1 h-6 w-6 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300'>
                <TbInfoCircle className='h-5 w-5' />
              </Button>
            </TooltipTrigger>
            <TooltipContent
              side='right'
              className='max-w-xs'>
              <p>{t("tooltip")}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </main>

      <main className={styles["headerActions"]}>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                asChild
                className='from-gradient-from to-gradient-to flex items-center gap-2 bg-linear-to-r text-white hover:opacity-90'>
                <Link href='/domains/invoices/upload-scans'>
                  <TbUpload className='h-4 w-4' />
                  <span className={styles["hiddenMobile"]}>{t("uploadMore")}</span>
                  <span className={styles["visibleMobile"]}>{t("upload")}</span>
                </Link>
              </Button>
            </TooltipTrigger>
            <TooltipContent>{t("uploadTooltip")}</TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                asChild
                variant='outline'
                className='flex items-center gap-2'>
                <Link href='/domains/invoices/view-invoices'>
                  <TbFileInvoice className='h-4 w-4' />
                  <span className={styles["hiddenMobile"]}>{t("myInvoices")}</span>
                  <span className={styles["visibleMobile"]}>{t("invoices")}</span>
                </Link>
              </Button>
            </TooltipTrigger>
            <TooltipContent>{t("myInvoicesTooltip")}</TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant='outline'
                onClick={syncScans}
                disabled={isSyncing}
                className='flex items-center gap-2'>
                <TbRefresh className={`${styles["syncIcon"]} ${isSyncing ? styles["syncIconSpinning"] : ""}`} />
                <span className={styles["hiddenMobile"]}>{isSyncing ? t("syncing") : t("sync")}</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>{t("syncTooltip")}</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </main>
    </main>
  );
}
