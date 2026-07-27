"use client";

/**
 * @fileoverview Grid view for displaying scans with selection.
 * @module app/domains/invoices/view-scans/_components/ScansGrid
 */

import {formatDate, formatFileSize} from "@/lib/utils.generic";
import type {CachedScan} from "@/types/scans";
import {ScanStatus} from "@/types/scans";
import {Button, useIsMobile} from "@arolariu/components";
import {AnimatePresence, motion} from "motion/react";
import {useTranslations} from "next-intl-selector";
import {useCallback, useEffect, useState} from "react";
import {TbCamera, TbChevronLeft, TbChevronRight, TbLink, TbRotate, TbRotateClockwise, TbTrash} from "react-icons/tb";
import ScanCard from "../../_cards/ScanCard";
import {CardShimmer} from "../../_cards/ScanCard.shimmers";
import DeferredMount from "../../_components/DeferredMount";
import EmptyState from "../../_components/EmptyState";
import {useDialogs} from "../../_contexts/DialogContext";
import {useScanRename, useScanRotation} from "../../_hooks/scan";
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
 * Wrapper component to adapt CachedScan to controlled ScanCard API.
 */
function ScanCardWrapper({scan, isSelected, onToggleSelection}: Readonly<ScanCardWrapperProps>): React.JSX.Element {
  const t = useTranslations();
  const {openDialog} = useDialogs();
  const rename = useScanRename(scan);
  const rotation = useScanRotation(scan);
  const isUsedByInvoice = scan.metadata.status === ScanStatus.ATTACHED && Boolean(scan.metadata.attachedTo);

  const handleToggle = useCallback(() => {
    onToggleSelection(scan);
  }, [scan, onToggleSelection]);

  const handleOpenPreview = useCallback((): void => {
    openDialog("SHARED__SCAN_PREVIEW", "view", {scan});
  }, [openDialog, scan]);

  const handleOpenDeleteDialog = useCallback((): void => {
    openDialog("SHARED__SCAN_DELETE", "delete", {scan});
  }, [openDialog, scan]);

  return (
    <ScanCard
      media={{
        src: scan.blobUrl,
        mediaKind: scan.mimeType === "application/pdf" ? "pdf" : "image",
        alt: scan.name,
        onPreviewActivate: handleOpenPreview,
      }}
      title={scan.name}
      metadataItems={[
        formatFileSize(scan.sizeInBytes),
        formatDate(scan.uploadedAt, {locale: "en-US", month: "short", day: "numeric", year: "numeric"}),
      ]}
      isSelected={isSelected}
      selection={{
        checked: isSelected,
        onToggle: handleToggle,
        label: t((m) => m.pages.invoices.viewScans.scanCard.select, {name: scan.name}),
      }}
      rename={{
        value: rename.value,
        isEditing: rename.isEditing,
        onStart: rename.start,
        onChange: rename.change,
        onCommit: () => void rename.commit(),
        onCancel: rename.cancel,
        placeholder: t((m) => m.pages.invoices.viewScans.scanCard.renamePlaceholder),
      }}
      linkedBadge={
        isUsedByInvoice ? (
          <div className={styles["linkedBadge"]}>
            <TbLink className={styles["linkedIcon"]} />
            {t((m) => m.pages.invoices.viewScans.scanCard.linked)}
          </div>
        ) : undefined
      }
      centerOverlay={
        rotation.isRotating ? (
          <div className={styles["rotatingOverlay"]}>
            <div className={styles["rotatingSpinner"]} />
            <span className={styles["rotatingText"]}>{t((m) => m.pages.invoices.viewScans.scanCard.actions.rotating)}</span>
          </div>
        ) : undefined
      }
      actions={[
        {
          key: "rotate-cw",
          label: t((m) => m.pages.invoices.viewScans.scanCard.actions.rotateCW),
          icon: <TbRotateClockwise className={styles["menuIcon"]} />,
          onSelect: () => void rotation.rotateScanCallback("cw"),
          disabled: scan.mimeType === "application/pdf" || rotation.isRotating,
        },
        {
          key: "rotate-ccw",
          label: t((m) => m.pages.invoices.viewScans.scanCard.actions.rotateCCW),
          icon: <TbRotate className={styles["menuIcon"]} />,
          onSelect: () => void rotation.rotateScanCallback("ccw"),
          disabled: scan.mimeType === "application/pdf" || rotation.isRotating,
        },
        {
          key: "delete",
          label: t((m) => m.pages.invoices.viewScans.scanCard.actions.delete),
          icon: <TbTrash className={styles["menuIcon"]} />,
          onSelect: handleOpenDeleteDialog,
          destructive: true,
        },
      ]}
    />
  );
}

/**
 * Grid display for scans with selection support.
 */
export default function ScansGrid(): React.JSX.Element {
  const t = useTranslations();
  const {scans, selectedScans, hasHydrated, isSyncing, toggleSelection} = useScans();
  const [page, setPage] = useState(0);

  const isMobile = useIsMobile();

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

  /** Navigates to the previous page of scans. */
  const handlePreviousPage = useCallback(() => {
    setPage((p) => Math.max(0, p - 1));
  }, []);

  /** Navigates to the next page of scans. */
  const handleNextPage = useCallback(() => {
    setPage((p) => Math.min(totalPages - 1, p + 1));
  }, [totalPages]);

  // Show loading state
  if (!hasHydrated || (isSyncing && validScans.length === 0)) {
    return (
      <div className={styles["scansGrid"]}>
        {SKELETON_KEYS.map((skeletonKey) => (
          <CardShimmer key={skeletonKey} />
        ))}
      </div>
    );
  }

  // Show empty state
  if (validScans.length === 0) {
    return (
      <EmptyState
        icon={<TbCamera className={styles["emptyIcon"]} />}
        title={t((m) => m.pages.invoices.viewScans.emptyState.title)}
        description={t((m) => m.pages.invoices.viewScans.emptyState.description)}
        primaryAction={{
          label: t((m) => m.pages.invoices.viewScans.emptyState.uploadButton),
          href: "/domains/invoices/upload-scans",
        }}
        secondaryAction={{
          label: t((m) => m.pages.invoices.viewScans.emptyState.learnMoreButton),
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
              <DeferredMount placeholder={<CardShimmer />}>
                <ScanCardWrapper
                  scan={scan}
                  isSelected={selectedScans.some((s) => s.id === scan.id)}
                  onToggleSelection={toggleSelection}
                />
              </DeferredMount>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {totalPages > 1 && (
        <div className={styles["pagination"]}>
          <Button
            variant='outline'
            size='sm'
            onClick={handlePreviousPage}
            disabled={page === 0}>
            <TbChevronLeft />
            {t((m) => m.pages.invoices.viewScans.pagination.previous)}
          </Button>
          <span className={styles["pageInfo"]}>
            {t((m) => m.pages.invoices.viewScans.pagination.pageInfo, {
              current: String(page + 1),
              total: String(totalPages),
              count: String(validScans.length),
            })}
          </span>
          <Button
            variant='outline'
            size='sm'
            onClick={handleNextPage}
            disabled={page >= totalPages - 1}>
            {t((m) => m.pages.invoices.viewScans.pagination.next)}
            <TbChevronRight />
          </Button>
        </div>
      )}
    </>
  );
}
