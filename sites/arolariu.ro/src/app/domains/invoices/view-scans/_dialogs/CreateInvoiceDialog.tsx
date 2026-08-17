"use client";

/**
 * @fileoverview Dialog for choosing invoice creation mode.
 * @module app/domains/invoices/view-scans/_dialogs/CreateInvoiceDialog
 */

import {formatDate, formatFileSize} from "@/lib/utils.generic";
import {useInvoicesStore, useScansStore} from "@/stores";
import {
  Button,
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Label,
  RadioGroup,
  RadioGroupItem,
  toast,
} from "@arolariu/components";
import {AnimatePresence, motion} from "motion/react";
import {useTranslations} from "next-intl-selector";
import {useRouter} from "next/navigation";
import {useCallback, useState} from "react";
import {
  TbAlertCircle,
  TbAlertTriangle,
  TbArrowRight,
  TbCheck,
  TbFileInvoice,
  TbLoader2,
  TbPhoto,
  TbSparkles,
  TbStack2,
  TbX,
} from "react-icons/tb";
import ScanCard from "../../_cards/ScanCard";
import {useDialog} from "../../_contexts/DialogContext";
import {createInvoiceFromScans} from "../_actions/createInvoiceFromScans";
import styles from "./CreateInvoiceDialog.module.scss";

type CreationMode = "single" | "batch";
type CreationStep = "select" | "creating" | "complete";
type SafeErrorCode = "NETWORK_ERROR" | "TIMEOUT_ERROR" | "AUTH_ERROR" | "NOT_FOUND" | "VALIDATION_ERROR" | "SERVER_ERROR" | "UNKNOWN_ERROR";

type CreationError = Readonly<{
  code: SafeErrorCode;
  scanId?: string;
  scanName?: string;
}>;

/**
 * Dialog for choosing between single and batch invoice creation modes.
 * Uses the DialogContext for state management.
 */
export default function CreateInvoiceDialog(): React.JSX.Element {
  const t = useTranslations();
  const router = useRouter();

  // Dialog state from context
  const {
    isOpen,
    open,
    close,
    currentDialog: {payload},
  } = useDialog("VIEW_SCANS__CREATE_INVOICE", "add");

  // Get selectedScans from payload
  const {selectedScans = []} = payload ?? {};

  // Local state for wizard steps
  const [mode, setMode] = useState<CreationMode>("single");
  const [step, setStep] = useState<CreationStep>("select");
  const [createdCount, setCreatedCount] = useState(0);
  const [errors, setErrors] = useState<CreationError[]>([]);
  const [analysisQueueFailureCount, setAnalysisQueueFailureCount] = useState(0);

  // Store actions
  const archiveScans = useScansStore((state) => state.archiveScans);
  const clearSelectedScans = useScansStore((state) => state.clearSelectedScans);
  const markScansAsUsedByInvoice = useScansStore((state) => state.markScansAsUsedByInvoice);
  const upsertInvoice = useInvoicesStore((state) => state.upsertEntity);

  // Calculate total size
  const totalSize = selectedScans.reduce((sum, scan) => sum + scan.sizeInBytes, 0);

  const handleClose = useCallback((): void => {
    close();
    setStep("select");
    setCreatedCount(0);
    setErrors([]);
    setAnalysisQueueFailureCount(0);
    setMode("single");
  }, [close]);

  const handleViewInvoices = useCallback((): void => {
    router.push("/domains/invoices/view-invoices");
    handleClose();
  }, [router, handleClose]);

  const handleCreate = async (): Promise<void> => {
    if (selectedScans.length === 0) return;

    setStep("creating");
    setErrors([]);
    setAnalysisQueueFailureCount(0);

    try {
      const result = await createInvoiceFromScans({scans: selectedScans, mode});

      if (!result.success) {
        setErrors([{code: result.error.code}]);
        setCreatedCount(0);
        setStep("complete");
        toast.error(t((m) => m.dialogs.invoices.createInvoiceDialog.errors.createFailed));
        return;
      }

      const {analysis, convertedScanIds, errors: creationErrors, invoices} = result.data;
      for (const invoice of invoices) {
        upsertInvoice(invoice);
      }

      setCreatedCount(invoices.length);
      setErrors(
        creationErrors.map((error) => {
          const scan = selectedScans.find((candidate) => candidate.id === error.scanId);
          return {
            code: error.code,
            scanId: error.scanId,
            ...(scan ? {scanName: scan.name} : {}),
          };
        }),
      );
      setAnalysisQueueFailureCount(analysis.filter((outcome) => outcome.status === "not_queued").length);

      // Link scans to invoices
      if (convertedScanIds.length > 0 && invoices.length > 0) {
        if (mode === "batch") {
          markScansAsUsedByInvoice([...convertedScanIds], invoices[0]!.id);
        } else {
          invoices.forEach((invoice, index) => {
            const scanId = convertedScanIds[index];
            if (scanId) markScansAsUsedByInvoice([scanId], invoice.id);
          });
        }
        archiveScans([...convertedScanIds]);
      }

      clearSelectedScans();
      setStep("complete");

      if (creationErrors.length > 0 && invoices.length > 0) {
        toast.error(
          t((m) => m.dialogs.invoices.createInvoiceDialog.errors.partialFail, {
            count: String(creationErrors.length),
          }),
        );
      } else if (analysis.some((outcome) => outcome.status === "not_queued")) {
        toast.error(t((m) => m.dialogs.invoices.createInvoiceDialog.complete.analysisNotQueued));
      } else {
        toast.success(t((m) => m.dialogs.invoices.createInvoiceDialog.complete.analysisQueued));
      }
    } catch {
      setErrors([{code: "NETWORK_ERROR"}]);
      setCreatedCount(0);
      setStep("complete");
      toast.error(t((m) => m.dialogs.invoices.createInvoiceDialog.errors.createFailed));
    }
  };

  const handleModeChange = useCallback((value: unknown): void => {
    if (value === "single" || value === "batch") {
      setMode(value);
    }
  }, []);

  const handleRetry = useCallback((): void => {
    setStep("select");
    setCreatedCount(0);
    setErrors([]);
    setAnalysisQueueFailureCount(0);
  }, []);

  const handleOpenChange = useCallback(
    (shouldOpen: boolean): void => {
      if (shouldOpen) {
        open();
      } else if (step !== "creating") {
        // Preserve the active request and dialog focus until the API responds.
        handleClose();
      }
    },
    [open, handleClose, step],
  );

  const renderAnalysisOutcome = (): React.JSX.Element =>
    analysisQueueFailureCount > 0 ? (
      <div
        className={`${styles["completeAnalysisNotice"]} ${styles["completeAnalysisNoticeWarning"]}`}
        role='alert'>
        <p className={styles["completeAnalysisNoticeText"]}>
          {t((m) => m.dialogs.invoices.createInvoiceDialog.complete.analysisNotQueued)}
        </p>
      </div>
    ) : (
      <div className={styles["completeAnalysisNotice"]}>
        <p className={styles["completeAnalysisNoticeText"]}>{t((m) => m.dialogs.invoices.createInvoiceDialog.complete.analysisQueued)}</p>
      </div>
    );

  // Render select step content
  const renderSelectStep = (): React.JSX.Element => (
    <motion.div
      key='select'
      initial={{opacity: 0, y: 10}}
      animate={{opacity: 1, y: 0}}
      exit={{opacity: 0, y: -10}}>
      <DialogHeader>
        <DialogTitle className={styles["dialogTitle"]}>
          <TbFileInvoice className={styles["dialogTitleIcon"]} />
          {selectedScans.length > 1
            ? t((m) => m.dialogs.invoices.createInvoiceDialog.titlePlural)
            : t((m) => m.dialogs.invoices.createInvoiceDialog.title)}
        </DialogTitle>
        <DialogDescription>{t((m) => m.dialogs.invoices.createInvoiceDialog.description)}</DialogDescription>
      </DialogHeader>

      {/* Scans Preview */}
      <div className={styles["scansPreviewBox"]}>
        <div className={styles["scansPreviewHeader"]}>
          <span className={styles["scansPreviewLabel"]}>
            {t((m) => m.dialogs.invoices.createInvoiceDialog.selectedScans)} ({selectedScans.length})
          </span>
          <span className={styles["scansPreviewSize"]}>
            {formatFileSize(totalSize)} {t((m) => m.dialogs.invoices.createInvoiceDialog.totalSize)}
          </span>
        </div>
        <Carousel
          opts={{align: "start"}}
          className={styles["scansCarousel"]}>
          <CarouselContent>
            {selectedScans.map((scan) => (
              <CarouselItem key={scan.id}>
                <ScanCard
                  media={{
                    src: scan.blobUrl,
                    mediaKind: scan.mimeType === "application/pdf" ? "pdf" : "image",
                    alt: scan.name,
                  }}
                  title={scan.name}
                  metadataItems={[
                    formatFileSize(scan.sizeInBytes),
                    formatDate(scan.uploadedAt, {locale: "en-US", month: "short", day: "numeric", year: "numeric"}),
                  ]}
                />
              </CarouselItem>
            ))}
          </CarouselContent>
          {selectedScans.length > 1 ? (
            <>
              <CarouselPrevious className={styles["scansCarouselPrev"]} />
              <CarouselNext className={styles["scansCarouselNext"]} />
            </>
          ) : null}
        </Carousel>
      </div>

      {/* Mode Selection for multiple scans */}
      {selectedScans.length > 1 ? (
        <div className={styles["modeSection"]}>
          <p className={styles["modeLabel"]}>{t((m) => m.dialogs.invoices.createInvoiceDialog.chooseMode)}</p>
          <RadioGroup
            value={mode}
            onValueChange={handleModeChange}>
            {/* Single mode option */}
            <Label
              htmlFor='single'
              className={`${styles["modeOption"]} ${mode === "single" ? styles["modeOptionSelected"] : ""}`}>
              <RadioGroupItem
                value='single'
                id='single'
                className={styles["radioItem"]}
              />
              <div className={styles["modeOptionContent"]}>
                <span className={styles["modeLabelText"]}>
                  <TbPhoto className={styles["modePurpleIcon"]} />
                  {t((m) => m.dialogs.invoices.createInvoiceDialog.singleMode.title)}
                </span>
                <p className={styles["modeOptionDescription"]}>
                  {t((m) => m.dialogs.invoices.createInvoiceDialog.singleMode.description, {count: String(selectedScans.length)})}
                </p>
              </div>
            </Label>
            {/* Batch mode option */}
            <Label
              htmlFor='batch'
              className={`${styles["modeOption"]} ${styles["modeOptionBatch"]} ${mode === "batch" ? styles["modeOptionSelected"] : ""}`}>
              <RadioGroupItem
                value='batch'
                id='batch'
                className={styles["radioItem"]}
              />
              <div className={styles["modeOptionContent"]}>
                <span className={styles["modeLabelText"]}>
                  <TbStack2 className={styles["modeBlueIcon"]} />
                  {t((m) => m.dialogs.invoices.createInvoiceDialog.batchMode.title)}
                </span>
                <p className={styles["modeOptionDescription"]}>
                  {t((m) => m.dialogs.invoices.createInvoiceDialog.batchMode.description, {count: String(selectedScans.length)})}
                </p>
              </div>
            </Label>
          </RadioGroup>
        </div>
      ) : (
        /* Single scan info banner */
        <div className={styles["singleScanBanner"]}>
          <div className={styles["singleScanBannerContent"]}>
            <TbSparkles className={styles["singleScanBannerIcon"]} />
            <div>
              <p className={styles["singleScanBannerTitle"]}>{t((m) => m.dialogs.invoices.createInvoiceDialog.singleScanInfo.title)}</p>
              <p className={styles["singleScanBannerDescription"]}>
                {t((m) => m.dialogs.invoices.createInvoiceDialog.singleScanInfo.description)}
              </p>
            </div>
          </div>
        </div>
      )}

      <DialogFooter className={styles["selectFooter"]}>
        <Button
          variant='outline'
          onClick={handleClose}>
          {t((m) => m.dialogs.invoices.createInvoiceDialog.buttons.cancel)}
        </Button>
        <Button
          onClick={handleCreate}
          className={styles["createButton"]}>
          {mode === "batch" || selectedScans.length === 1
            ? t((m) => m.dialogs.invoices.createInvoiceDialog.buttons.createSingle)
            : t((m) => m.dialogs.invoices.createInvoiceDialog.buttons.createMultiple, {count: String(selectedScans.length)})}
          <TbArrowRight className={styles["arrowRightIcon"]} />
        </Button>
      </DialogFooter>
    </motion.div>
  );

  // Render creating step content
  const renderCreatingStep = (): React.JSX.Element => (
    <motion.div
      key='creating'
      initial={{opacity: 0, y: 10}}
      animate={{opacity: 1, y: 0}}
      exit={{opacity: 0, y: -10}}
      aria-busy='true'
      aria-live='polite'
      role='status'
      className={styles["creatingWrapper"]}>
      <div className={styles["creatingCenter"]}>
        <div className={styles["creatingIconCircle"]}>
          <TbLoader2 className={styles["creatingSpinIcon"]} />
        </div>
        <h3 className={styles["creatingTitle"]}>
          {mode === "single" && selectedScans.length > 1
            ? t((m) => m.dialogs.invoices.createInvoiceDialog.creating.titlePlural)
            : t((m) => m.dialogs.invoices.createInvoiceDialog.creating.title)}
        </h3>
        <p className={styles["creatingDescription"]}>{t((m) => m.dialogs.invoices.createInvoiceDialog.creating.description)}</p>
      </div>
    </motion.div>
  );

  // Render complete step content
  const renderCompleteStep = (): React.JSX.Element => {
    const isPlural = createdCount > 1;
    const hasErrors = errors.length > 0;
    const isCompleteFailure = createdCount === 0 && hasErrors;
    const isPartialFailure = createdCount > 0 && hasErrors;

    // Complete failure case
    if (isCompleteFailure) {
      return (
        <motion.div
          key='complete-failure'
          initial={{opacity: 0, scale: 0.95}}
          animate={{opacity: 1, scale: 1}}
          className={styles["completeWrapper"]}>
          <div className={`${styles["completeIconCircle"]} ${styles["completeIconCircleError"]}`}>
            <TbAlertCircle className={styles["completeErrorIcon"]} />
          </div>
          <h3 className={`${styles["completeTitle"]} ${styles["completeTitleError"]}`}>
            {t((m) => m.dialogs.invoices.createInvoiceDialog.complete.failureTitle)}
          </h3>
          <p className={styles["completeDescription"]}>{t((m) => m.dialogs.invoices.createInvoiceDialog.complete.failureDescription)}</p>

          {errors.length > 0 && (
            <div
              className={styles["completeErrorsList"]}
              role='alert'>
              {errors.map((error) => (
                <div
                  key={error.scanId ?? error.code}
                  className={styles["completeErrorItem"]}>
                  <TbX className={styles["completeErrorItemIcon"]} />
                  <div>
                    {error.scanName ? <p className={styles["completeErrorItemScanName"]}>{error.scanName}</p> : null}
                    <p className={styles["completeErrorItemText"]}>
                      {t((m) => m.dialogs.invoices.createInvoiceDialog.errors.creationFailed)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}

          <DialogFooter className={styles["completeFooter"]}>
            <Button
              variant='outline'
              onClick={handleClose}>
              {t((m) => m.dialogs.invoices.createInvoiceDialog.buttons.cancel)}
            </Button>
            <Button
              onClick={handleRetry}
              className={styles["retryButton"]}>
              {t((m) => m.dialogs.invoices.createInvoiceDialog.complete.retryButton)}
              <TbArrowRight className={styles["arrowRightIcon"]} />
            </Button>
          </DialogFooter>
        </motion.div>
      );
    }

    // Partial failure case
    if (isPartialFailure) {
      return (
        <motion.div
          key='complete-partial'
          initial={{opacity: 0, scale: 0.95}}
          animate={{opacity: 1, scale: 1}}
          className={styles["completeWrapper"]}>
          <div className={`${styles["completeIconCircle"]} ${styles["completeIconCircleWarning"]}`}>
            <TbAlertTriangle className={styles["completeWarningIcon"]} />
          </div>
          <h3 className={`${styles["completeTitle"]} ${styles["completeTitleWarning"]}`}>
            {t((m) => m.dialogs.invoices.createInvoiceDialog.complete.partialTitle, {
              created: String(createdCount),
              total: String(selectedScans.length),
            })}
          </h3>
          <p className={styles["completeDescription"]}>{t((m) => m.dialogs.invoices.createInvoiceDialog.complete.partialDescription)}</p>

          {errors.length > 0 && (
            <div className={styles["completeErrorsList"]}>
              <p className={styles["completeErrorsListTitle"]}>{t((m) => m.dialogs.invoices.createInvoiceDialog.complete.errorsLabel)}</p>
              {errors.map((error) => (
                <div
                  key={error.scanId ?? error.code}
                  className={styles["completeErrorItem"]}>
                  <TbX className={styles["completeErrorItemIcon"]} />
                  <div>
                    {error.scanName ? <p className={styles["completeErrorItemScanName"]}>{error.scanName}</p> : null}
                    <p className={styles["completeErrorItemText"]}>
                      {t((m) => m.dialogs.invoices.createInvoiceDialog.errors.creationFailed)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
          {renderAnalysisOutcome()}

          <DialogFooter className={styles["completeFooter"]}>
            <Button
              variant='outline'
              onClick={handleClose}>
              {t((m) => m.dialogs.invoices.createInvoiceDialog.buttons.close)}
            </Button>
            <Button
              onClick={handleViewInvoices}
              className={styles["completeButton"]}>
              {isPlural
                ? t((m) => m.dialogs.invoices.createInvoiceDialog.complete.viewButtonPlural)
                : t((m) => m.dialogs.invoices.createInvoiceDialog.complete.viewButton)}
              <TbArrowRight className={styles["arrowRightIcon"]} />
            </Button>
          </DialogFooter>
        </motion.div>
      );
    }

    // Success case
    return (
      <motion.div
        key='complete'
        initial={{opacity: 0, scale: 0.95}}
        animate={{opacity: 1, scale: 1}}
        className={styles["completeWrapper"]}>
        <div className={styles["completeIconCircle"]}>
          <TbCheck className={styles["completeCheckIcon"]} />
        </div>
        <h3 className={styles["completeTitle"]}>
          {isPlural
            ? t((m) => m.dialogs.invoices.createInvoiceDialog.complete.titlePlural, {count: String(createdCount)})
            : t((m) => m.dialogs.invoices.createInvoiceDialog.complete.title, {count: String(createdCount)})}
        </h3>
        <p className={styles["completeDescription"]}>
          {isPlural
            ? t((m) => m.dialogs.invoices.createInvoiceDialog.complete.descriptionPlural)
            : t((m) => m.dialogs.invoices.createInvoiceDialog.complete.description)}
        </p>

        {renderAnalysisOutcome()}

        <DialogFooter className={styles["completeFooter"]}>
          <Button
            variant='outline'
            onClick={handleClose}>
            {t((m) => m.dialogs.invoices.createInvoiceDialog.buttons.close)}
          </Button>
          <Button
            onClick={handleViewInvoices}
            className={styles["completeButton"]}>
            {isPlural
              ? t((m) => m.dialogs.invoices.createInvoiceDialog.complete.viewButtonPlural)
              : t((m) => m.dialogs.invoices.createInvoiceDialog.complete.viewButton)}
            <TbArrowRight className={styles["arrowRightIcon"]} />
          </Button>
        </DialogFooter>
      </motion.div>
    );
  };

  return (
    <Dialog
      open={isOpen}
      onOpenChange={handleOpenChange}>
      <DialogContent className={styles["dialogContent"]}>
        <AnimatePresence mode='wait'>
          {step === "select" ? renderSelectStep() : null}
          {step === "creating" ? renderCreatingStep() : null}
          {step === "complete" ? renderCompleteStep() : null}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}
