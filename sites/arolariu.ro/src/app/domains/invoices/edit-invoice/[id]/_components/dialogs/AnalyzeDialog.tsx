"use client";

import {useDialog} from "@/app/domains/invoices/_contexts/DialogContext";
import analyzeInvoice from "@/app/domains/invoices/_actions/invoices/analyzeInvoice";
import {InvoiceAnalysisOptions} from "@/types/invoices";
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
import {useTranslations} from "next-intl-selector";
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
  const t = useTranslations();
  const {
    isOpen,
    close,
    currentDialog: {payload},
  } = useDialog("EDIT_INVOICE__ANALYSIS");

  const {invoice} = payload;

  const [selectedOption, setSelectedOption] = useState<InvoiceAnalysisOptions>(InvoiceAnalysisOptions.CompleteAnalysis);
  const [selectedEnhancements, setSelectedEnhancements] = useState<string[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(0);
  const [currentStep, setCurrentStep] = useState<string>("");

  const analysisOptions: AnalysisOptionConfig[] = [
    {
      id: InvoiceAnalysisOptions.CompleteAnalysis,
      title: t((m) => m.dialogs.invoices.analyzeDialog.options.completeAnalysis.title),
      description: t((m) => m.dialogs.invoices.analyzeDialog.options.completeAnalysis.description),
      icon: <TbBrain className={styles["optionIcon"]} />,
      estimatedTime: t((m) => m.dialogs.invoices.analyzeDialog.options.completeAnalysis.estimatedTime),
      features: [
        t((m) => m.dialogs.invoices.analyzeDialog.options.completeAnalysis.features.ocrExtraction),
        t((m) => m.dialogs.invoices.analyzeDialog.options.completeAnalysis.features.itemCategorization),
        t((m) => m.dialogs.invoices.analyzeDialog.options.completeAnalysis.features.merchantIdentification),
        t((m) => m.dialogs.invoices.analyzeDialog.options.completeAnalysis.features.priceAnalysis),
        t((m) => m.dialogs.invoices.analyzeDialog.options.completeAnalysis.features.receiptValidation),
      ],
      recommended: true,
    },
    {
      id: InvoiceAnalysisOptions.InvoiceOnly,
      title: t((m) => m.dialogs.invoices.analyzeDialog.options.invoiceOnly.title),
      description: t((m) => m.dialogs.invoices.analyzeDialog.options.invoiceOnly.description),
      icon: <TbReceipt className={styles["optionIcon"]} />,
      estimatedTime: t((m) => m.dialogs.invoices.analyzeDialog.options.invoiceOnly.estimatedTime),
      features: [
        t((m) => m.dialogs.invoices.analyzeDialog.options.invoiceOnly.features.totalExtraction),
        t((m) => m.dialogs.invoices.analyzeDialog.options.invoiceOnly.features.dateParsing),
        t((m) => m.dialogs.invoices.analyzeDialog.options.invoiceOnly.features.paymentMethodDetection),
      ],
    },
    {
      id: InvoiceAnalysisOptions.InvoiceItemsOnly,
      title: t((m) => m.dialogs.invoices.analyzeDialog.options.itemsOnly.title),
      description: t((m) => m.dialogs.invoices.analyzeDialog.options.itemsOnly.description),
      icon: <TbShoppingCart className={styles["optionIcon"]} />,
      estimatedTime: t((m) => m.dialogs.invoices.analyzeDialog.options.itemsOnly.estimatedTime),
      features: [
        t((m) => m.dialogs.invoices.analyzeDialog.options.itemsOnly.features.itemExtraction),
        t((m) => m.dialogs.invoices.analyzeDialog.options.itemsOnly.features.categoryAssignment),
        t((m) => m.dialogs.invoices.analyzeDialog.options.itemsOnly.features.pricePerItem),
        t((m) => m.dialogs.invoices.analyzeDialog.options.itemsOnly.features.quantityDetection),
      ],
    },
    {
      id: InvoiceAnalysisOptions.InvoiceMerchantOnly,
      title: t((m) => m.dialogs.invoices.analyzeDialog.options.merchantOnly.title),
      description: t((m) => m.dialogs.invoices.analyzeDialog.options.merchantOnly.description),
      icon: <TbBuildingStore className={styles["optionIcon"]} />,
      estimatedTime: t((m) => m.dialogs.invoices.analyzeDialog.options.merchantOnly.estimatedTime),
      features: [
        t((m) => m.dialogs.invoices.analyzeDialog.options.merchantOnly.features.merchantIdentification),
        t((m) => m.dialogs.invoices.analyzeDialog.options.merchantOnly.features.locationExtraction),
        t((m) => m.dialogs.invoices.analyzeDialog.options.merchantOnly.features.businessCategory),
        t((m) => m.dialogs.invoices.analyzeDialog.options.merchantOnly.features.contactInfo),
      ],
    },
  ];

  const analysisEnhancements: AnalysisEnhancement[] = [
    {
      id: "priceComparison",
      label: t((m) => m.dialogs.invoices.analyzeDialog.enhancements.priceComparison.label),
      description: t((m) => m.dialogs.invoices.analyzeDialog.enhancements.priceComparison.description),
      icon: <TbChartBar className={styles["enhancementSmallIcon"]} />,
    },
    {
      id: "savingsTips",
      label: t((m) => m.dialogs.invoices.analyzeDialog.enhancements.savingsTips.label),
      description: t((m) => m.dialogs.invoices.analyzeDialog.enhancements.savingsTips.description),
      icon: <TbSparkles className={styles["enhancementSmallIcon"]} />,
    },
    {
      id: "quickExtract",
      label: t((m) => m.dialogs.invoices.analyzeDialog.enhancements.quickExtract.label),
      description: t((m) => m.dialogs.invoices.analyzeDialog.enhancements.quickExtract.description),
      icon: <TbBolt className={styles["enhancementSmallIcon"]} />,
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
      t((m) => m.dialogs.invoices.analyzeDialog.analysisSteps.preparingDocument),
      t((m) => m.dialogs.invoices.analyzeDialog.analysisSteps.runningOcrExtraction),
      t((m) => m.dialogs.invoices.analyzeDialog.analysisSteps.analyzingWithAi),
      t((m) => m.dialogs.invoices.analyzeDialog.analysisSteps.categorizingItems),
      t((m) => m.dialogs.invoices.analyzeDialog.analysisSteps.finalizingResults),
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

          setCurrentStep(steps[i] ?? t((m) => m.dialogs.invoices.analyzeDialog.analysisSteps.processing));
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

      setCurrentStep(t((m) => m.dialogs.invoices.analyzeDialog.analysisSteps.finalizingResults));
      setProgress(100);

      toast(t((m) => m.dialogs.invoices.analyzeDialog.toasts.analysisComplete.title), {
        description: t((m) => m.dialogs.invoices.analyzeDialog.toasts.analysisComplete.description),
      });

      close();
    } catch (error) {
      console.error("Error analyzing invoice:", error);
      toast(t((m) => m.dialogs.invoices.analyzeDialog.toasts.analysisFailed.title), {
        description: t((m) => m.dialogs.invoices.analyzeDialog.toasts.analysisFailed.description),
      });
    } finally {
      setIsAnalyzing(false);
      setProgress(0);
      setCurrentStep("");
    }
  }, [invoice, selectedOption, selectedEnhancements, close, t]);

  const selectedConfig = analysisOptions.find((opt) => opt.id === selectedOption);

  return (
    <Dialog
      open={isOpen}
      // eslint-disable-next-line react/jsx-no-bind -- simple dialog close handler
      onOpenChange={(shouldOpen) => {
        if (!shouldOpen) close();
      }}>
      <DialogContent className={styles["dialogContent"]}>
        <DialogHeader>
          <DialogTitle className={styles["dialogTitle"]}>
            <TbScanEye className={styles["scanIcon"]} />
            {t((m) => m.dialogs.invoices.analyzeDialog.header.title)}
          </DialogTitle>
          <DialogDescription>
            {t((m) => m.dialogs.invoices.analyzeDialog.header.description)} <span className={styles["invoiceIdSnippet"]}>{invoice.id.slice(0, 8)}...</span>
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
                  <TbLoader2 className={styles["spinnerLargeIcon"]} />
                </motion.div>
                <h3 className={styles["analyzingTitle"]}>{t((m) => m.dialogs.invoices.analyzeDialog.analyzing.title)}</h3>
                <p className={styles["analyzingStep"]}>{currentStep}</p>
              </div>
              <div className={styles["progressWrapper"]}>
                <Progress
                  value={progress}
                  className={styles["progressBar"]}
                />
                <p className={styles["progressText"]}>{t((m) => m.dialogs.invoices.analyzeDialog.analyzing.progressComplete, {progress: String(Math.round(progress))})}</p>
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
                <Label className={styles["sectionLabelLarge"]}>{t((m) => m.dialogs.invoices.analyzeDialog.sections.analysisType)}</Label>
                <div className={styles["optionsGrid"]}>
                  {analysisOptions.map((option) => (
                    <Card
                      key={option.id}
                      data-option-id={option.id}
                      onClick={handleOptionSelect}
                      className={selectedOption === option.id ? styles["optionCardSelected"] : styles["optionCardDefault"]}>
                      <CardHeader className={styles["optionCardHeader"]}>
                        <div className={styles["optionHeader"]}>
                          <div className={selectedOption === option.id ? styles["optionIconSelected"] : styles["optionIconDefault"]}>
                            {option.icon}
                          </div>
                          <div className={styles["optionBadges"]}>
                            {option.recommended ? (
                              <Badge
                                variant='secondary'
                                className={styles["recommendedBadge"]}>
                                {t((m) => m.dialogs.invoices.analyzeDialog.badges.recommended)}
                              </Badge>
                            ) : null}
                            {selectedOption === option.id && <TbCheck className={styles["checkIcon"]} />}
                          </div>
                        </div>
                        <CardTitle className={styles["optionTitle"]}>{option.title}</CardTitle>
                        <CardDescription className={styles["optionDescription"]}>{option.description}</CardDescription>
                      </CardHeader>
                      <CardContent className={styles["optionContent"]}>
                        <div className={styles["optionTime"]}>
                          <TbClock className={styles["clockIcon"]} />
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
                  <Label className={styles["sectionLabelText"]}>{t((m) => m.dialogs.invoices.analyzeDialog.sections.includedFeatures)}</Label>
                  <div className={styles["featuresList"]}>
                    {selectedConfig.features.map((feature) => (
                      <Badge
                        key={feature}
                        variant='outline'
                        className={styles["featureBadge"]}>
                        <TbCheck className={styles["checkIconSmall"]} />
                        {feature}
                      </Badge>
                    ))}
                  </div>
                </motion.div>
              ) : null}

              <Separator />

              {/* Analysis Enhancements */}
              <div className={styles["enhancementsSection"]}>
                <Label className={styles["sectionLabelLarge"]}>{t((m) => m.dialogs.invoices.analyzeDialog.sections.enhancementsOptional)}</Label>
                <div className={styles["enhancementsSection"]}>
                  {analysisEnhancements.map((enhancement) => (
                    <div
                      key={enhancement.id}
                      className={styles["enhancementItem"]}>
                      <Checkbox
                        nativeButton
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
                            className={styles["enhancementLabel"]}>
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
              <Card className={styles["summaryCard"]}>
                <CardContent className={styles["summaryContent"]}>
                  <div className={styles["summaryLeft"]}>
                    <TbFileAnalytics className={styles["analyticsIcon"]} />
                    <div>
                      <p className={styles["summaryTitle"]}>{selectedConfig?.title}</p>
                      <p className={styles["summarySubtext"]}>
                        {selectedEnhancements.length > 0
                          ? t((m) => m.dialogs.invoices.analyzeDialog.summary.enhancementsSelected, {count: String(selectedEnhancements.length)})
                          : t((m) => m.dialogs.invoices.analyzeDialog.summary.noEnhancementsSelected)}
                      </p>
                    </div>
                  </div>
                  <div className={styles["summaryRight"]}>
                    <p className={styles["summaryTimeLabel"]}>{t((m) => m.dialogs.invoices.analyzeDialog.summary.estimatedTime)}</p>
                    <p className={styles["summaryTimeValue"]}>{selectedConfig?.estimatedTime}</p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        <DialogFooter className={styles["dialogFooter"]}>
          <Button
            type='button'
            variant='outline'
            onClick={close}
            disabled={isAnalyzing}>
            {t((m) => m.dialogs.invoices.analyzeDialog.buttons.cancel)}
          </Button>
          <Button
            type='button'
            onClick={handleAnalysis}
            disabled={isAnalyzing || selectedOption === InvoiceAnalysisOptions.NoAnalysis}
            className={styles["analyzeButton"]}>
            {isAnalyzing ? (
              <>
                <TbLoader2 className={styles["buttonSpinner"]} />
                {t((m) => m.dialogs.invoices.analyzeDialog.buttons.analyzing)}
              </>
            ) : (
              <>
                <TbScanEye className={styles["buttonScanIcon"]} />
                {t((m) => m.dialogs.invoices.analyzeDialog.buttons.startAnalysis)}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
