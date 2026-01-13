"use client";

/**
 * @fileoverview Selection toolbar component for bulk scan actions.
 * @module app/domains/invoices/view-scans/_components/ScanSelectionToolbar
 */

import {Button, Tooltip, TooltipContent, TooltipProvider, TooltipTrigger} from "@arolariu/components";
import {useTranslations} from "next-intl";
import {TbFileInvoice, TbX} from "react-icons/tb";
import {useScans} from "../_hooks/useScans";

type ScanSelectionToolbarProps = {
  onCreateInvoice: () => void;
};

/**
 * Toolbar that appears when scans are selected.
 * Provides bulk actions like create invoice, deselect all.
 */
export default function ScanSelectionToolbar({onCreateInvoice}: Readonly<ScanSelectionToolbarProps>): React.JSX.Element | null {
  const t = useTranslations("Domains.services.invoices.service.view-scans.toolbar");
  const {selectedScans, clearSelection} = useScans();

  if (selectedScans.length === 0) {
    return null;
  }

  return (
    <div className='fixed right-0 bottom-0 left-0 z-50 border-t border-gray-200 bg-white p-4 shadow-lg dark:border-gray-700 dark:bg-gray-900'>
      <div className='mx-auto flex max-w-7xl items-center justify-between'>
        <div className='flex items-center gap-4'>
          <span className='font-medium text-gray-900 dark:text-white'>
            {selectedScans.length} {t("selected")}
          </span>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant='ghost'
                  size='sm'
                  onClick={clearSelection}
                  className='text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'>
                  <TbX className='mr-1 h-4 w-4' />
                  <span className='hidden sm:inline'>{t("clearSelection")}</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>{t("clearSelection")}</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        <div className='flex items-center gap-3'>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  onClick={onCreateInvoice}
                  className='bg-linear-to-r from-green-600 to-emerald-600 text-white hover:from-green-700 hover:to-emerald-700'>
                  <TbFileInvoice className='mr-2 h-4 w-4' />
                  <span className='hidden sm:inline'>{selectedScans.length > 1 ? t("createInvoices") : t("createInvoice")}</span>
                  <span className='sm:hidden'>{t("createInvoice").split(" ")[0]}</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>{selectedScans.length > 1 ? t("createInvoices") : t("createInvoice")}</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>
    </div>
  );
}
