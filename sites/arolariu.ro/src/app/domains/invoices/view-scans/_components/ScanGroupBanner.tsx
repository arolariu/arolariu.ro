"use client";

/**
 * @fileoverview Banner component that suggests combining scans uploaded together.
 * @module app/domains/invoices/view-scans/_components/ScanGroupBanner
 *
 * @remarks
 * **Rendering Context**: Client Component (`"use client"` directive).
 *
 * **Purpose**: Detects when multiple scans were uploaded within 5 minutes of each other
 * and displays a dismissible banner suggesting to combine them into a single invoice.
 *
 * **Features**:
 * - Auto-detection of scan groups based on upload timestamps
 * - Dismissible banner (persists in session storage)
 * - Quick action button to navigate to invoice creation
 * - Displays scan thumbnails (first 3-4) in the banner
 * - Slide-in animation from top
 *
 * @returns The ScanGroupBanner component, CSR'ed.
 */

import {useScansStore} from "@/stores";
import {ScanStatus} from "@/types/scans";
import {Button} from "@arolariu/components";
import {motion} from "motion/react";
import {useTranslations} from "next-intl";
import {useRouter} from "next/navigation";
import {useCallback, useEffect, useMemo, useState} from "react";
import {TbCheck, TbFileTypePdf} from "react-icons/tb";
import styles from "./ScanGroupBanner.module.scss";

/**
 * Props for the ScanGroupBanner component.
 */
interface ScanGroupBannerProps {
  /** Whether the banner should be visible initially */
  readonly initialVisible?: boolean;
}

/**
 * Banner component suggesting to combine scans uploaded together.
 *
 * @remarks
 * Displays when 2+ scans have uploadedAt timestamps within 5 minutes of each other.
 * Dismissible and persists dismissal in session storage.
 *
 * @param props - Component props
 * @returns The ScanGroupBanner component
 */
export default function ScanGroupBanner({initialVisible = true}: Readonly<ScanGroupBannerProps>): React.JSX.Element | null {
  const t = useTranslations("IMS--ViewScans.groupBanner");
  const router = useRouter();
  const {scans, setSelectedScans} = useScansStore();
  const [isDismissed, setIsDismissed] = useState<boolean>(!initialVisible);

  // Check session storage on mount
  useEffect(() => {
    const dismissed = sessionStorage.getItem("scan-group-banner-dismissed");
    if (dismissed === "true") {
      setIsDismissed(true);
    }
  }, []);

  /**
   * Find groups of scans uploaded within 5 minutes of each other.
   */
  const scanGroup = useMemo(() => {
    const readyScans = scans.filter((scan) => scan.status === ScanStatus.READY);

    // Hide banner entirely when there are too many scans
    if (readyScans.length > 5) {
      return null;
    }

    // Need at least 2 scans
    if (readyScans.length < 2) {
      return null;
    }

    // Sort by upload time
    const sorted = [...readyScans].sort((a, b) => new Date(a.uploadedAt).getTime() - new Date(b.uploadedAt).getTime());

    // Find the largest group within 5 minutes
    const FIVE_MINUTES_MS = 5 * 60 * 1000;
    let bestGroup: typeof readyScans = [];

    for (let i = 0; i < sorted.length; i++) {
      const group = [sorted[i]!];
      const startTime = new Date(sorted[i]!.uploadedAt).getTime();

      for (let j = i + 1; j < sorted.length; j++) {
        const currentTime = new Date(sorted[j]!.uploadedAt).getTime();
        if (currentTime - startTime <= FIVE_MINUTES_MS) {
          group.push(sorted[j]!);
        } else {
          break;
        }
      }

      if (group.length >= 2 && group.length > bestGroup.length) {
        bestGroup = group;
      }
    }

    return bestGroup.length >= 2 && bestGroup.length <= 5 ? bestGroup : null;
  }, [scans]);

  /**
   * Dismiss the banner and persist in session storage.
   */
  const handleDismiss = useCallback(() => {
    setIsDismissed(true);
    sessionStorage.setItem("scan-group-banner-dismissed", "true");
  }, []);

  /**
   * Select the scans in the group and navigate to invoice creation.
   */
  const handleCombine = useCallback(() => {
    if (!scanGroup) return;

    // Select all scans in the group
    setSelectedScans(scanGroup);

    // Navigate to create-invoice page
    router.push("/domains/invoices/create-invoice");
  }, [scanGroup, setSelectedScans, router]);

  // Don't show if dismissed or no group found
  if (isDismissed || !scanGroup) {
    return null;
  }

  // Get first 4 scans for thumbnails
  const thumbnailScans = scanGroup.slice(0, 4);
  const remainingCount = scanGroup.length - thumbnailScans.length;

  return (
    <motion.div
      initial={{opacity: 0, y: -20}}
      animate={{opacity: 1, y: 0}}
      exit={{opacity: 0, y: -20}}
      transition={{duration: 0.3, ease: "easeOut"}}
      className={styles["banner"]}>
      <div className={styles["content"]}>
        <div className={styles["thumbnails"]}>
          {thumbnailScans.map((scan) => (
            <div
              key={scan.id}
              className={styles["thumbnail"]}>
              {scan.mimeType === "application/pdf" ? (
                <div className={styles["pdfPlaceholder"]}>
                  <TbFileTypePdf className={styles["pdfIcon"]} />
                </div>
              ) : (
                <img
                  src={scan.blobUrl}
                  alt={scan.name}
                  className={styles["thumbnailImage"]}
                />
              )}
            </div>
          ))}
          {remainingCount > 0 && <div className={styles["thumbnailMore"]}>+{remainingCount}</div>}
        </div>
        <div className={styles["text"]}>
          <p className={styles["title"]}>{t("title", {count: String(scanGroup.length)})}</p>
          <p className={styles["subtitle"]}>{t("subtitle")}</p>
        </div>
      </div>
      <div className={styles["actions"]}>
        <Button
          size='sm'
          onClick={handleCombine}
          className={styles["createButton"]}>
          <TbCheck className={styles["checkIcon"]} />
          {t("createInvoice")}
        </Button>
        <Button
          variant='ghost'
          size='sm'
          onClick={handleDismiss}
          className={styles["dismissButton"]}>
          {t("dismiss")}
        </Button>
      </div>
    </motion.div>
  );
}
