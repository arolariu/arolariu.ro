"use client";

/**
 * @fileoverview Grid view for displaying scans with selection.
 * @module app/domains/invoices/view-scans/_components/ScansGrid
 */

import type {CachedScan} from "@/types/scans";
import {Button, Card, CardContent} from "@arolariu/components";
import {motion} from "motion/react";
import {useTranslations} from "next-intl";
import Link from "next/link";
import {useCallback} from "react";
import {TbArrowRight, TbFileInvoice, TbPhoto, TbUpload} from "react-icons/tb";
import {useScans} from "../_hooks/useScans";
import ScanCard from "./ScanCard";

/** Pre-generated skeleton keys for loading state to avoid array index as key */
const SKELETON_KEYS = ["skeleton-1", "skeleton-2", "skeleton-3", "skeleton-4", "skeleton-5", "skeleton-6"] as const;

type ScanCardWrapperProps = {
  scan: CachedScan;
  isSelected: boolean;
  onToggleSelection: (scan: CachedScan) => void;
};

/**
 * Wrapper component to provide memoized toggle callback.
 */
function ScanCardWrapper({scan, isSelected, onToggleSelection}: Readonly<ScanCardWrapperProps>): React.JSX.Element {
  const handleToggle = useCallback(() => {
    onToggleSelection(scan);
  }, [scan, onToggleSelection]);

  return (
    <ScanCard
      scan={scan}
      isSelected={isSelected}
      onToggleSelect={handleToggle}
    />
  );
}

/**
 * Empty state step component.
 */
function EmptyStateStep({
  step,
  icon,
  title,
  description,
}: Readonly<{step: number; icon: React.ReactNode; title: string; description: string}>): React.JSX.Element {
  return (
    <div className='flex items-start gap-4'>
      <div className='flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-linear-to-br from-purple-500 to-pink-500 text-sm font-bold text-white'>
        {step}
      </div>
      <div className='flex-1'>
        <div className='mb-1 flex items-center gap-2'>
          {icon}
          <h4 className='font-medium text-gray-900 dark:text-white'>{title}</h4>
        </div>
        <p className='text-sm text-gray-500 dark:text-gray-400'>{description}</p>
      </div>
    </div>
  );
}

/**
 * Grid display for scans with selection support.
 */
export default function ScansGrid(): React.JSX.Element {
  const t = useTranslations("Domains.services.invoices.service.view-scans");
  const {scans, selectedScans, hasHydrated, isSyncing, toggleSelection} = useScans();

  // Show loading state
  if (!hasHydrated || (isSyncing && scans.length === 0)) {
    return (
      <div className='grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3'>
        {SKELETON_KEYS.map((skeletonKey) => (
          <div
            key={skeletonKey}
            className='aspect-[4/3] animate-pulse rounded-lg bg-gray-200 dark:bg-gray-700'
          />
        ))}
      </div>
    );
  }

  // Show empty state
  if (scans.length === 0) {
    return (
      <motion.div
        initial={{opacity: 0, y: 20}}
        animate={{opacity: 1, y: 0}}
        className='py-8'>
        <Card className='mx-auto max-w-2xl'>
          <CardContent className='p-8'>
            <div className='mb-8 text-center'>
              <div className='mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-linear-to-br from-blue-500 to-cyan-500'>
                <TbPhoto className='h-8 w-8 text-white' />
              </div>
              <h3 className='mb-2 text-2xl font-bold text-gray-900 dark:text-white'>{t("emptyState.title")}</h3>
              <p className='text-gray-600 dark:text-gray-300'>{t("emptyState.description")}</p>
            </div>

            <div className='mb-8 space-y-6'>
              <EmptyStateStep
                step={1}
                icon={<TbUpload className='text-accent-primary h-4 w-4' />}
                title={t("emptyState.step1Title")}
                description={t("emptyState.step1Description")}
              />
              <EmptyStateStep
                step={2}
                icon={<TbPhoto className='h-4 w-4 text-purple-500' />}
                title={t("emptyState.step2Title")}
                description={t("emptyState.step2Description")}
              />
              <EmptyStateStep
                step={3}
                icon={<TbFileInvoice className='h-4 w-4 text-green-500' />}
                title={t("emptyState.step3Title")}
                description={t("emptyState.step3Description")}
              />
            </div>

            <div className='flex flex-col items-center gap-4 sm:flex-row sm:justify-center'>
              <Button
                asChild
                size='lg'
                className='bg-linear-to-r from-blue-600 to-cyan-600 text-white hover:from-blue-700 hover:to-cyan-700'>
                <Link href='/domains/invoices/upload-scans'>
                  <TbUpload className='mr-2 h-5 w-5' />
                  {t("emptyState.uploadButton")}
                </Link>
              </Button>
              <Button
                asChild
                variant='outline'
                size='lg'>
                <Link href='/domains/invoices'>
                  {t("emptyState.learnMoreButton")}
                  <TbArrowRight className='ml-2 h-4 w-4' />
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  return (
    <div className='grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3'>
      {scans.map((scan) => (
        <ScanCardWrapper
          key={scan.id}
          scan={scan}
          isSelected={selectedScans.some((s) => s.id === scan.id)}
          onToggleSelection={toggleSelection}
        />
      ))}
    </div>
  );
}
