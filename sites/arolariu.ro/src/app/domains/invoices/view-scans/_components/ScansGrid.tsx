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
import styles from "./ScansGrid.module.scss";

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
    <div className={styles["emptyStep"]}>
      <div className={styles["emptyStepNumber"]}>
        {step}
      </div>
      <div className={styles["emptyStepContent"]}>
        <div className={styles["emptyStepTitleRow"]}>
          {icon}
          <h4 className={styles["emptyStepTitle"]}>{title}</h4>
        </div>
        <p className={styles["emptyStepDescription"]}>{description}</p>
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
      <div className={styles["skeletonGrid"]}>
        {SKELETON_KEYS.map((skeletonKey) => (
          <div 
            key={skeletonKey}
            className={styles["skeletonItem"]}
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
        className={styles["emptyWrapper"]}>
        <Card className='mx-auto max-w-2xl'>
          <CardContent className='p-8'>
            <div className={styles["emptyCenter"]}>
              <div className={styles["emptyIconCircle"]}>
                <TbPhoto className={styles["emptyIcon"]} />
              </div>
              <h3 className={styles["emptyTitle"]}>{t("emptyState.title")}</h3>
              <p className={styles["emptyDescription"]}>{t("emptyState.description")}</p>
            </div>

            <div className={styles["emptyStepsList"]}>
              <EmptyStateStep
                step={1}
                icon={<TbUpload className={styles["iconAccent"]} />}
                title={t("emptyState.step1Title")}
                description={t("emptyState.step1Description")}
              />
              <EmptyStateStep
                step={2}
                icon={<TbPhoto className={styles["iconPurple"]} />}
                title={t("emptyState.step2Title")}
                description={t("emptyState.step2Description")}
              />
              <EmptyStateStep
                step={3}
                icon={<TbFileInvoice className={styles["iconGreen"]} />}
                title={t("emptyState.step3Title")}
                description={t("emptyState.step3Description")}
              />
            </div>

            <div className={styles["emptyActions"]}>
              <Button
                asChild
                size='lg'
                className='bg-linear-to-r from-blue-600 to-cyan-600 text-white hover:from-blue-700 hover:to-cyan-700'>
                <Link href='/domains/invoices/upload-scans'>
                  <TbUpload className={styles["iconUploadLg"]} />
                  {t("emptyState.uploadButton")}
                </Link>
              </Button>
              <Button
                asChild
                variant='outline'
                size='lg'>
                <Link href='/domains/invoices'>
                  {t("emptyState.learnMoreButton")}
                  <TbArrowRight className={styles["iconArrowRight"]} />
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  return (
    <div className={styles["scansGrid"]}>
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
