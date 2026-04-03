"use client";

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
  DialogTrigger,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@arolariu/components";
import {useTranslations} from "next-intl";
import Image from "next/image";
import {useCallback, useState} from "react";
import {TbArrowLeft, TbArrowRight, TbDownload, TbRotateClockwise, TbZoomIn, TbZoomOut, TbZoomReset} from "react-icons/tb";
import {useInvoiceContext} from "../../_context/InvoiceContext";
import styles from "./ReceiptScanCard.module.scss";

export function ReceiptScanCard(): React.JSX.Element {
  const t = useTranslations("Invoices.ViewInvoice.receiptScanCard");
  const {invoice} = useInvoiceContext();
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [currentScanIndex, setCurrentScanIndex] = useState<number>(0);
  const [isTransitioning, setIsTransitioning] = useState<boolean>(false);

  // Zoom and rotate state for card view
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [rotation, setRotation] = useState<number>(0);
  const [transformOrigin, setTransformOrigin] = useState<string>("center center");

  // Zoom and rotate state for dialog view
  const [dialogZoomLevel, setDialogZoomLevel] = useState<number>(1);
  const [dialogRotation, setDialogRotation] = useState<number>(0);
  const [dialogTransformOrigin, setDialogTransformOrigin] = useState<string>("center center");

  const scans = invoice.scans || [];
  const totalScans = scans.length;
  const currentScan = scans[currentScanIndex];
  const currentScanSrc = currentScan?.location || "/placeholder.svg";

  const handleNextScan = useCallback(() => {
    if (currentScanIndex < totalScans - 1) {
      setIsTransitioning(true);
      setTimeout(() => {
        setCurrentScanIndex((prev) => prev + 1);
        setIsTransitioning(false);
        // Reset zoom and rotation when changing scans
        setZoomLevel(1);
        setRotation(0);
        setDialogZoomLevel(1);
        setDialogRotation(0);
      }, 200);
    }
  }, [currentScanIndex, totalScans]);

  const handlePreviousScan = useCallback(() => {
    if (currentScanIndex > 0) {
      setIsTransitioning(true);
      setTimeout(() => {
        setCurrentScanIndex((prev) => prev - 1);
        setIsTransitioning(false);
        // Reset zoom and rotation when changing scans
        setZoomLevel(1);
        setRotation(0);
        setDialogZoomLevel(1);
        setDialogRotation(0);
      }, 200);
    }
  }, [currentScanIndex]);

  // Card zoom controls
  const handleZoomIn = useCallback(() => {
    setZoomLevel((prev) => Math.min(prev + 0.25, 3));
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoomLevel((prev) => Math.max(prev - 0.25, 0.5));
  }, []);

  const handleResetZoom = useCallback(() => {
    setZoomLevel(1);
    setTransformOrigin("center center");
  }, []);

  const handleRotate = useCallback(() => {
    setRotation((prev) => (prev + 90) % 360);
  }, []);

  // Dialog zoom controls - toggle between normal and zoomed
  const handleDialogImageClick = useCallback(() => {
    setDialogZoomLevel((prev) => (prev === 1 ? 2 : 1));
  }, []);

  const handleDialogResetZoom = useCallback(() => {
    setDialogZoomLevel(1);
    setDialogTransformOrigin("center center");
  }, []);

  const handleDialogRotate = useCallback(() => {
    setDialogRotation((prev) => (prev + 90) % 360);
  }, []);

  const handleDownload = useCallback(() => {
    const link = document.createElement("a");
    link.href = currentScanSrc;
    link.download = `receipt-scan-${currentScanIndex + 1}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [currentScanSrc, currentScanIndex]);

  // Mouse move handler for card view - updates transform origin based on cursor position
  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (zoomLevel <= 1) return; // Only track when zoomed in
      const rect = e.currentTarget.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;
      setTransformOrigin(`${x}% ${y}%`);
    },
    [zoomLevel],
  );

  // Mouse move handler for dialog view - updates transform origin based on cursor position
  const handleDialogMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (dialogZoomLevel <= 1) return; // Only track when zoomed in
      const rect = e.currentTarget.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;
      setDialogTransformOrigin(`${x}% ${y}%`);
    },
    [dialogZoomLevel],
  );

  return (
    <TooltipProvider>
      <Card className={styles["card"]}>
        <CardHeader>
          <CardTitle className={styles["cardTitle"]}>
            {totalScans > 1 ? t("titleWithIndex", {current: String(currentScanIndex + 1), total: String(totalScans)}) : t("title")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Dialog
            open={isOpen}
            onOpenChange={setIsOpen}>
            <DialogTrigger
              render={
                <div className={styles["imageContainer"]}>
                  <div
                    className={styles["imageWrapper"]}
                    style={{
                      transform: `scale(${zoomLevel}) rotate(${rotation}deg)`,
                      transformOrigin,
                    }}
                    onMouseMove={handleMouseMove}>
                    <Image
                      src={currentScanSrc}
                      alt={t("scanAlt", {index: String(currentScanIndex + 1)})}
                      width={400}
                      height={600}
                      className={`${styles["scanImage"]} ${isTransitioning ? styles["scanImageTransitioning"] : ""}`}
                    />
                  </div>
                </div>
              }
            />
            <DialogContent className={styles["dialogContent"]}>
              <DialogHeader>
                <DialogTitle>
                  {totalScans > 1
                    ? t("dialogTitleWithIndex", {current: String(currentScanIndex + 1), total: String(totalScans)})
                    : t("dialogTitle")}
                </DialogTitle>
              </DialogHeader>
              <div className={styles["dialogImageContainer"]}>
                <div
                  className={styles["dialogImageWrapper"]}
                  style={{
                    transform: `scale(${dialogZoomLevel}) rotate(${dialogRotation}deg)`,
                    transformOrigin: dialogTransformOrigin,
                    cursor: "pointer",
                  }}
                  onClick={handleDialogImageClick}
                  onMouseMove={handleDialogMouseMove}
                  role='button'
                  tabIndex={0}
                  aria-label={t("controls.toggleZoom")}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      handleDialogImageClick();
                    }
                  }}>
                  <Image
                    src={currentScanSrc}
                    alt={t("scanAltFullSize", {index: String(currentScanIndex + 1)})}
                    width={800}
                    height={1200}
                    className={styles["dialogImage"]}
                  />
                </div>
              </div>
              {/* Dialog controls */}
              <div className={styles["dialogControls"]}>
                <div className={styles["controlGroup"]}>
                  <Tooltip>
                    <TooltipTrigger
                      render={
                        <Button
                          variant='outline'
                          size='sm'
                          onClick={handleDialogResetZoom}
                          disabled={dialogZoomLevel === 1}>
                          <TbZoomReset className={styles["controlIcon"]} />
                          <span className={styles["controlLabelDesktop"]}>{t("controls.reset")}</span>
                        </Button>
                      }
                    />
                    <TooltipContent>
                      <p>{t("controls.reset")}</p>
                    </TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger
                      render={
                        <Button
                          variant='outline'
                          size='sm'
                          onClick={handleDialogRotate}>
                          <TbRotateClockwise className={styles["controlIcon"]} />
                          <span className={styles["controlLabelDesktop"]}>{t("controls.rotate")}</span>
                        </Button>
                      }
                    />
                    <TooltipContent>
                      <p>{t("controls.rotate")}</p>
                    </TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger
                      render={
                        <Button
                          variant='outline'
                          size='sm'
                          onClick={handleDownload}>
                          <TbDownload className={styles["controlIcon"]} />
                          <span className={styles["controlLabelDesktop"]}>{t("controls.download")}</span>
                        </Button>
                      }
                    />
                    <TooltipContent>
                      <p>{t("controls.download")}</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
                {totalScans > 1 && (
                  <div className={styles["dialogNavigation"]}>
                    <Button
                      variant='secondary'
                      size='sm'
                      onClick={handlePreviousScan}
                      disabled={currentScanIndex === 0}>
                      <TbArrowLeft className={styles["controlIcon"]} />
                      <span className={styles["controlLabelDesktop"]}>{t("navigation.previous")}</span>
                    </Button>
                    <span className={styles["scanCounter"]}>
                      {currentScanIndex + 1} {t("navigation.of")} {totalScans}
                    </span>
                    <Button
                      variant='secondary'
                      size='sm'
                      onClick={handleNextScan}
                      disabled={currentScanIndex === totalScans - 1}>
                      <span className={styles["controlLabelDesktop"]}>{t("navigation.next")}</span>
                      <TbArrowRight className={styles["controlIcon"]} />
                    </Button>
                  </div>
                )}
              </div>
            </DialogContent>
          </Dialog>

          {/* Card controls */}
          <div className={styles["cardControls"]}>
            <div className={styles["controlGroup"]}>
              <Tooltip>
                <TooltipTrigger
                  render={
                    <Button
                      variant='outline'
                      size='sm'
                      onClick={handleZoomIn}
                      disabled={zoomLevel >= 3}>
                      <TbZoomIn className={styles["controlIcon"]} />
                    </Button>
                  }
                />
                <TooltipContent>
                  <p>{t("controls.zoomIn")}</p>
                </TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger
                  render={
                    <Button
                      variant='outline'
                      size='sm'
                      onClick={handleZoomOut}
                      disabled={zoomLevel <= 0.5}>
                      <TbZoomOut className={styles["controlIcon"]} />
                    </Button>
                  }
                />
                <TooltipContent>
                  <p>{t("controls.zoomOut")}</p>
                </TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger
                  render={
                    <Button
                      variant='outline'
                      size='sm'
                      onClick={handleResetZoom}
                      disabled={zoomLevel === 1}>
                      <TbZoomReset className={styles["controlIcon"]} />
                    </Button>
                  }
                />
                <TooltipContent>
                  <p>{t("controls.reset")}</p>
                </TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger
                  render={
                    <Button
                      variant='outline'
                      size='sm'
                      onClick={handleRotate}>
                      <TbRotateClockwise className={styles["controlIcon"]} />
                    </Button>
                  }
                />
                <TooltipContent>
                  <p>{t("controls.rotate")}</p>
                </TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger
                  render={
                    <Button
                      variant='outline'
                      size='sm'
                      onClick={handleDownload}>
                      <TbDownload className={styles["controlIcon"]} />
                    </Button>
                  }
                />
                <TooltipContent>
                  <p>{t("controls.download")}</p>
                </TooltipContent>
              </Tooltip>
            </div>
          </div>
        </CardContent>
        <CardFooter className={styles["cardFooter"]}>
          {totalScans > 1 && (
            <div className={styles["scanNavigation"]}>
              {currentScanIndex > 0 && (
                <Tooltip>
                  <TooltipTrigger
                    render={
                      <Button
                        variant='secondary'
                        className={styles["navButton"]}
                        onClick={handlePreviousScan}>
                        <TbArrowLeft className={styles["navIcon"]} />
                        {t("buttons.previousScan")}
                      </Button>
                    }
                  />
                  <TooltipContent>
                    <p>{t("tooltips.previousScan")}</p>
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
                        {t("buttons.nextScan")}
                        <TbArrowRight className={styles["navIcon"]} />
                      </Button>
                    }
                  />
                  <TooltipContent>
                    <p>{t("tooltips.nextScan")}</p>
                  </TooltipContent>
                </Tooltip>
              )}
            </div>
          )}
        </CardFooter>
      </Card>
    </TooltipProvider>
  );
}
