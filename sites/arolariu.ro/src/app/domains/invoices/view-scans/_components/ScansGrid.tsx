"use client";

/**
 * @fileoverview Grid view for displaying scans with selection.
 * @module app/domains/invoices/view-scans/_components/ScansGrid
 */

import type {CachedScan} from "@/types/scans";
import {Button, Skeleton} from "@arolariu/components";
import {AnimatePresence, motion} from "motion/react";
import {useTranslations} from "next-intl";
import {useCallback, useEffect, useState} from "react";
import {TbCamera, TbChevronLeft, TbChevronRight} from "react-icons/tb";
import EmptyState from "../../_components/EmptyState";
import ScanCard from "../../_components/ScanCard";
import {useScans} from "../_hooks/useScans";
import styles from "./ScansGrid.module.scss";

/** Pre-generated skeleton keys for loading state to avoid array index as key */
const SKELETON_KEYS = ["skeleton-1", "skeleton-2", "skeleton-3", "skeleton-4", "skeleton-5", "skeleton-6"] as const;

/** Number of scans to display per page on mobile devices */
const MOBILE_PAGE_SIZE = 20;

/** Number of scans to display per page on desktop devices */
const DESKTOP_PAGE_SIZE = 50;

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
  const [page, setPage] = useState(0);

  // Detect mobile viewport
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const checkMobile = (): void => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  /**
   * Filter out scans without required fields.
   *
   * @remarks
   * Scans are filtered silently because they represent incomplete uploads:
   * - Missing `id`: Scan not yet persisted to backend
   * - Missing `blobUrl` or `name`: Upload still in progress
   *
   * These scans will appear once upload/processing completes and store refreshes.
   * No user feedback is shown to avoid UI noise during normal upload flow.
   */
  const validScans = scans.filter((s) => s.id);

  // Calculate pagination
  const pageSize = isMobile ? MOBILE_PAGE_SIZE : DESKTOP_PAGE_SIZE;
  const totalPages = Math.ceil(validScans.length / pageSize);
  const paginatedScans = validScans.slice(page * pageSize, (page + 1) * pageSize);

  // Reset page to 0 when scans change (sync, filter, etc.)
  useEffect(() => {
    setPage(0);
  }, [validScans.length]);

  // Show loading state
  if (!hasHydrated || (isSyncing && validScans.length === 0)) {
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
  if (validScans.length === 0) {
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
    <>
      <div className={styles["scansGrid"]}>
        <AnimatePresence mode='popLayout'>
          {paginatedScans.map((scan) => (
            <motion.div
              key={scan.id}
              initial={{opacity: 0}}
              animate={{opacity: 1}}
              exit={{opacity: 0}}
              transition={{duration: 0.15, ease: "easeOut"}}>
              <ScanCardWrapper
                scan={scan}
                isSelected={selectedScans.some((s) => s.id === scan.id)}
                onToggleSelection={toggleSelection}
              />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {totalPages > 1 && (
        <div className={styles["pagination"]}>
          <Button
            variant='outline'
            size='sm'
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0}>
            <TbChevronLeft />
            {t("pagination.previous")}
          </Button>
          <span className={styles["pageInfo"]}>
            {t("pagination.pageInfo", {current: String(page + 1), total: String(totalPages), count: String(validScans.length)})}
          </span>
          <Button
            variant='outline'
            size='sm'
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            disabled={page >= totalPages - 1}>
            {t("pagination.next")}
            <TbChevronRight />
          </Button>
        </div>
      )}
    </>
  );
}
