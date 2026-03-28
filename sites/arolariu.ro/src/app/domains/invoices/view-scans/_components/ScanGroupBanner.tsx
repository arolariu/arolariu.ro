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
 *
 * @returns The ScanGroupBanner component, CSR'ed.
 */

import {useScansStore} from "@/stores";
import {ScanStatus} from "@/types/scans";
import {Button} from "@arolariu/components";
import {useTranslations} from "next-intl";
import {useRouter} from "next/navigation";
import {useCallback, useEffect, useMemo, useState} from "react";
import {TbArrowRight, TbLightbulb, TbX} from "react-icons/tb";
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
  const t = useTranslations("Invoices.ViewScans.groupBanner");
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
      const group = [sorted[i]];
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

    return bestGroup.length >= 2 ? bestGroup : null;
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

    // Navigate to view-scans page (which will show the create invoice dialog)
    router.push("/domains/invoices/view-scans");
  }, [scanGroup, setSelectedScans, router]);

  // Don't show if dismissed or no group found
  if (isDismissed || !scanGroup) {
    return null;
  }

  return (
    <div className={styles["banner"]}>
      <div className={styles["content"]}>
        <div className={styles["iconWrapper"]}>
          <TbLightbulb className={styles["icon"]} />
        </div>
        <div className={styles["text"]}>
          <p className={styles["title"]}>{t("title", {count: String(scanGroup.length)})}</p>
        </div>
      </div>
      <div className={styles["actions"]}>
        <Button
          variant='ghost'
          size='sm'
          onClick={handleCombine}
          className={styles["combineButton"]}>
          {t("combine")}
          <TbArrowRight className={styles["arrowIcon"]} />
        </Button>
        <Button
          variant='ghost'
          size='icon'
          onClick={handleDismiss}
          aria-label={t("dismiss")}
          className={styles["dismissButton"]}>
          <TbX className={styles["dismissIcon"]} />
        </Button>
      </div>
    </div>
  );
}
