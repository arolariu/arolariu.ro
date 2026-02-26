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
  const t = useTranslations("Domains.services.invoices.ui.receiptScanCard");
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
      <Card className='transition-shadow duration-300 hover:shadow-md'>
        <CardHeader>
          <CardTitle className='text-lg'>
            {t("title")} {totalScans > 1 ? `(${currentScanIndex + 1}/${totalScans})` : ""}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Dialog
            open={isOpen}
            onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
              <div className={styles["imageContainer"]}>
                <Image
                  src={currentScanSrc}
                  alt={t("scanAlt", {index: String(currentScanIndex + 1)})}
                  width={400}
                  height={600}
                  className={`${styles["scanImage"]} ${isTransitioning ? styles["scanImageTransitioning"] : ""}`}
                />
              </div>
            </DialogTrigger>
            <DialogContent className='max-w-3xl'>
              <DialogHeader>
                <DialogTitle>
                  {t("dialogTitle")} {totalScans > 1 ? `(${currentScanIndex + 1}/${totalScans})` : ""}
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
        <CardFooter className='flex flex-col gap-2'>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant='outline'
                className='w-full bg-transparent'
                onClick={handleOpenImage}>
                <TbZoomIn className='mr-2 h-4 w-4' />
                {t("buttons.expand")}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>{t("tooltips.expand")}</p>
            </TooltipContent>
          </Tooltip>
          {totalScans > 1 && (
            <div className={styles["scanNavigation"]}>
              {currentScanIndex > 0 && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant='secondary'
                      className='flex-1'
                      onClick={handlePreviousScan}>
                      {t("buttons.previousScan")}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{t("tooltips.previousScan")}</p>
                  </TooltipContent>
                </Tooltip>
              )}
              {currentScanIndex < totalScans - 1 && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant='secondary'
                      className='flex-1'
                      onClick={handleNextScan}>
                      {t("buttons.nextScan")}
                    </Button>
                  </TooltipTrigger>
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
