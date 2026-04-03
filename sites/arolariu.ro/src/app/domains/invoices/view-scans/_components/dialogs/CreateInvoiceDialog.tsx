"use client";

/**
 * @fileoverview Dialog for choosing invoice creation mode.
 * @module app/domains/invoices/view-scans/_components/dialogs/CreateInvoiceDialog
 */

import {useInvoicesStore, useScansStore} from "@/stores";
import type {CachedScan} from "@/types/scans";
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Label,
  Progress,
  RadioGroup,
  RadioGroupItem,
  toast,
} from "@arolariu/components";
import {AnimatePresence, motion} from "motion/react";
import {useTranslations} from "next-intl";
import Image from "next/image";
import {useRouter} from "next/navigation";
import {useCallback, useState} from "react";
import {
  TbAlertCircle,
  TbAlertTriangle,
  TbArrowRight,
  TbCheck,
  TbFileInvoice,
  TbFileTypePdf,
  TbLoader2,
  TbPhoto,
  TbSparkles,
  TbStack2,
  TbX,
} from "react-icons/tb";
import {useDialog} from "../../../_contexts/DialogContext";
import {createInvoiceFromScans} from "../../_actions/createInvoiceFromScans";
import styles from "./CreateInvoiceDialog.module.scss";

type CreationMode = "single" | "batch";
type CreationStep = "select" | "creating" | "complete";

/** Payload type for the dialog */
interface CreateInvoicePayload {
  selectedScans: CachedScan[];
}

/** Formats file size in human-readable format */
function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Mini scan preview thumbnail */
function ScanThumbnail({scan}: Readonly<{scan: CachedScan}>): React.JSX.Element {
  return (
    <div className={styles["thumbnail"]}>
      {scan.mimeType === "application/pdf" ? (
        <div className={styles["thumbnailPdfPlaceholder"]}>
          <TbFileTypePdf className={styles["thumbnailPdfIcon"]} />
        </div>
      ) : (
        <Image
          src={scan.blobUrl}
          alt={scan.name}
          fill
          className={styles["thumbnailImage"]}
          unoptimized
        />
      )}
    </div>
  );
}

/** Process step indicator */
function ProcessStep({
  step,
  title,
  description,
  isActive,
  isComplete,
}: Readonly<{
  step: number;
  title: string;
  description: string;
  isActive: boolean;
  isComplete: boolean;
}>): React.JSX.Element {
  const getCircleClass = (): string => {
    if (isComplete) return styles["stepCircleComplete"]!;
    if (isActive) return styles["stepCircleActive"]!;
    return styles["stepCircleDefault"]!;
  };

  return (
    <div className={`${styles["processStep"]} ${isActive ? styles["processStepActive"] : ""}`}>
      <div className={`${styles["stepCircle"]} ${getCircleClass()}`}>
        {isComplete ? <TbCheck className={styles["stepCheckIcon"]} /> : step}
      </div>
      <div className={styles["stepContent"]}>
        <p className={styles["stepTitle"]}>{title}</p>
        <p className={styles["stepDescription"]}>{description}</p>
      </div>
    </div>
  );
}

/**
 * Dialog for choosing between single and batch invoice creation modes.
 * Uses the DialogContext for state management.
 */
export default function CreateInvoiceDialog(): React.JSX.Element {
  const t = useTranslations("IMS--Dialogs.createInvoiceDialog");
  const router = useRouter();

  // Dialog state from context
  const {
    isOpen,
    open,
    close,
    currentDialog: {payload},
  } = useDialog("VIEW_SCANS__CREATE_INVOICE", "add");

  // Get selectedScans from payload
  const {selectedScans = []} = (payload as CreateInvoicePayload) ?? {};

  // Local state for wizard steps
  const [mode, setMode] = useState<CreationMode>("single");
  const [step, setStep] = useState<CreationStep>("select");
  const [progress, setProgress] = useState(0);
  const [createdCount, setCreatedCount] = useState(0);
  const [errors, setErrors] = useState<Array<{message: string; scanId?: string; scanName?: string}>>([]);

  // Store actions
  const archiveScans = useScansStore((state) => state.archiveScans);
  const clearSelectedScans = useScansStore((state) => state.clearSelectedScans);
  const markScansAsUsedByInvoice = useScansStore((state) => state.markScansAsUsedByInvoice);
  const upsertInvoice = useInvoicesStore((state) => state.upsertInvoice);

  // Calculate total size
  const totalSize = selectedScans.reduce((sum, scan) => sum + scan.sizeInBytes, 0);

  const handleClose = useCallback((): void => {
    close();
    // Reset state after dialog closes
    setTimeout(() => {
      setStep("select");
      setProgress(0);
      setCreatedCount(0);
      setErrors([]);
      setMode("single");
    }, 300);
  }, [close]);

  const handleViewInvoices = useCallback((): void => {
    router.push("/domains/invoices/view-invoices");
    handleClose();
  }, [router, handleClose]);

  const handleCreate = async (): Promise<void> => {
    if (selectedScans.length === 0) return;

    setStep("creating");
    setProgress(10);
    setErrors([]);

    try {
      setProgress(30);
      const result = await createInvoiceFromScans({scans: selectedScans, mode});

      setProgress(70);
      for (const invoice of result.invoices) {
        upsertInvoice(invoice);
      }

      setCreatedCount(result.invoices.length);
      // Map errors with scan details
      setErrors(
        result.errors.map((err) => {
          const scan = selectedScans.find((s) => s.id === err.scanId);
          return {
            message: err.error,
            scanId: err.scanId,
            scanName: scan?.name ?? "Unknown scan",
          };
        }),
      );
      setProgress(90);

      // Link scans to invoices
      if (result.convertedScanIds.length > 0 && result.invoices.length > 0) {
        if (mode === "batch") {
          markScansAsUsedByInvoice(result.convertedScanIds, result.invoices[0]!.id);
        } else {
          result.invoices.forEach((invoice, index) => {
            const scanId = result.convertedScanIds[index];
            if (scanId) markScansAsUsedByInvoice([scanId], invoice.id);
          });
        }
        archiveScans(result.convertedScanIds);
      }

      clearSelectedScans();
      setProgress(100);
      setStep("complete");

      if (result.errors.length > 0 && result.invoices.length > 0) {
        // Show partial failure toast with first error details
        const firstError = result.errors[0];
        const errorMessage = firstError ? `${firstError.scanId}: ${firstError.error}` : "";
        const partialFailMessage = t("errors.partialFail", {count: String(result.errors.length)});
        toast.error(errorMessage ? `${partialFailMessage} ${errorMessage}` : partialFailMessage);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : t("errors.unknown");
      setErrors([{message: String(errorMessage), scanId: undefined, scanName: undefined}]);
      setCreatedCount(0);
      setProgress(100);
      setStep("complete");
      // Show error toast with backend details
      toast.error(t("errors.createFailed", {message: errorMessage}));
    }
  };

  const handleModeChange = useCallback((v: unknown) => {
    setMode(v as CreationMode);
  }, []);

  const handleRetry = useCallback(() => {
    setStep("select");
    setProgress(0);
    setCreatedCount(0);
    setErrors([]);
  }, []);

  const handleOpenChange = useCallback(
    (shouldOpen: boolean) => {
      if (shouldOpen) open();
      else {
        // Prevent closing during creation to avoid interrupting API call
        if (step !== "creating") {
          handleClose();
        }
      }
    },
    [open, handleClose, step],
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
          {selectedScans.length > 1 ? t("titlePlural") : t("title")}
        </DialogTitle>
        <DialogDescription>{t("description")}</DialogDescription>
      </DialogHeader>

      {/* Scans Preview */}
      <div className={styles["scansPreviewBox"]}>
        <div className={styles["scansPreviewHeader"]}>
          <span className={styles["scansPreviewLabel"]}>
            {t("selectedScans")} ({selectedScans.length})
          </span>
          <span className={styles["scansPreviewSize"]}>
            {formatFileSize(totalSize)} {t("totalSize")}
          </span>
        </div>
        <div className={styles["scansPreviewGrid"]}>
          {selectedScans.slice(0, 6).map((scan) => (
            <ScanThumbnail
              key={scan.id}
              scan={scan}
            />
          ))}
          {selectedScans.length > 6 ? <div className={styles["scansPreviewOverflow"]}>+{selectedScans.length - 6}</div> : null}
        </div>
      </div>

      {/* Mode Selection for multiple scans */}
      {selectedScans.length > 1 ? (
        <div className={styles["modeSection"]}>
          <p className={styles["modeLabel"]}>{t("chooseMode")}</p>
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
                  {t("singleMode.title")}
                </span>
                <p className={styles["modeOptionDescription"]}>{t("singleMode.description", {count: String(selectedScans.length)})}</p>
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
                  {t("batchMode.title")}
                </span>
                <p className={styles["modeOptionDescription"]}>{t("batchMode.description", {count: String(selectedScans.length)})}</p>
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
              <p className={styles["singleScanBannerTitle"]}>{t("singleScanInfo.title")}</p>
              <p className={styles["singleScanBannerDescription"]}>{t("singleScanInfo.description")}</p>
            </div>
          </div>
        </div>
      )}

      <DialogFooter className={styles["selectFooter"]}>
        <Button
          variant='outline'
          onClick={handleClose}>
          {t("buttons.cancel")}
        </Button>
        <Button
          onClick={handleCreate}
          className={styles["createButton"]}>
          {mode === "batch" || selectedScans.length === 1
            ? t("buttons.createSingle")
            : t("buttons.createMultiple", {count: String(selectedScans.length)})}
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
      className={styles["creatingWrapper"]}>
      <div className={styles["creatingCenter"]}>
        <div className={styles["creatingIconCircle"]}>
          <TbLoader2 className={styles["creatingSpinIcon"]} />
        </div>
        <h3 className={styles["creatingTitle"]}>
          {mode === "single" && selectedScans.length > 1 ? t("creating.titlePlural") : t("creating.title")}
        </h3>
        <p className={styles["creatingDescription"]}>
          {selectedScans.length > 1
            ? t("creating.processingPlural", {count: String(selectedScans.length)})
            : t("creating.processing", {count: String(selectedScans.length)})}
        </p>
      </div>

      <div className={styles["progressSection"]}>
        <Progress
          value={progress}
          className={styles["progressBar"]}
        />
        <p className={styles["progressLabel"]}>{progress}%</p>
      </div>

      <div className={styles["stepsSection"]}>
        <ProcessStep
          step={1}
          title={t("creating.step1Title")}
          description={t("creating.step1Description")}
          isActive={progress < 30}
          isComplete={progress >= 30}
        />
        <ProcessStep
          step={2}
          title={t("creating.step2Title")}
          description={t("creating.step2Description")}
          isActive={progress >= 30 && progress < 70}
          isComplete={progress >= 70}
        />
        <ProcessStep
          step={3}
          title={t("creating.step3Title")}
          description={t("creating.step3Description")}
          isActive={progress >= 70}
          isComplete={progress >= 100}
        />
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
          <h3 className={`${styles["completeTitle"]} ${styles["completeTitleError"]}`}>{t("complete.failureTitle")}</h3>
          <p className={styles["completeDescription"]}>{t("complete.failureDescription")}</p>

          {errors.length > 0 && (
            <div className={styles["completeErrorsList"]}>
              {errors.map((error, index) => (
                <div
                  key={error.scanId ?? error.message}
                  className={styles["completeErrorItem"]}>
                  <TbX className={styles["completeErrorItemIcon"]} />
                  <div>
                    {error.scanName && <p className={styles["completeErrorItemScanName"]}>{error.scanName}</p>}
                    <p className={styles["completeErrorItemText"]}>{error.message}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          <DialogFooter className={styles["completeFooter"]}>
            <Button
              variant='outline'
              onClick={handleClose}>
              {t("buttons.cancel")}
            </Button>
            <Button
              onClick={handleRetry}
              className={styles["retryButton"]}>
              {t("complete.retryButton")}
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
            {t("complete.partialTitle", {
              created: String(createdCount),
              total: String(selectedScans.length),
            })}
          </h3>
          <p className={styles["completeDescription"]}>{t("complete.partialDescription")}</p>

          {errors.length > 0 && (
            <div className={styles["completeErrorsList"]}>
              <p className={styles["completeErrorsListTitle"]}>{t("complete.errorsLabel")}</p>
              {errors.map((error, index) => (
                <div
                  key={`error-${index}-${error.message?.slice(0, 30)}`}
                  className={styles["completeErrorItem"]}>
                  <TbX className={styles["completeErrorItemIcon"]} />
                  <p className={styles["completeErrorItemText"]}>{error.message}</p>
                </div>
              ))}
            </div>
          )}

          <DialogFooter className={styles["completeFooter"]}>
            <Button
              variant='outline'
              onClick={handleClose}>
              {t("buttons.close")}
            </Button>
            <Button
              onClick={handleViewInvoices}
              className={styles["completeButton"]}>
              {isPlural ? t("complete.viewButtonPlural") : t("complete.viewButton")}
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
          {isPlural ? t("complete.titlePlural", {count: String(createdCount)}) : t("complete.title", {count: String(createdCount)})}
        </h3>
        <p className={styles["completeDescription"]}>{isPlural ? t("complete.descriptionPlural") : t("complete.description")}</p>

        <div className={styles["completeNextSteps"]}>
          <p className={styles["completeNextStepsText"]}>
            <strong>{t("complete.nextSteps")}</strong>{" "}
            {isPlural ? t("complete.nextStepsDescriptionPlural") : t("complete.nextStepsDescription")}
          </p>
        </div>

        <DialogFooter className={styles["completeFooter"]}>
          <Button
            variant='outline'
            onClick={handleClose}>
            {t("buttons.close")}
          </Button>
          <Button
            onClick={handleViewInvoices}
            className={styles["completeButton"]}>
            {isPlural ? t("complete.viewButtonPlural") : t("complete.viewButton")}
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
