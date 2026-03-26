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
import {TbZoomIn} from "react-icons/tb";
import {useInvoiceContext} from "../../_context/InvoiceContext";
import styles from "./ReceiptScanCard.module.scss";

export function ReceiptScanCard(): React.JSX.Element {
  const t = useTranslations("Invoices.ViewInvoice.receiptScanCard");
  const {invoice} = useInvoiceContext();
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [currentScanIndex, setCurrentScanIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);

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
      }, 200);
    }
  }, [currentScanIndex, totalScans]);

  const handlePreviousScan = useCallback(() => {
    if (currentScanIndex > 0) {
      setIsTransitioning(true);
      setTimeout(() => {
        setCurrentScanIndex((prev) => prev - 1);
        setIsTransitioning(false);
      }, 200);
    }
  }, [currentScanIndex]);

  const handleOpenImage = useCallback(() => {
    setIsOpen(true);
  }, []);

  return (
    <TooltipProvider>
      <Card>
        <CardHeader>
          <CardTitle>
            {totalScans > 1 ? t("titleWithIndex", {current: String(currentScanIndex + 1), total: String(totalScans)}) : t("title")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Dialog
            open={isOpen}
            onOpenChange={setIsOpen}>
            <DialogTrigger render={
              <div className={styles["imageContainer"]}>
                <Image
                  src={currentScanSrc}
                  alt={t("scanAlt", {index: String(currentScanIndex + 1)})}
                  width={400}
                  height={600}
                  className={`${styles["scanImage"]} ${isTransitioning ? styles["scanImageTransitioning"] : ""}`}
                />
              </div>
            } />
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {totalScans > 1
                    ? t("dialogTitleWithIndex", {current: String(currentScanIndex + 1), total: String(totalScans)})
                    : t("dialogTitle")}
                </DialogTitle>
              </DialogHeader>
              <div className={styles["dialogImageContainer"]}>
                <Image
                  src={currentScanSrc}
                  alt={t("scanAltFullSize", {index: String(currentScanIndex + 1)})}
                  width={800}
                  height={1200}
                  className={styles["dialogImage"]}
                />
              </div>
            </DialogContent>
          </Dialog>
        </CardContent>
        <CardFooter>
          <div className={styles["footerContent"]}>
          <Tooltip>
            <TooltipTrigger render={
              <Button
                variant='outline'
                onClick={handleOpenImage}>
                <TbZoomIn className={styles["zoomIcon"]} />
                {t("buttons.expand")}
              </Button>
            } />
            <TooltipContent>
              <p>{t("tooltips.expand")}</p>
            </TooltipContent>
          </Tooltip>
          {totalScans > 1 && (
            <div className={styles["scanNavigation"]}>
              {currentScanIndex > 0 && (
                <Tooltip>
                  <TooltipTrigger render={
                    <Button
                      variant='secondary'
                      onClick={handlePreviousScan}>
                      {t("buttons.previousScan")}
                    </Button>
                  } />
                  <TooltipContent>
                    <p>{t("tooltips.previousScan")}</p>
                  </TooltipContent>
                </Tooltip>
              )}
              {currentScanIndex < totalScans - 1 && (
                <Tooltip>
                  <TooltipTrigger render={
                    <Button
                      variant='secondary'
                      onClick={handleNextScan}>
                      {t("buttons.nextScan")}
                    </Button>
                  } />
                  <TooltipContent>
                    <p>{t("tooltips.nextScan")}</p>
                  </TooltipContent>
                </Tooltip>
              )}
            </div>
          )}
          </div>
        </CardFooter>
      </Card>
    </TooltipProvider>
  );
}
