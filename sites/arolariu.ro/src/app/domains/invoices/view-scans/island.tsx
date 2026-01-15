"use client";

/**
 * @fileoverview Client-side island for the view scans workflow.
 * @module app/domains/invoices/view-scans/island
 */

import {Button, Card, CardContent} from "@arolariu/components";
import {motion} from "motion/react";
import {useTranslations} from "next-intl";
import Link from "next/link";
import {useCallback} from "react";
import {TbArrowLeft, TbCheck, TbClick, TbFileInvoice, TbPhoto, TbStack2} from "react-icons/tb";
import {DialogProvider, useDialogs} from "../_contexts/DialogContext";
import DialogContainer from "../_contexts/DialogContainer";
import ScanSelectionToolbar from "./_components/ScanSelectionToolbar";
import ScansGrid from "./_components/ScansGrid";
import ScansHeader from "./_components/ScansHeader";
import {useScans} from "./_hooks/useScans";

/**
 * Quick tip component.
 */
function QuickTip({icon, title, description}: Readonly<{icon: React.ReactNode; title: string; description: string}>): React.JSX.Element {
  return (
    <div className='flex items-start gap-3'>
      <div className='flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-purple-100 text-purple-600 dark:bg-purple-900/50 dark:text-purple-400'>
        {icon}
      </div>
      <div>
        <p className='text-sm font-medium text-gray-900 dark:text-white'>{title}</p>
        <p className='text-xs text-gray-500 dark:text-gray-400'>{description}</p>
      </div>
    </div>
  );
}

/**
 * Stats card component.
 */
function StatsCard({value, label, color}: Readonly<{value: number; label: string; color: string}>): React.JSX.Element {
  return (
    <div className='text-center'>
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
      <p className='text-xs text-gray-500 dark:text-gray-400'>{label}</p>
    </div>
  );
}

/**
 * Scan statistics component.
 */
function ScanStats(): React.JSX.Element | null {
  const t = useTranslations("Domains.services.invoices.service.view-scans");
  const {scans, selectedScans} = useScans();
  const readyScans = scans.filter((s) => s.status === "ready").length;

  if (scans.length === 0) return null;

  return (
    <motion.div
      initial={{opacity: 0, y: 10}}
      animate={{opacity: 1, y: 0}}
      className='mb-6 rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800'>
      <div className='flex flex-wrap items-center justify-between gap-6'>
        <div className='flex items-center gap-8'>
          <StatsCard
            value={scans.length}
            label={t("stats.totalScans")}
            color='text-gray-900 dark:text-white'
          />
          <StatsCard
            value={readyScans}
            label={t("stats.ready")}
            color='text-green-500'
          />
          <StatsCard
            value={selectedScans.length}
            label={t("stats.selected")}
            color='text-purple-500'
          />
        </div>

        {selectedScans.length === 0 && scans.length > 0 && (
          <p className='text-sm text-gray-500 dark:text-gray-400'>
            <span className='hidden sm:inline'>{t("stats.selectHint")}</span>
            <span className='sm:hidden'>{t("stats.tapHint")}</span>
          </p>
        )}
      </div>
    </motion.div>
  );
}

/**
 * Sidebar with tips and guidance.
 */
function Sidebar(): React.JSX.Element | null {
  const t = useTranslations("Domains.services.invoices.service.view-scans");
  const {scans, selectedScans} = useScans();

  // Don't show sidebar if no scans
  if (scans.length === 0) return null;

  return (
    <div className='space-y-6'>
      {/* How to Use */}
      <Card>
        <CardContent className='p-4'>
          <h3 className='mb-4 font-semibold text-gray-900 dark:text-white'>{t("sidebar.howTo.title")}</h3>
          <div className='space-y-4'>
            <QuickTip
              icon={<TbClick className='h-4 w-4' />}
              title={t("sidebar.howTo.step1Title")}
              description={t("sidebar.howTo.step1Description")}
            />
            <QuickTip
              icon={<TbStack2 className='h-4 w-4' />}
              title={t("sidebar.howTo.step2Title")}
              description={t("sidebar.howTo.step2Description")}
            />
            <QuickTip
              icon={<TbFileInvoice className='h-4 w-4' />}
              title={t("sidebar.howTo.step3Title")}
              description={t("sidebar.howTo.step3Description")}
            />
          </div>
        </CardContent>
      </Card>

      {/* Selection Status */}
      {selectedScans.length > 0 && (
        <motion.div
          initial={{opacity: 0, scale: 0.95}}
          animate={{opacity: 1, scale: 1}}>
          <Card className='border-purple-200 bg-purple-50 dark:border-purple-800 dark:bg-purple-900/20'>
            <CardContent className='p-4'>
              <div className='flex items-center gap-3'>
                <div className='flex h-10 w-10 items-center justify-center rounded-full bg-purple-200 dark:bg-purple-800'>
                  <TbCheck className='h-5 w-5 text-purple-600 dark:text-purple-300' />
                </div>
                <div>
                  <p className='font-semibold text-purple-900 dark:text-purple-100'>
                    {selectedScans.length}{" "}
                    {selectedScans.length > 1 ? t("sidebar.selectionStatus.plural") : t("sidebar.selectionStatus.singular")}
                  </p>
                  <p className='text-sm text-purple-700 dark:text-purple-300'>
                    {selectedScans.length > 1 ? t("sidebar.selectionStatus.readyPlural") : t("sidebar.selectionStatus.readySingular")}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Quick Upload Link */}
      <Card>
        <CardContent className='p-4'>
          <div className='flex items-center gap-3'>
            <div className='flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/50'>
              <TbPhoto className='h-5 w-5 text-blue-600 dark:text-blue-400' />
            </div>
            <div className='flex-1'>
              <p className='text-sm font-medium text-gray-900 dark:text-white'>{t("sidebar.quickUpload.title")}</p>
              <p className='text-xs text-gray-500 dark:text-gray-400'>{t("sidebar.quickUpload.description")}</p>
            </div>
            <Button
              asChild
              size='sm'
              variant='outline'>
              <Link href='/domains/invoices/upload-scans'>{t("sidebar.quickUpload.button")}</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/**
 * Inner content component that uses the dialog context.
 */
function ViewScansContent(): React.JSX.Element {
  const t = useTranslations("Domains.services.invoices.service.view-scans");
  const {scans, selectedScans} = useScans();
  const {openDialog} = useDialogs();

  const handleOpenCreateInvoice = useCallback(() => {
    openDialog("VIEW_SCANS__CREATE_INVOICE", "add", {selectedScans});
  }, [openDialog, selectedScans]);

  return (
    <section className='mx-auto max-w-7xl'>
      {/* Breadcrumb */}
      <div className='mb-6'>
        <Link
          href='/domains/invoices'
          className='inline-flex items-center gap-1 text-sm text-gray-500 transition-colors hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'>
          <TbArrowLeft className='h-4 w-4' />
          {t("breadcrumb")}
        </Link>
      </div>

      <ScansHeader />

      {/* Stats */}
      <ScanStats />

      {/* Main Content */}
      <div className={`grid gap-8 ${scans.length > 0 ? "lg:grid-cols-4" : ""}`}>
        {/* Scans Grid - Takes 3 columns when there are scans */}
        <div className={scans.length > 0 ? "lg:col-span-3" : ""}>
          <ScansGrid />
        </div>

        {/* Sidebar */}
        <Sidebar />
      </div>

      <ScanSelectionToolbar onCreateInvoice={handleOpenCreateInvoice} />
      <DialogContainer />
      {/* Add padding at bottom when toolbar is visible */}
      {selectedScans.length > 0 ? <div className='h-24' /> : null}
    </section>
  );
}

/**
 * Client-side island for the view scans workflow.
 *
 * @remarks
 * This component serves as the hydration boundary for the view scans page.
 * It manages the dialog state via DialogProvider and renders the scan viewing UI.
 */
export default function RenderViewScansScreen(): React.JSX.Element {
  return (
    <DialogProvider>
      <ViewScansContent />
    </DialogProvider>
  );
}
