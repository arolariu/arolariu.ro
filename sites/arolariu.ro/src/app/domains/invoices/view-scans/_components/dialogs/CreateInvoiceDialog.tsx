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
import {useState} from "react";
import {TbArrowRight, TbCheck, TbFileInvoice, TbFileTypePdf, TbLoader2, TbPhoto, TbSparkles, TbStack2} from "react-icons/tb";
import {useDialog} from "../../../_contexts/DialogContext";
import {createInvoiceFromScans} from "../../_actions/createInvoiceFromScans";

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
    <div className='relative h-12 w-12 shrink-0 overflow-hidden rounded-lg border border-gray-200 bg-gray-100 dark:border-gray-700 dark:bg-gray-800'>
      {scan.mimeType === "application/pdf" ? (
        <div className='flex h-full items-center justify-center'>
          <TbFileTypePdf className='h-6 w-6 text-red-500' />
        </div>
      ) : (
        <Image
          src={scan.blobUrl}
          alt={scan.name}
          fill
          className='object-cover'
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
  const getClasses = (): string => {
    if (isComplete) return "bg-green-500 text-white";
    if (isActive) return "bg-purple-500 text-white";
    return "bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-400";
  };

  return (
    <div className={`flex items-start gap-3 ${isActive ? "opacity-100" : "opacity-50"}`}>
      <div
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-medium transition-colors ${getClasses()}`}>
        {isComplete ? <TbCheck className='h-4 w-4' /> : step}
      </div>
      <div className='flex-1'>
        <p className='text-sm font-medium text-gray-900 dark:text-white'>{title}</p>
        <p className='text-xs text-gray-500 dark:text-gray-400'>{description}</p>
      </div>
    </div>
  );
}

/**
 * Dialog for choosing between single and batch invoice creation modes.
 * Uses the DialogContext for state management.
 */
export default function CreateInvoiceDialog(): React.JSX.Element {
  const t = useTranslations("Domains.services.invoices.service.createInvoiceDialog");
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

  // Store actions
  const archiveScans = useScansStore((state) => state.archiveScans);
  const clearSelectedScans = useScansStore((state) => state.clearSelectedScans);
  const markScansAsUsedByInvoice = useScansStore((state) => state.markScansAsUsedByInvoice);
  const upsertInvoice = useInvoicesStore((state) => state.upsertInvoice);

  // Calculate total size
  const totalSize = selectedScans.reduce((sum, scan) => sum + scan.sizeInBytes, 0);

  const handleClose = (): void => {
    if (step === "complete") {
      router.push("/domains/invoices/view-invoices");
    }
    close();
    // Reset state after dialog closes
    setTimeout(() => {
      setStep("select");
      setProgress(0);
      setCreatedCount(0);
      setMode("single");
    }, 300);
  };

  const handleCreate = async (): Promise<void> => {
    if (selectedScans.length === 0) return;

    setStep("creating");
    setProgress(10);

    try {
      setProgress(30);
      const result = await createInvoiceFromScans({scans: selectedScans, mode});

      setProgress(70);
      for (const invoice of result.invoices) {
        upsertInvoice(invoice);
      }

      setCreatedCount(result.invoices.length);
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

      if (result.errors.length > 0) {
        toast.error(t("errors.partialFail", {count: String(result.errors.length)}));
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : t("errors.unknown");
      toast.error(t("errors.createFailed", {message: String(errorMessage)}));
      setStep("select");
      setProgress(0);
    }
  };

  // Render select step content
  const renderSelectStep = (): React.JSX.Element => (
    <motion.div
      key='select'
      initial={{opacity: 0, y: 10}}
      animate={{opacity: 1, y: 0}}
      exit={{opacity: 0, y: -10}}>
      <DialogHeader>
        <DialogTitle className='flex items-center gap-2'>
          <TbFileInvoice className='h-5 w-5 text-purple-500' />
          {selectedScans.length > 1 ? t("titlePlural") : t("title")}
        </DialogTitle>
        <DialogDescription>{t("description")}</DialogDescription>
      </DialogHeader>

      {/* Scans Preview */}
      <div className='mt-4 rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800/50'>
        <div className='mb-3 flex items-center justify-between'>
          <span className='text-sm font-medium text-gray-700 dark:text-gray-300'>
            {t("selectedScans")} ({selectedScans.length})
          </span>
          <span className='text-xs text-gray-500 dark:text-gray-400'>
            {formatFileSize(totalSize)} {t("totalSize")}
          </span>
        </div>
        <div className='flex flex-wrap gap-2'>
          {selectedScans.slice(0, 6).map((scan) => (
            <ScanThumbnail
              key={scan.id}
              scan={scan}
            />
          ))}
          {selectedScans.length > 6 ? (
            <div className='flex h-12 w-12 items-center justify-center rounded-lg border border-dashed border-gray-300 bg-gray-100 text-xs font-medium text-gray-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-400'>
              +{selectedScans.length - 6}
            </div>
          ) : null}
        </div>
      </div>

      {/* Mode Selection for multiple scans */}
      {selectedScans.length > 1 ? (
        <div className='mt-4'>
          <p className='mb-3 text-sm font-medium text-gray-700 dark:text-gray-300'>{t("chooseMode")}</p>
          <RadioGroup
            value={mode}
            onValueChange={(v) => setMode(v as CreationMode)}>
            {/* Single mode option */}
            <div
              role='button'
              tabIndex={0}
              className={`flex cursor-pointer items-start gap-3 rounded-lg border p-4 transition-all ${
                mode === "single"
                  ? "border-purple-300 bg-purple-50 dark:border-purple-700 dark:bg-purple-900/20"
                  : "border-gray-200 hover:border-gray-300 dark:border-gray-700 dark:hover:border-gray-600"
              }`}
              onClick={() => setMode("single")}
              onKeyDown={(e) => e.key === "Enter" && setMode("single")}>
              <RadioGroupItem
                value='single'
                id='single'
                className='mt-0.5'
              />
              <div className='flex-1'>
                <Label
                  htmlFor='single'
                  className='flex cursor-pointer items-center gap-2 font-medium'>
                  <TbPhoto className='h-4 w-4 text-purple-500' />
                  {t("singleMode.title")}
                </Label>
                <p className='mt-1 text-sm text-gray-500 dark:text-gray-400'>
                  {t("singleMode.description", {count: String(selectedScans.length)})}
                </p>
              </div>
            </div>
            {/* Batch mode option */}
            <div
              role='button'
              tabIndex={0}
              className={`mt-2 flex cursor-pointer items-start gap-3 rounded-lg border p-4 transition-all ${
                mode === "batch"
                  ? "border-purple-300 bg-purple-50 dark:border-purple-700 dark:bg-purple-900/20"
                  : "border-gray-200 hover:border-gray-300 dark:border-gray-700 dark:hover:border-gray-600"
              }`}
              onClick={() => setMode("batch")}
              onKeyDown={(e) => e.key === "Enter" && setMode("batch")}>
              <RadioGroupItem
                value='batch'
                id='batch'
                className='mt-0.5'
              />
              <div className='flex-1'>
                <Label
                  htmlFor='batch'
                  className='flex cursor-pointer items-center gap-2 font-medium'>
                  <TbStack2 className='h-4 w-4 text-blue-500' />
                  {t("batchMode.title")}
                </Label>
                <p className='mt-1 text-sm text-gray-500 dark:text-gray-400'>
                  {t("batchMode.description", {count: String(selectedScans.length)})}
                </p>
              </div>
            </div>
          </RadioGroup>
        </div>
      ) : (
        /* Single scan info banner */
        <div className='mt-4 rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-900/20'>
          <div className='flex items-start gap-3'>
            <TbSparkles className='mt-0.5 h-5 w-5 shrink-0 text-blue-500' />
            <div>
              <p className='font-medium text-blue-900 dark:text-blue-100'>{t("singleScanInfo.title")}</p>
              <p className='mt-1 text-sm text-blue-700 dark:text-blue-300'>{t("singleScanInfo.description")}</p>
            </div>
          </div>
        </div>
      )}

      <DialogFooter className='mt-6'>
        <Button
          variant='outline'
          onClick={handleClose}>
          {t("buttons.cancel")}
        </Button>
        <Button
          onClick={handleCreate}
          className='bg-linear-to-r from-purple-600 to-pink-600 text-white hover:from-purple-700 hover:to-pink-700'>
          {mode === "batch" || selectedScans.length === 1
            ? t("buttons.createSingle")
            : t("buttons.createMultiple", {count: String(selectedScans.length)})}
          <TbArrowRight className='ml-2 h-4 w-4' />
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
      className='py-6'>
      <div className='text-center'>
        <div className='mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-purple-100 dark:bg-purple-900/50'>
          <TbLoader2 className='h-8 w-8 animate-spin text-purple-500' />
        </div>
        <h3 className='text-lg font-semibold text-gray-900 dark:text-white'>
          {mode === "single" && selectedScans.length > 1 ? t("creating.titlePlural") : t("creating.title")}
        </h3>
        <p className='mt-1 text-sm text-gray-500 dark:text-gray-400'>
          {selectedScans.length > 1
            ? t("creating.processingPlural", {count: String(selectedScans.length)})
            : t("creating.processing", {count: String(selectedScans.length)})}
        </p>
      </div>

      <div className='mt-6'>
        <Progress
          value={progress}
          className='h-2'
        />
        <p className='mt-2 text-center text-xs text-gray-500 dark:text-gray-400'>{progress}%</p>
      </div>

      <div className='mt-6 space-y-3'>
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
    return (
      <motion.div
        key='complete'
        initial={{opacity: 0, scale: 0.95}}
        animate={{opacity: 1, scale: 1}}
        className='py-6 text-center'>
        <div className='mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/50'>
          <TbCheck className='h-8 w-8 text-green-500' />
        </div>
        <h3 className='text-lg font-semibold text-gray-900 dark:text-white'>
          {isPlural ? t("complete.titlePlural", {count: String(createdCount)}) : t("complete.title", {count: String(createdCount)})}
        </h3>
        <p className='mt-1 text-sm text-gray-500 dark:text-gray-400'>
          {isPlural ? t("complete.descriptionPlural") : t("complete.description")}
        </p>

        <div className='mt-6 rounded-lg border border-green-200 bg-green-50 p-4 dark:border-green-800 dark:bg-green-900/20'>
          <p className='text-sm text-green-700 dark:text-green-300'>
            <strong>{t("complete.nextSteps")}</strong>{" "}
            {isPlural ? t("complete.nextStepsDescriptionPlural") : t("complete.nextStepsDescription")}
          </p>
        </div>

        <DialogFooter className='mt-6 justify-center'>
          <Button
            onClick={handleClose}
            className='bg-linear-to-r from-green-600 to-emerald-600 text-white hover:from-green-700 hover:to-emerald-700'>
            {isPlural ? t("complete.viewButtonPlural") : t("complete.viewButton")}
            <TbArrowRight className='ml-2 h-4 w-4' />
          </Button>
        </DialogFooter>
      </motion.div>
    );
  };

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(shouldOpen) => (shouldOpen ? open() : handleClose())}>
      <DialogContent className='sm:max-w-lg'>
        <AnimatePresence mode='wait'>
          {step === "select" ? renderSelectStep() : null}
          {step === "creating" ? renderCreatingStep() : null}
          {step === "complete" ? renderCompleteStep() : null}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}
