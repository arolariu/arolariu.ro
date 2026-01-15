"use client";

/**
 * @fileoverview Dialog for choosing invoice creation mode.
 * @module app/domains/invoices/view-scans/_components/CreateInvoiceDialog
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
import {useCallback, useMemo, useState} from "react";
import {TbArrowRight, TbCheck, TbFileInvoice, TbFileTypePdf, TbLoader2, TbPhoto, TbSparkles, TbStack2} from "react-icons/tb";
import {createInvoiceFromScans} from "../_actions/createInvoiceFromScans";

type CreateInvoiceDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedScans: CachedScan[];
};

type CreationMode = "single" | "batch";
type CreationStep = "select" | "creating" | "complete";

/**
 * Formats file size in human-readable format.
 */
function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Mini scan preview thumbnail.
 */
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

/**
 * Get the CSS classes for the step indicator circle based on state.
 */
function getStepIndicatorClasses(isComplete: boolean, isActive: boolean): string {
  if (isComplete) return "bg-green-500 text-white";
  if (isActive) return "bg-purple-500 text-white";
  return "bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-400";
}

/**
 * Process step indicator.
 */
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
  const stepIndicatorClasses = getStepIndicatorClasses(isComplete, isActive);

  return (
    <div className={`flex items-start gap-3 ${isActive ? "opacity-100" : "opacity-50"}`}>
      <div
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-medium transition-colors ${stepIndicatorClasses}`}>
        {isComplete ? <TbCheck className='h-4 w-4' /> : step}
      </div>
      <div className='flex-1'>
        <p className='text-sm font-medium text-gray-900 dark:text-white'>{title}</p>
        <p className='text-xs text-gray-500 dark:text-gray-400'>{description}</p>
      </div>
    </div>
  );
}

/** Props for the select step content component */
/** Props for mode selection option component */
type ModeOptionProps = {
  readonly mode: CreationMode;
  readonly currentMode: CreationMode;
  readonly id: string;
  readonly onSelect: () => void;
  readonly onKeyDown: (e: React.KeyboardEvent) => void;
  readonly icon: React.ReactNode;
  readonly title: string;
  readonly description: string;
  readonly additionalClasses: string;
};

/** Renders a single mode selection option */
function ModeOption({
  mode,
  currentMode,
  id,
  onSelect,
  onKeyDown,
  icon,
  title,
  description,
  additionalClasses,
}: ModeOptionProps): React.JSX.Element {
  const isSelected = currentMode === mode;
  const baseClasses = "flex cursor-pointer items-start gap-3 rounded-lg border p-4 transition-all";
  const selectedClasses = "border-purple-300 bg-purple-50 dark:border-purple-700 dark:bg-purple-900/20";
  const unselectedClasses = "border-gray-200 hover:border-gray-300 dark:border-gray-700 dark:hover:border-gray-600";

  return (
    <div
      role='button'
      tabIndex={0}
      className={`${baseClasses} ${isSelected ? selectedClasses : unselectedClasses} ${additionalClasses}`}
      onClick={onSelect}
      onKeyDown={onKeyDown}>
      <RadioGroupItem
        value={mode}
        id={id}
        className='mt-0.5'
      />
      <div className='flex-1'>
        <Label
          htmlFor={id}
          className='flex cursor-pointer items-center gap-2 font-medium'>
          {icon}
          {title}
        </Label>
        <p className='mt-1 text-sm text-gray-500 dark:text-gray-400'>{description}</p>
      </div>
    </div>
  );
}

/** Scans preview section showing thumbnails */
function ScansPreviewSection({
  selectedScans,
  totalSize,
  t,
}: Readonly<{
  selectedScans: CachedScan[];
  totalSize: number;
  t: ReturnType<typeof useTranslations>;
}>): React.JSX.Element {
  const hasOverflow = selectedScans.length > 6;
  return (
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
        {hasOverflow ? (
          <div className='flex h-12 w-12 items-center justify-center rounded-lg border border-dashed border-gray-300 bg-gray-100 text-xs font-medium text-gray-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-400'>
            +{selectedScans.length - 6}
          </div>
        ) : null}
      </div>
    </div>
  );
}

/** Single scan info banner component */
function SingleScanInfoBanner({t}: Readonly<{t: ReturnType<typeof useTranslations>}>): React.JSX.Element {
  return (
    <div className='mt-4 rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-900/20'>
      <div className='flex items-start gap-3'>
        <TbSparkles className='mt-0.5 h-5 w-5 shrink-0 text-blue-500' />
        <div>
          <p className='font-medium text-blue-900 dark:text-blue-100'>{t("singleScanInfo.title")}</p>
          <p className='mt-1 text-sm text-blue-700 dark:text-blue-300'>{t("singleScanInfo.description")}</p>
        </div>
      </div>
    </div>
  );
}

type SelectStepContentProps = {
  readonly selectedScans: CachedScan[];
  readonly totalSize: number;
  readonly mode: CreationMode;
  readonly handleModeChange: (value: string) => void;
  readonly handleSelectSingleMode: () => void;
  readonly handleSelectBatchMode: () => void;
  readonly handleSingleModeKeyDown: (e: React.KeyboardEvent) => void;
  readonly handleBatchModeKeyDown: (e: React.KeyboardEvent) => void;
  readonly handleCreate: () => Promise<void>;
  readonly handleClose: () => void;
  readonly t: ReturnType<typeof useTranslations>;
};

/** Renders the mode selection step content */
function SelectStepContent({
  selectedScans,
  totalSize,
  mode,
  handleModeChange,
  handleSelectSingleMode,
  handleSelectBatchMode,
  handleSingleModeKeyDown,
  handleBatchModeKeyDown,
  handleCreate,
  handleClose,
  t,
}: SelectStepContentProps): React.JSX.Element {
  return (
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

      {/* Selected Scans Preview */}
      <ScansPreviewSection
        selectedScans={selectedScans}
        totalSize={totalSize}
        t={t}
      />

      {/* Mode Selection */}
      {selectedScans.length > 1 ? (
        <div className='mt-4'>
          <p className='mb-3 text-sm font-medium text-gray-700 dark:text-gray-300'>{t("chooseMode")}</p>
          <RadioGroup
            value={mode}
            onValueChange={handleModeChange}>
            <ModeOption
              mode='single'
              currentMode={mode}
              id='single'
              onSelect={handleSelectSingleMode}
              onKeyDown={handleSingleModeKeyDown}
              icon={<TbPhoto className='h-4 w-4 text-purple-500' />}
              title={t("singleMode.title")}
              description={t("singleMode.description", {count: String(selectedScans.length)})}
              additionalClasses=''
            />
            <ModeOption
              mode='batch'
              currentMode={mode}
              id='batch'
              onSelect={handleSelectBatchMode}
              onKeyDown={handleBatchModeKeyDown}
              icon={<TbStack2 className='h-4 w-4 text-blue-500' />}
              title={t("batchMode.title")}
              description={t("batchMode.description", {count: String(selectedScans.length)})}
              additionalClasses='mt-2'
            />
          </RadioGroup>
        </div>
      ) : null}

      {/* Single scan explanation */}
      {selectedScans.length === 1 ? <SingleScanInfoBanner t={t} /> : null}

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
}

/** Props for CreatingStepContent component */
type CreatingStepContentProps = {
  readonly mode: CreationMode;
  readonly selectedScans: CachedScan[];
  readonly progress: number;
  readonly t: ReturnType<typeof useTranslations>;
};

/** Renders the creating step content */
function CreatingStepContent({mode, selectedScans, progress, t}: CreatingStepContentProps): React.JSX.Element {
  const showPluralTitle = mode === "single" && selectedScans.length > 1;
  const showPluralProcessing = selectedScans.length > 1;

  return (
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
          {showPluralTitle ? t("creating.titlePlural") : t("creating.title")}
        </h3>
        <p className='mt-1 text-sm text-gray-500 dark:text-gray-400'>
          {showPluralProcessing
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
}

/** Props for CompleteStepContent component */
type CompleteStepContentProps = {
  readonly createdCount: number;
  readonly handleClose: () => void;
  readonly t: ReturnType<typeof useTranslations>;
};

/** Renders the complete step content */
function CompleteStepContent({createdCount, handleClose, t}: CompleteStepContentProps): React.JSX.Element {
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
}

/**
 * Dialog for choosing between single and batch invoice creation modes.
 */
export default function CreateInvoiceDialog({open, onOpenChange, selectedScans}: Readonly<CreateInvoiceDialogProps>): React.JSX.Element {
  const t = useTranslations("Domains.services.invoices.service.createInvoiceDialog");
  const [mode, setMode] = useState<CreationMode>("single");
  const [step, setStep] = useState<CreationStep>("select");
  const [progress, setProgress] = useState(0);
  const [createdCount, setCreatedCount] = useState(0);
  const router = useRouter();

  const archiveScans = useScansStore((state) => state.archiveScans);
  const clearSelectedScans = useScansStore((state) => state.clearSelectedScans);
  const markScansAsUsedByInvoice = useScansStore((state) => state.markScansAsUsedByInvoice);
  const upsertInvoice = useInvoicesStore((state) => state.upsertInvoice);

  let totalSize = 0;
  for (const scan of selectedScans) {
    totalSize += scan.sizeInBytes;
  }

  const handleModeChange = useCallback((value: string) => {
    setMode(value as CreationMode);
  }, []);

  /** Creates a keyboard handler for mode selection */
  const createModeKeyHandler = useCallback(
    (targetMode: CreationMode) => (e: React.KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        setMode(targetMode);
      }
    },
    [],
  );

  const handleSelectSingleMode = useCallback(() => setMode("single"), []);
  const handleSelectBatchMode = useCallback(() => setMode("batch"), []);
  const handleSingleModeKeyDown = useMemo(() => createModeKeyHandler("single"), [createModeKeyHandler]);
  const handleBatchModeKeyDown = useMemo(() => createModeKeyHandler("batch"), [createModeKeyHandler]);

  /** Links scans to invoices based on creation mode */
  const linkScansToInvoices = useCallback(
    (convertedScanIds: string[], invoices: ReturnType<typeof createInvoiceFromScans> extends Promise<infer R> ? R["invoices"] : never) => {
      if (convertedScanIds.length === 0 || invoices.length === 0) return;

      if (mode === "batch") {
        // All scans belong to the single batch invoice
        markScansAsUsedByInvoice(convertedScanIds, invoices[0]!.id);
      } else {
        // In single mode, match each scan to its corresponding invoice
        invoices.forEach((invoice, index) => {
          const scanId = convertedScanIds[index];
          if (scanId) {
            markScansAsUsedByInvoice([scanId], invoice.id);
          }
        });
      }
      archiveScans(convertedScanIds);
    },
    [mode, markScansAsUsedByInvoice, archiveScans],
  );

  const handleCreate = useCallback(async (): Promise<void> => {
    if (selectedScans.length === 0) return;

    setStep("creating");
    setProgress(10);
    setCreatedCount(0);

    try {
      setProgress(30);
      const result = await createInvoiceFromScans({scans: selectedScans, mode});

      setProgress(70);
      for (const invoice of result.invoices) {
        upsertInvoice(invoice);
      }

      setCreatedCount(result.invoices.length);
      setProgress(90);

      linkScansToInvoices(result.convertedScanIds, result.invoices);
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
  }, [selectedScans, mode, upsertInvoice, linkScansToInvoices, clearSelectedScans, t]);

  const handleClose = useCallback((): void => {
    if (step === "complete") {
      router.push("/domains/invoices/view-invoices");
    }
    onOpenChange(false);
    // Reset state after dialog closes
    setTimeout(() => {
      setStep("select");
      setProgress(0);
      setCreatedCount(0);
    }, 300);
  }, [step, router, onOpenChange]);

  return (
    <Dialog
      open={open}
      onOpenChange={handleClose}>
      <DialogContent className='sm:max-w-lg'>
        <AnimatePresence mode='wait'>
          {step === "select" ? (
            <SelectStepContent
              selectedScans={selectedScans}
              totalSize={totalSize}
              mode={mode}
              handleModeChange={handleModeChange}
              handleSelectSingleMode={handleSelectSingleMode}
              handleSelectBatchMode={handleSelectBatchMode}
              handleSingleModeKeyDown={handleSingleModeKeyDown}
              handleBatchModeKeyDown={handleBatchModeKeyDown}
              handleCreate={handleCreate}
              handleClose={handleClose}
              t={t}
            />
          ) : null}

          {step === "creating" ? (
            <CreatingStepContent
              mode={mode}
              selectedScans={selectedScans}
              progress={progress}
              t={t}
            />
          ) : null}

          {step === "complete" ? (
            <CompleteStepContent
              createdCount={createdCount}
              handleClose={handleClose}
              t={t}
            />
          ) : null}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}
