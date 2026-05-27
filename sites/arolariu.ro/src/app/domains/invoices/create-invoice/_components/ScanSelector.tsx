"use client";

/**
 * @fileoverview Scan selector component for selecting scans to include in invoice.
 * @module app/domains/invoices/create-invoice/_components/ScanSelector
 *
 * @remarks
 * Displays a grid of available READY scans with:
 * - Visual scan preview (image thumbnail)
 * - Checkbox overlay for selection
 * - Scan metadata (name, upload date, size)
 * - Select All / Clear Selection actions
 * - Selected count indicator
 */

import {useScansStore} from "@/stores";
import {ScanStatus} from "@/types/scans";
import {Badge, Button} from "@arolariu/components";
import {useTranslations} from "next-intl-selector";
import {useCallback, useEffect, useState} from "react";
import {TbCheck, TbChevronLeft, TbChevronRight, TbPhoto, TbX} from "react-icons/tb";
import ScanCard from "../../_components/ScanCard";
import {useCreateInvoiceContext} from "../_context/CreateInvoiceContext";
import styles from "./ScanSelector.module.scss";

/**
 * Scan selector component.
 *
 * @returns JSX element with scan selection UI
 */
export default function ScanSelector(): React.JSX.Element {
  const t = useTranslations();
  const {scans} = useScansStore();
  const {selectedScans, toggleScan, selectAllScans, clearSelection} = useCreateInvoiceContext();

  // Pagination constants
  const MOBILE_PAGE_SIZE = 20;
  const DESKTOP_PAGE_SIZE = 50;

  // Pagination state
  const [page, setPage] = useState(0);
  const [isMobile, setIsMobile] = useState(false);

  // Responsive detection
  useEffect(() => {
    const checkMobile = (): void => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const readyScans = scans.filter((scan) => scan.status === ScanStatus.READY);
  const hasScans = readyScans.length > 0;
  const allSelected = hasScans && selectedScans.length === readyScans.length;

  // Pagination calculations
  const pageSize = isMobile ? MOBILE_PAGE_SIZE : DESKTOP_PAGE_SIZE;
  const totalPages = Math.ceil(readyScans.length / pageSize);
  const paginatedScans = readyScans.slice(page * pageSize, (page + 1) * pageSize);

  // Reset page when scans change
  useEffect(() => {
    setPage(0);
  }, [readyScans.length]);

  /**
   * Factory: returns a stable toggle handler for a specific scan.
   * Each scan gets its own callback to avoid re-rendering on unrelated state changes.
   */
  const createToggleScanHandler = useCallback(
    (scan: (typeof readyScans)[0]) => {
      return () => toggleScan(scan);
    },
    [toggleScan],
  );

  /** Navigates to the previous page of scans. */
  const handlePreviousPage = useCallback(() => {
    setPage((p) => Math.max(0, p - 1));
  }, []);

  /** Navigates to the next page of scans. */
  const handleNextPage = useCallback(() => {
    setPage((p) => Math.min(totalPages - 1, p + 1));
  }, [totalPages]);

  return (
    <div className={styles["container"]}>
      {/* Header with actions */}
      <div className={styles["header"]}>
        <div className={styles["headerInfo"]}>
          <h2 className={styles["title"]}>{t((m) => m.forms.invoices.createInvoice.scanSelector.title)}</h2>
          <p className={styles["subtitle"]}>{t((m) => m.forms.invoices.createInvoice.scanSelector.subtitle)}</p>
        </div>

        <div className={styles["actions"]}>
          {selectedScans.length > 0 ? (
            <Badge
              variant='secondary'
              className={styles["selectedBadge"]}>
              {t((m) => m.forms.invoices.createInvoice.scanSelector.selectedCount, {count: String(selectedScans.length)})}
            </Badge>
          ) : null}

          {hasScans ? (
            allSelected ? (
              <Button
                variant='outline'
                size='sm'
                onClick={clearSelection}>
                <TbX />
                {t((m) => m.forms.invoices.createInvoice.scanSelector.clearAll)}
              </Button>
            ) : (
              <Button
                variant='outline'
                size='sm'
                onClick={selectAllScans}
                disabled={readyScans.length > 5}>
                <TbCheck />
                {t((m) => m.forms.invoices.createInvoice.scanSelector.selectAll)}
              </Button>
            )
          ) : null}
        </div>
      </div>

      {/* Scans grid */}
      {hasScans ? (
        <>
          <div className={styles["scansGrid"]}>
            {paginatedScans.map((scan) => (
              <ScanCard
                key={scan.id}
                scan={scan}
                isSelected={selectedScans.some((s) => s.id === scan.id)}
                onToggleSelect={createToggleScanHandler(scan)}
              />
            ))}
          </div>

          {/* Pagination controls */}
          {totalPages > 1 && (
            <div className={styles["pagination"]}>
              <Button
                variant='outline'
                size='sm'
                onClick={handlePreviousPage}
                disabled={page === 0}>
                <TbChevronLeft />
                {t((m) => m.forms.invoices.createInvoice.scanSelector.previous)}
              </Button>
              <span className={styles["pageInfo"]}>
                {page + 1} / {totalPages} ({readyScans.length} {t((m) => m.forms.invoices.createInvoice.scanSelector.scansCount)})
              </span>
              <Button
                variant='outline'
                size='sm'
                onClick={handleNextPage}
                disabled={page >= totalPages - 1}>
                {t((m) => m.forms.invoices.createInvoice.scanSelector.next)}
                <TbChevronRight />
              </Button>
            </div>
          )}
        </>
      ) : (
        <div className={styles["emptyState"]}>
          <TbPhoto className={styles["emptyIcon"]} />
          <p className={styles["emptyText"]}>{t((m) => m.forms.invoices.createInvoice.scanSelector.noScans)}</p>
        </div>
      )}
    </div>
  );
}
