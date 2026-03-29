"use client";

/**
 * @fileoverview Grid view for displaying scans with selection.
 * @module app/domains/invoices/view-scans/_components/ScansGrid
 */

import type {CachedScan} from "@/types/scans";
import {Skeleton} from "@arolariu/components";
import {AnimatePresence, motion} from "motion/react";
import {useTranslations} from "next-intl";
import {useCallback} from "react";
import {TbCamera} from "react-icons/tb";
import EmptyState from "../../_components/EmptyState";
import {StaggerContainer, StaggerItem} from "../../_components/StaggerContainer";
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
 * Grid display for scans with selection support.
 */
export default function ScansGrid(): React.JSX.Element {
  const t = useTranslations("Invoices.ViewScans");
  const {scans, selectedScans, hasHydrated, isSyncing, toggleSelection} = useScans();

  // Show loading state
  if (!hasHydrated || (isSyncing && scans.length === 0)) {
    return (
      <div className={styles["scansGrid"]}>
        {SKELETON_KEYS.map((skeletonKey) => (
          <div
            key={skeletonKey}
            className={styles["skeletonCard"]}>
            <Skeleton className={styles["skeletonImage"]} />
            <div className={styles["skeletonInfo"]}>
              <Skeleton className={styles["skeletonName"]} />
              <Skeleton className={styles["skeletonMeta"]} />
            </div>
          </div>
        ))}
      </div>
    );
  }

  // Show empty state
  if (scans.length === 0) {
    return (
      <EmptyState
        icon={<TbCamera className={styles["emptyIcon"]} />}
        title={t("emptyState.title")}
        description={t("emptyState.description")}
        primaryAction={{
          label: t("emptyState.uploadButton"),
          href: "/domains/invoices/upload-scans",
        }}
        secondaryAction={{
          label: t("emptyState.learnMoreButton"),
          href: "/domains/invoices",
        }}
      />
    );
  }

  return (
    <StaggerContainer
      className={styles["scansGrid"]}
      staggerDelay={0.05}>
      <AnimatePresence mode='popLayout'>
        {scans.map((scan) => (
          <motion.div
            key={scan.id}
            layout
            initial={{opacity: 0, scale: 0.9}}
            animate={{opacity: 1, scale: 1}}
            exit={{opacity: 0, scale: 0.9, x: -20}}
            transition={{duration: 0.2}}>
            <StaggerItem>
              <ScanCardWrapper
                scan={scan}
                isSelected={selectedScans.some((s) => s.id === scan.id)}
                onToggleSelection={toggleSelection}
              />
            </StaggerItem>
          </motion.div>
        ))}
      </AnimatePresence>
    </StaggerContainer>
  );
}
