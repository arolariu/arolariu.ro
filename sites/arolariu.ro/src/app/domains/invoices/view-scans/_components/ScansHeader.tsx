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
    <div className='mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between'>
      <div className='flex items-start gap-2'>
        <div>
          <h1 className='text-2xl font-bold text-gray-900 lg:text-3xl dark:text-white'>
            {t("titleWithCount", {count: String(scans.length)})}
          </h1>
          {lastSyncTimestamp ? <p className='text-sm text-gray-500 dark:text-gray-400'>{t("lastSynced", {time: formatRelativeTime(lastSyncTimestamp)})}</p> : null}
        </div>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type='button'
                className='mt-1 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300'>
                <TbInfoCircle className='h-5 w-5' />
              </button>
            </TooltipTrigger>
            <TooltipContent
              side='right'
              className='max-w-xs'>
              <p>{t("tooltip")}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      <div className='flex gap-2'>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                asChild
                className='flex items-center gap-2 bg-linear-to-r from-blue-600 to-cyan-600 text-white hover:from-blue-700 hover:to-cyan-700'>
                <Link href='/domains/invoices/upload-scans'>
                  <TbUpload className='h-4 w-4' />
                  <span className='hidden sm:inline'>{t("uploadMore")}</span>
                  <span className='sm:hidden'>{t("upload")}</span>
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
                  <span className='hidden sm:inline'>{t("myInvoices")}</span>
                  <span className='sm:hidden'>{t("invoices")}</span>
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
                <TbRefresh className={`h-4 w-4 ${isSyncing ? "animate-spin" : ""}`} />
                <span className='hidden sm:inline'>{isSyncing ? t("syncing") : t("sync")}</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>{t("syncTooltip")}</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </div>
  );
}
