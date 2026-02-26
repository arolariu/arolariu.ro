"use client";

import {useDialog} from "@/app/domains/invoices/_contexts/DialogContext";
import analyzeInvoice from "@/lib/actions/invoices/analyzeInvoice";
import {type Invoice, InvoiceAnalysisOptions} from "@/types/invoices";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Checkbox,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Label,
  Progress,
  Separator,
  toast,
} from "@arolariu/components";
import {AnimatePresence, motion} from "motion/react";
import {useTranslations} from "next-intl";
import {useCallback, useState} from "react";
import {
  TbBolt,
  TbBrain,
  TbBuildingStore,
  TbChartBar,
  TbCheck,
  TbClock,
  TbFileAnalytics,
  TbLoader2,
  TbReceipt,
  TbScanEye,
  TbShoppingCart,
  TbSparkles,
} from "react-icons/tb";
import styles from "./AnalyzeDialog.module.scss";

/** Configuration for each analysis option. */
type AnalysisOptionConfig = {
  id: InvoiceAnalysisOptions;
  title: string;
  description: string;
  icon: React.ReactNode;
  estimatedTime: string;
  features: string[];
  recommended?: boolean;
};

/** Additional analysis enhancements. */
type AnalysisEnhancement = {
  id: string;
  label: string;
  description: string;
  icon: React.ReactNode;
};

/**
 * Dialog for configuring and triggering AI-powered invoice analysis.
 *
 * @remarks
 * **Rendering Context**: Client Component (`"use client"` directive).
 *
 * **Analysis Options**:
 * - Complete Analysis: Full OCR + AI processing
 * - Invoice Only: Basic invoice data extraction
 * - Items Only: Line item categorization
 * - Merchant Only: Merchant identification
 *
 * **Enhancements**: Optional add-ons for price comparison and savings tips.
 *
 * **Progress Tracking**: Displays real-time progress during analysis.
 *
 * @returns The AnalyzeDialog component, CSR'ed.
 */
export default function AnalyzeDialog(): React.JSX.Element {
  const t = useTranslations("I18nConsolidation.Invoices.AnalyzeDialog");
  const {
    isOpen,
    open,
    close,
    currentDialog: {payload},
  } = useDialog("EDIT_INVOICE__ANALYSIS");

  const {invoice} = payload as {invoice: Invoice};

  const [selectedOption, setSelectedOption] = useState<InvoiceAnalysisOptions>(InvoiceAnalysisOptions.CompleteAnalysis);
  const [selectedEnhancements, setSelectedEnhancements] = useState<string[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(0);
  const [currentStep, setCurrentStep] = useState<string>("");

  const analysisOptions: AnalysisOptionConfig[] = [
    {
      id: InvoiceAnalysisOptions.CompleteAnalysis,
      title: t("options.completeAnalysis.title"),
      description: t("options.completeAnalysis.description"),
      icon: <TbBrain className='h-6 w-6' />,
      estimatedTime: t("options.completeAnalysis.estimatedTime"),
      features: [
        t("options.completeAnalysis.features.ocrExtraction"),
        t("options.completeAnalysis.features.itemCategorization"),
        t("options.completeAnalysis.features.merchantIdentification"),
        t("options.completeAnalysis.features.priceAnalysis"),
        t("options.completeAnalysis.features.receiptValidation"),
      ],
      recommended: true,
    },
    {
      id: InvoiceAnalysisOptions.InvoiceOnly,
      title: t("options.invoiceOnly.title"),
      description: t("options.invoiceOnly.description"),
      icon: <TbReceipt className='h-6 w-6' />,
      estimatedTime: t("options.invoiceOnly.estimatedTime"),
      features: [
        t("options.invoiceOnly.features.totalExtraction"),
        t("options.invoiceOnly.features.dateParsing"),
        t("options.invoiceOnly.features.paymentMethodDetection"),
      ],
    },
    {
      id: InvoiceAnalysisOptions.InvoiceItemsOnly,
      title: t("options.itemsOnly.title"),
      description: t("options.itemsOnly.description"),
      icon: <TbShoppingCart className='h-6 w-6' />,
      estimatedTime: t("options.itemsOnly.estimatedTime"),
      features: [
        t("options.itemsOnly.features.itemExtraction"),
        t("options.itemsOnly.features.categoryAssignment"),
        t("options.itemsOnly.features.pricePerItem"),
        t("options.itemsOnly.features.quantityDetection"),
      ],
    },
    {
      id: InvoiceAnalysisOptions.InvoiceMerchantOnly,
      title: t("options.merchantOnly.title"),
      description: t("options.merchantOnly.description"),
      icon: <TbBuildingStore className='h-6 w-6' />,
      estimatedTime: t("options.merchantOnly.estimatedTime"),
      features: [
        t("options.merchantOnly.features.merchantIdentification"),
        t("options.merchantOnly.features.locationExtraction"),
        t("options.merchantOnly.features.businessCategory"),
        t("options.merchantOnly.features.contactInfo"),
      ],
    },
  ];

  const analysisEnhancements: AnalysisEnhancement[] = [
    {
      id: "priceComparison",
      label: t("enhancements.priceComparison.label"),
      description: t("enhancements.priceComparison.description"),
      icon: <TbChartBar className='h-4 w-4' />,
    },
    {
      id: "savingsTips",
      label: t("enhancements.savingsTips.label"),
      description: t("enhancements.savingsTips.description"),
      icon: <TbSparkles className='h-4 w-4' />,
    },
    {
      id: "quickExtract",
      label: t("enhancements.quickExtract.label"),
      description: t("enhancements.quickExtract.description"),
      icon: <TbBolt className='h-4 w-4' />,
    },
  ];

  const handleOptionSelect = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const {optionId} = e.currentTarget.dataset;
    if (optionId) {
      setSelectedOption(Number(optionId) as InvoiceAnalysisOptions);
    }
  }, []);

  const handleEnhancementToggle = useCallback((enhancementId: string) => {
    setSelectedEnhancements((prev) =>
      prev.includes(enhancementId) ? prev.filter((id) => id !== enhancementId) : [...prev, enhancementId],
    );
  }, []);

  const handleAnalysis = useCallback(async () => {
    setIsAnalyzing(true);
    setProgress(0);

    const delay = async (ms: number): Promise<void> =>
      new Promise((resolve) => {
        setTimeout(resolve, ms);
      });

    const steps = [
      t("analysisSteps.preparingDocument"),
      t("analysisSteps.runningOcrExtraction"),
      t("analysisSteps.analyzingWithAi"),
      t("analysisSteps.categorizingItems"),
      t("analysisSteps.finalizingResults"),
    ];

    try {
      const analysisPromise = analyzeInvoice({
        invoiceIdentifier: invoice.id,
        analysisOptions: selectedOption,
      });

      // Keep the same spinner + step texts while the backend request is pending.
      // We intentionally cap progress at 95% until the request completes.
      const stepDelayMs = 800;

      // Create a promise that resolves when analysis completes
      const analysisSettledPromise = analysisPromise.then(
        () => true,
        () => true,
      );

      // Animate through steps until analysis completes
      const animateSteps = async (): Promise<void> => {
        for (let i = 0; i < steps.length; i++) {
          // Check if analysis has completed
          const settled = await Promise.race([analysisSettledPromise, delay(0).then(() => false)]);
          if (settled) return;

          setCurrentStep(steps[i] ?? t("analysisSteps.processing"));
          setProgress(((i + 1) / steps.length) * 95);

          // Wait briefly before advancing steps, but don't block completion.
          // Catch and swallow errors here - they will be handled by the outer await
          await Promise.race([analysisPromise.catch(() => null), delay(stepDelayMs)]);
        }
      };

      // Run animation until analysis settles
      await Promise.race([analysisSettledPromise, animateSteps()]);

      // Await again so we propagate errors into the catch below.
      await analysisPromise;

      // Log analysis configuration (enhancements not wired into the API yet)
      console.info("Analyzing invoice:", invoice.id, {
        option: selectedOption,
        enhancements: selectedEnhancements,
      });

      setCurrentStep(t("analysisSteps.finalizingResults"));
      setProgress(100);

      toast(t("toasts.analysisComplete.title"), {
        description: t("toasts.analysisComplete.description"),
      });

      close();
    } catch (error) {
      console.error("Error analyzing invoice:", error);
      toast(t("toasts.analysisFailed.title"), {
        description: t("toasts.analysisFailed.description"),
      });
    } finally {
      setIsAnalyzing(false);
      setProgress(0);
      setCurrentStep("");
    }
  }, [invoice.id, selectedOption, selectedEnhancements, close, t]);

  const selectedConfig = analysisOptions.find((opt) => opt.id === selectedOption);

  return (
    <Dialog
      open={isOpen}
      // eslint-disable-next-line react/jsx-no-bind -- this is a simple fn.
      onOpenChange={(shouldOpen) => (shouldOpen ? open() : close())}>
      <DialogContent className='max-h-[90vh] overflow-y-auto sm:max-w-2xl md:max-w-4xl'>
        <DialogHeader>
          <DialogTitle className='flex items-center gap-2'>
            <TbScanEye className='h-6 w-6 text-purple-500' />
            {t("header.title")}
          </DialogTitle>
          <DialogDescription>
            {t("header.description")} <span className={styles["invoiceIdSnippet"]}>{invoice.id.slice(0, 8)}...</span>
          </DialogDescription>
        </DialogHeader>

        <AnimatePresence mode='wait'>
          {isAnalyzing ? (
            <motion.div
              key='analyzing'
              initial={{opacity: 0, y: 20}}
              animate={{opacity: 1, y: 0}}
              exit={{opacity: 0, y: -20}}
              className={styles["analyzingSection"]}>
              <div className={styles["spinnerWrapper"]}>
                <motion.div
                  animate={{rotate: 360}}
                  transition={{duration: 2, repeat: Number.POSITIVE_INFINITY, ease: "linear"}}
                  className={styles["spinnerIcon"]}>
                  <TbLoader2 className='h-12 w-12 text-purple-500' />
                </motion.div>
                <h3 className={styles["analyzingTitle"]}>{t("analyzing.title")}</h3>
                <p className={styles["analyzingStep"]}>{currentStep}</p>
              </div>
              <div className={styles["progressWrapper"]}>
                <Progress
                  value={progress}
                  className='h-2'
                />
                <p className={styles["progressText"]}>{t("analyzing.progressComplete", {progress: String(Math.round(progress))})}</p>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key='options'
              initial={{opacity: 0}}
              animate={{opacity: 1}}
              exit={{opacity: 0}}
              className={styles["optionsSection"]}>
              {/* Analysis Type Selection */}
              <div className={styles["sectionLabel"]}>
                <Label className='text-base font-medium'>{t("sections.analysisType")}</Label>
                <div className={styles["optionsGrid"]}>
                  {analysisOptions.map((option) => (
                    <Card
                      key={option.id}
                      data-option-id={option.id}
                      onClick={handleOptionSelect}
                      className={`cursor-pointer transition-all duration-200 ${
                        selectedOption === option.id ? styles["optionCardSelected"] : styles["optionCardDefault"]
                      }`}>
                      <CardHeader className='pb-2'>
                        <div className={styles["optionHeader"]}>
                          <div className={selectedOption === option.id ? styles["optionIconSelected"] : styles["optionIconDefault"]}>
                            {option.icon}
                          </div>
                          <div className={styles["optionBadges"]}>
                            {option.recommended ? (
                              <Badge
                                variant='secondary'
                                className='bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300'>
                                {t("badges.recommended")}
                              </Badge>
                            ) : null}
                            {selectedOption === option.id && <TbCheck className='h-5 w-5 text-purple-500' />}
                          </div>
                        </div>
                        <CardTitle className='text-base'>{option.title}</CardTitle>
                        <CardDescription className='text-xs'>{option.description}</CardDescription>
                      </CardHeader>
                      <CardContent className='pt-0'>
                        <div className={styles["optionTime"]}>
                          <TbClock className='h-3 w-3' />
                          <span>{option.estimatedTime}</span>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>

              {/* Selected Option Features */}
              {selectedConfig ? (
                <motion.div
                  initial={{opacity: 0, height: 0}}
                  animate={{opacity: 1, height: "auto"}}
                  className={styles["featuresSection"]}>
                  <Label className='text-sm font-medium'>{t("sections.includedFeatures")}</Label>
                  <div className={styles["featuresList"]}>
                    {selectedConfig.features.map((feature) => (
                      <Badge
                        key={feature}
                        variant='outline'
                        className='gap-1'>
                        <TbCheck className='h-3 w-3 text-green-500' />
                        {feature}
                      </Badge>
                    ))}
                  </div>
                </motion.div>
              ) : null}

              <Separator />

              {/* Analysis Enhancements */}
              <div className={styles["enhancementsSection"]}>
                <Label className='text-base font-medium'>{t("sections.enhancementsOptional")}</Label>
                <div className={styles["enhancementsSection"]}>
                  {analysisEnhancements.map((enhancement) => (
                    <div
                      key={enhancement.id}
                      className={styles["enhancementItem"]}>
                      <Checkbox
                        id={enhancement.id}
                        checked={selectedEnhancements.includes(enhancement.id)}
                        // eslint-disable-next-line react/jsx-no-bind -- simple toggle handler
                        onCheckedChange={() => handleEnhancementToggle(enhancement.id)}
                      />
                      <div className={styles["enhancementContent"]}>
                        <div className={styles["enhancementIconWrapper"]}>{enhancement.icon}</div>
                        <div className={styles["enhancementText"]}>
                          <Label
                            htmlFor={enhancement.id}
                            className='cursor-pointer font-medium'>
                            {enhancement.label}
                          </Label>
                          <p className={styles["enhancementDesc"]}>{enhancement.description}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Analysis Summary */}
              <Card className='bg-muted/30'>
                <CardContent className={styles["summaryContent"]}>
                  <div className={styles["summaryLeft"]}>
                    <TbFileAnalytics className='h-8 w-8 text-purple-500' />
                    <div>
                      <p className={styles["summaryTitle"]}>{selectedConfig?.title}</p>
                      <p className={styles["summarySubtext"]}>
                        {selectedEnhancements.length > 0
                          ? t("summary.enhancementsSelected", {count: String(selectedEnhancements.length)})
                          : t("summary.noEnhancementsSelected")}
                      </p>
                    </div>
                  </div>
                  <div className={styles["summaryRight"]}>
                    <p className={styles["summaryTimeLabel"]}>{t("summary.estimatedTime")}</p>
                    <p className={styles["summaryTimeValue"]}>{selectedConfig?.estimatedTime}</p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        <DialogFooter className='gap-2 sm:gap-0'>
          <Button
            type='button'
            variant='outline'
            onClick={close}
            disabled={isAnalyzing}>
            {t("buttons.cancel")}
          </Button>
          <Button
            type='button'
            onClick={handleAnalysis}
            disabled={isAnalyzing || selectedOption === InvoiceAnalysisOptions.NoAnalysis}
            className={styles["analyzeButton"]}>
            {isAnalyzing ? (
              <>
                <TbLoader2 className='mr-2 h-4 w-4 animate-spin' />
                {t("buttons.analyzing")}
              </>
            ) : (
              <>
                <TbScanEye className='mr-2 h-4 w-4' />
                {t("buttons.startAnalysis")}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
