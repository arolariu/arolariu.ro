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
import {Badge, Button, Card, CardContent, Checkbox} from "@arolariu/components";
import {motion} from "motion/react";
import {useTranslations} from "next-intl";
import {TbCheck, TbFileTypePdf, TbPhoto, TbX} from "react-icons/tb";
import {useCreateInvoiceContext} from "../_context/CreateInvoiceContext";
import styles from "./ScanSelector.module.scss";

/**
 * Individual scan card component.
 */
function ScanCard({
  scan,
  isSelected,
  onToggle,
}: Readonly<{
  scan: {id: string; name: string; blobUrl: string; uploadedAt: Date; sizeInBytes: number};
  isSelected: boolean;
  onToggle: () => void;
}>): React.JSX.Element {
  const cardClassName = [styles["scanCard"], isSelected && styles["scanCardSelected"]].filter(Boolean).join(" ");

  const formatSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDate = (date: Date): string => {
    return new Intl.DateTimeFormat(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(new Date(date));
  };

  return (
    <motion.div
      whileHover={{scale: 1.02}}
      whileTap={{scale: 0.98}}
      className={styles["scanCardWrapper"]}>
      <Card
        className={cardClassName}
        onClick={onToggle}>
        {/* Selection overlay */}
        <div className={styles["selectionOverlay"]}>
          <Checkbox
            checked={isSelected}
            onCheckedChange={onToggle}
            onClick={(e) => e.stopPropagation()}
            className={styles["checkbox"]}
          />
        </div>

        {/* Scan preview */}
        <div className={styles["scanPreview"]}>
          {scan.mimeType === "application/pdf" || scan.blobUrl?.endsWith(".pdf") ? (
            <div className={styles["pdfPlaceholder"]}>
              <TbFileTypePdf className={styles["pdfIcon"]} />
            </div>
          ) : (
            <img
              src={scan.blobUrl}
              alt={scan.name}
              className={styles["scanImage"]}
              loading='lazy'
            />
          )}
        </div>

        {/* Scan info */}
        <CardContent className={styles["scanInfo"]}>
          <p className={styles["scanName"]}>{scan.name}</p>
          <div className={styles["scanMeta"]}>
            <span className={styles["scanDate"]}>{formatDate(scan.uploadedAt)}</span>
            <span className={styles["scanSize"]}>{formatSize(scan.sizeInBytes)}</span>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

/**
 * Scan selector component.
 *
 * @returns JSX element with scan selection UI
 */
export default function ScanSelector(): React.JSX.Element {
  const t = useTranslations("Invoices.CreateInvoice.scanSelector");
  const {scans} = useScansStore();
  const {selectedScans, toggleScan, selectAllScans, clearSelection} = useCreateInvoiceContext();

  const readyScans = scans.filter((scan) => scan.status === ScanStatus.READY);
  const hasScans = readyScans.length > 0;
  const allSelected = hasScans && selectedScans.length === readyScans.length;

  return (
    <div className={styles["container"]}>
      {/* Header with actions */}
      <div className={styles["header"]}>
        <div className={styles["headerInfo"]}>
          <h2 className={styles["title"]}>{t("title")}</h2>
          <p className={styles["subtitle"]}>{t("subtitle")}</p>
        </div>

        <div className={styles["actions"]}>
          {selectedScans.length > 0 && (
            <Badge
              variant='secondary'
              className={styles["selectedBadge"]}>
              {t("selectedCount", {count: String(selectedScans.length)})}
            </Badge>
          )}

          {hasScans && (
            <>
              {allSelected ? (
                <Button
                  variant='outline'
                  size='sm'
                  onClick={clearSelection}>
                  <TbX />
                  {t("clearAll")}
                </Button>
              ) : (
                <Button
                  variant='outline'
                  size='sm'
                  onClick={selectAllScans}>
                  <TbCheck />
                  {t("selectAll")}
                </Button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Scans grid */}
      {hasScans ? (
        <div className={styles["scansGrid"]}>
          {readyScans.map((scan) => (
            <ScanCard
              key={scan.id}
              scan={scan}
              isSelected={selectedScans.some((s) => s.id === scan.id)}
              onToggle={() => toggleScan(scan)}
            />
          ))}
        </div>
      ) : (
        <div className={styles["emptyState"]}>
          <TbPhoto className={styles["emptyIcon"]} />
          <p className={styles["emptyText"]}>{t("noScans")}</p>
        </div>
      )}
    </div>
  );
}
