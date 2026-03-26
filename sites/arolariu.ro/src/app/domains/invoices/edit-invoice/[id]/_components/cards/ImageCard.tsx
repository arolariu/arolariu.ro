"use client";

import type {Invoice} from "@/types/invoices";
import {
  Button,
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@arolariu/components";
import {useTranslations} from "next-intl";
import Image from "next/image";
import {useCallback, useState} from "react";
import {TbChevronLeft, TbChevronRight, TbPlus, TbTrash, TbZoomIn} from "react-icons/tb";
import {useDialog} from "../../../../_contexts/DialogContext";
import styles from "./ImageCard.module.scss";

type Props = {invoice: Invoice};

/**
 * Displays receipt images with navigation, zoom, and add/remove capabilities.
 *
 * @remarks
 * **Rendering Context**: Client Component (uses hooks for state and dialogs).
 *
 * **Features**:
 * - **Image Gallery**: Navigate between all scans attached to the invoice
 * - **Expand Dialog**: Click image or button to view full-size
 * - **Add Scan**: Opens dialog to upload and attach new scans
 * - **Remove Scan**: Opens confirmation dialog to remove current scan
 * - **Fallback**: Uses placeholder image if no scans are available
 *
 * **Navigation**: Previous/Next buttons appear only when multiple scans exist.
 * Current position indicator shows scan index (e.g., "2/3").
 *
 * @param props - Component properties containing the invoice with scan data
 * @returns Client-rendered card with receipt image gallery and controls
 *
 * @example
 * ```tsx
 * <ImageCard invoice={invoice} />
 * // Displays receipt gallery with navigation and add/remove buttons
 * ```
 *
 * @see {@link AddScanDialog} - Dialog for adding new scans
 * @see {@link RemoveScanDialog} - Dialog for removing scans
 */
export default function ImageCard({invoice}: Readonly<Props>): React.JSX.Element {
  const t = useTranslations("Invoices.EditInvoice.imageCard");
  const [currentScanIndex, setCurrentScanIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [isZoomOpen, setIsZoomOpen] = useState(false);

  const scans = invoice.scans || [];
  const totalScans = scans.length;
  const currentScan = scans[currentScanIndex];
  const currentScanSrc = currentScan?.location || "https://dummyimage.com/600x900&text=placeholder+image";

  // Dialog hooks - using consolidated EDIT_INVOICE__SCAN with mode differentiation
  const {open: openAddScan} = useDialog("EDIT_INVOICE__SCAN", "add", invoice);
  const {open: openRemoveScan} = useDialog("EDIT_INVOICE__SCAN", "delete", {
    invoice,
    scan: currentScan!,
    scanIndex: currentScanIndex,
  });

  const handleNextScan = useCallback(() => {
    if (currentScanIndex < totalScans - 1) {
      setIsTransitioning(true);
      setTimeout(() => {
        setCurrentScanIndex((prev) => prev + 1);
        setIsTransitioning(false);
      }, 150);
    }
  }, [currentScanIndex, totalScans]);

  const handlePreviousScan = useCallback(() => {
    if (currentScanIndex > 0) {
      setIsTransitioning(true);
      setTimeout(() => {
        setCurrentScanIndex((prev) => prev - 1);
        setIsTransitioning(false);
      }, 150);
    }
  }, [currentScanIndex]);

  const handleOpenZoom = useCallback(() => {
    setIsZoomOpen(true);
  }, []);

  return (
    <TooltipProvider>
      <Card className={styles["card"]}>
        <CardHeader className={styles["cardHeader"]}>
          <CardTitle className={styles["cardTitle"]}>
            {totalScans > 1 ? t("titleWithIndex", {current: String(currentScanIndex + 1), total: String(totalScans)}) : t("title")}
          </CardTitle>
        </CardHeader>
        <CardContent className={styles["cardContent"]}>
          <Dialog
            open={isZoomOpen}
            onOpenChange={setIsZoomOpen}>
            <Button
              variant='ghost'
              className={styles["imageButton"]}
              onClick={handleOpenZoom}
              aria-label={t("aria.expandImage")}>
              <Image
                src={currentScanSrc}
                alt={t("scanAlt", {index: String(currentScanIndex + 1)})}
                width={400}
                height={600}
                className={isTransitioning ? styles["receiptImageTransitioning"] : styles["receiptImageNormal"]}
              />
              <div className={styles["zoomOverlayVisible"]}>
                <TbZoomIn className={styles["zoomIcon"]} />
              </div>
            </Button>
            <DialogContent className={styles["zoomDialogContent"]}>
              <DialogHeader>
                <DialogTitle>
                  {totalScans > 1
                    ? t("dialogTitleWithIndex", {current: String(currentScanIndex + 1), total: String(totalScans)})
                    : t("dialogTitle")}
                </DialogTitle>
              </DialogHeader>
              <div className={styles["zoomContainer"]}>
                <Image
                  src={currentScanSrc}
                  alt={t("scanAltFullSize", {index: String(currentScanIndex + 1)})}
                  width={800}
                  height={1200}
                  className={styles["zoomDialogImage"]}
                />
              </div>
            </DialogContent>
          </Dialog>
        </CardContent>
        <CardFooter className={styles["cardFooter"]}>
          {/* Expand button */}
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  variant='outline'
                  className={styles["fullWidthButton"]}
                  onClick={handleOpenZoom}>
                  <TbZoomIn className={styles["buttonIcon"]} />
                  {t("buttons.expand")}
                </Button>
              }
            />
            <TooltipContent>
              <p>{t("tooltips.expand")}</p>
            </TooltipContent>
          </Tooltip>

          {/* Navigation buttons */}
          {totalScans > 1 && (
            <div className={styles["navButtons"]}>
              {currentScanIndex > 0 && (
                <Tooltip>
                  <TooltipTrigger
                    render={
                      <Button
                        variant='secondary'
                        className={styles["navButton"]}
                        onClick={handlePreviousScan}>
                        <TbChevronLeft className={styles["chevronIcon"]} />
                        {t("buttons.previous")}
                      </Button>
                    }
                  />
                  <TooltipContent>
                    <p>{t("tooltips.previous")}</p>
                  </TooltipContent>
                </Tooltip>
              )}
              {currentScanIndex < totalScans - 1 && (
                <Tooltip>
                  <TooltipTrigger
                    render={
                      <Button
                        variant='secondary'
                        className={styles["navButton"]}
                        onClick={handleNextScan}>
                        {t("buttons.next")}
                        <TbChevronRight className={styles["chevronIconRight"]} />
                      </Button>
                    }
                  />
                  <TooltipContent>
                    <p>{t("tooltips.next")}</p>
                  </TooltipContent>
                </Tooltip>
              )}
            </div>
          )}

          {/* Add/Remove buttons */}
          <div className={styles["actionButtons"]}>
            <Tooltip>
              <TooltipTrigger
                render={
                  <Button
                    variant='outline'
                    className={styles["actionButtonFlex"]}
                    onClick={openAddScan}>
                    <TbPlus className={styles["chevronIcon"]} />
                    {t("buttons.addScan")}
                  </Button>
                }
              />
              <TooltipContent>
                <p>{t("tooltips.addScan")}</p>
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger
                render={
                  <Button
                    variant='outline'
                    className={styles["removeButton"]}
                    onClick={openRemoveScan}
                    disabled={totalScans === 0}>
                    <TbTrash className={styles["chevronIcon"]} />
                    {t("buttons.remove")}
                  </Button>
                }
              />
              <TooltipContent>
                <p>{t("tooltips.remove")}</p>
              </TooltipContent>
            </Tooltip>
          </div>
        </CardFooter>
      </Card>
    </TooltipProvider>
  );
}
