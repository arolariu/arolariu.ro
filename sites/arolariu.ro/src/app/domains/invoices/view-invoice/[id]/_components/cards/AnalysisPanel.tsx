"use client";

import {formatDate} from "@/lib/utils.generic";
import {InvoiceAnalysisOptions} from "@/types/invoices";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Progress,
  Spinner,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
  toast,
} from "@arolariu/components";
import {AnimatePresence, motion} from "motion/react";
import {useLocale} from "next-intl";
import {useTranslations} from "next-intl-selector";
import {useRouter} from "next/navigation";
import {useCallback, useState} from "react";
import {TbBolt, TbBrain, TbCheck, TbClock, TbInfoCircle, TbRefresh, TbRefreshAlert, TbShoppingCart, TbSparkles} from "react-icons/tb";
import {useInvoiceContext} from "../../_context/InvoiceContext";
import styles from "./AnalysisPanel.module.scss";
import { analyzeInvoice } from "@/app/domains/invoices/_actions/invoices";

/**
 * Analysis option configuration for button display.
 *
 * @property id - The analysis option enum value
 * @property label - Display label for the button
 * @property description - Tooltip description
 * @property icon - React icon component
 */
type AnalysisOption = Readonly<{
  readonly id: InvoiceAnalysisOptions;
  readonly label: string;
  readonly description: string;
  readonly icon: React.ReactNode;
}>;

/**
 * Analysis control panel for triggering invoice re-analysis.
 *
 * @remarks
 * **Rendering Context**: Client Component (`"use client"` directive).
 *
 * **Features**:
 * - Quick re-analyze button (CompleteAnalysis)
 * - Granular analysis option buttons
 * - Loading state with progress indicator
 * - Last analyzed timestamp display
 * - Success/error toast notifications
 * - Automatic page refresh on completion
 *
 * **Analysis Options**:
 * - Complete Analysis: Full OCR + AI processing
 * - Invoice Only: Basic invoice data extraction
 * - Items Only: Line item categorization
 * - Merchant Only: Merchant identification
 *
 * **Server Actions**: Uses `analyzeInvoice` from `@/lib/actions/invoices/analyzeInvoice`
 *
 * @returns The AnalysisPanel component.
 */
export function AnalysisPanel(): React.JSX.Element {
  const t = useTranslations();
  const locale = useLocale();
  const {invoice} = useInvoiceContext();
  const router = useRouter();

  // Hide the entire card when analysis is complete (items exist)
  if (invoice.items.length > 0) return <></>;

  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(0);
  const [currentStep, setCurrentStep] = useState<string>("");
  const [selectedOption, setSelectedOption] = useState<InvoiceAnalysisOptions | null>(null);

  /**
   * Analysis options configuration.
   *
   * @remarks
   * Note: InvoiceMerchantOnly is intentionally excluded as merchant data
   * is automatically enriched during invoice creation and analysis.
   */
  const analysisOptions: readonly AnalysisOption[] = [
    {
      id: InvoiceAnalysisOptions.CompleteAnalysis,
      label: t((m) => m["IMS--View"].analysisPanel.options.completeAnalysis),
      description: t((m) => m["IMS--View"].analysisPanel.tooltips.completeAnalysis),
      icon: <TbBrain className={styles["optionIcon"]} />,
    },
    {
      id: InvoiceAnalysisOptions.InvoiceOnly,
      label: t((m) => m["IMS--View"].analysisPanel.options.invoiceOnly),
      description: t((m) => m["IMS--View"].analysisPanel.tooltips.invoiceOnly),
      icon: <TbRefreshAlert className={styles["optionIcon"]} />,
    },
    {
      id: InvoiceAnalysisOptions.InvoiceItemsOnly,
      label: t((m) => m["IMS--View"].analysisPanel.options.itemsOnly),
      description: t((m) => m["IMS--View"].analysisPanel.tooltips.itemsOnly),
      icon: <TbShoppingCart className={styles["optionIcon"]} />,
    },
  ];

  /**
   * Handles triggering invoice analysis.
   *
   * @param option - The analysis option to use
   */
  const handleAnalyze = useCallback(
    async (option: InvoiceAnalysisOptions): Promise<void> => {
      setIsAnalyzing(true);
      setSelectedOption(option);
      setProgress(0);

      const delay = async (ms: number): Promise<void> =>
        new Promise((resolve) => {
          setTimeout(resolve, ms);
        });

      const steps = [t((m) => m["IMS--View"].analysisPanel.steps.preparing), t((m) => m["IMS--View"].analysisPanel.steps.extracting), t((m) => m["IMS--View"].analysisPanel.steps.analyzing), t((m) => m["IMS--View"].analysisPanel.steps.processing), t((m) => m["IMS--View"].analysisPanel.steps.finalizing)];

      try {
        // Start analysis
        const analysisPromise = analyzeInvoice({
          invoiceIdentifier: invoice.id,
          analysisOptions: option,
        });

        // Animate progress while waiting
        const stepDelayMs = 4000;
        const analysisSettledPromise = analysisPromise.then(
          () => true,
          () => true,
        );

        const animateSteps = async (): Promise<void> => {
          for (let i = 0; i < steps.length; i++) {
            const settled = await Promise.race([analysisSettledPromise, delay(0).then(() => false)]);
            if (settled) return;

            setCurrentStep(steps[i] ?? t((m) => m["IMS--View"].analysisPanel.steps.processing));
            setProgress(((i + 1) / steps.length) * 95);

            const doneAfterDelay = await Promise.race([analysisSettledPromise, delay(stepDelayMs).then(() => false)]);
            if (doneAfterDelay) return;
          }
        };

        await Promise.race([analysisSettledPromise, animateSteps()]);
        const result = await analysisPromise;

        // Check if the analysis failed
        if (!result.success) {
          throw new Error("Analysis failed");
        }

        setCurrentStep(t((m) => m["IMS--View"].analysisPanel.steps.complete));
        setProgress(100);

        toast(t((m) => m["IMS--View"].analysisPanel.toasts.success.title), {
          description: t((m) => m["IMS--View"].analysisPanel.toasts.success.description),
        });

        // Wait briefly before refresh to show completion state
        await delay(500);

        // Refresh the page to show updated data
        router.refresh();
      } catch (error) {
        console.error("Error analyzing invoice:", error);
        toast(t((m) => m["IMS--View"].analysisPanel.toasts.error.title), {
          description: t((m) => m["IMS--View"].analysisPanel.toasts.error.description),
        });
      } finally {
        setIsAnalyzing(false);
        setProgress(0);
        setCurrentStep("");
        setSelectedOption(null);
      }
    },
    [invoice.id, router, t],
  );

  /**
   * Handles quick re-analyze (CompleteAnalysis).
   */
  const handleQuickAnalyze = useCallback(async (): Promise<void> => {
    await handleAnalyze(InvoiceAnalysisOptions.CompleteAnalysis);
  }, [handleAnalyze]);

  /**
   * Factory: returns a stable click handler for triggering analysis with a specific option.
   * Each option button gets its own callback to avoid re-rendering on unrelated state changes.
   */
  const createAnalyzeHandler = useCallback(
    (optionId: InvoiceAnalysisOptions) => {
      return () => handleAnalyze(optionId);
    },
    [handleAnalyze],
  );

  return (
    <Card className={styles["card"]}>
      <CardHeader className={styles["header"]}>
        <div className={styles["headerContent"]}>
          <div className={styles["titleRow"]}>
            <TbSparkles className={styles["sparklesIcon"]} />
            <CardTitle className={styles["title"]}>{t((m) => m["IMS--View"].analysisPanel.title)}</CardTitle>
          </div>
          <CardDescription className={styles["description"]}>{t((m) => m["IMS--View"].analysisPanel.description)}</CardDescription>
        </div>
      </CardHeader>

      <CardContent className={styles["content"]}>
        <AnimatePresence mode='wait'>
          {isAnalyzing ? (
            <motion.div
              key='analyzing'
              initial={{opacity: 0, y: 10}}
              animate={{opacity: 1, y: 0}}
              exit={{opacity: 0, y: -10}}
              className={styles["analyzingState"]}>
              <div className={styles["spinnerWrapper"]}>
                <Spinner className={styles["spinner"]} />
                <div className={styles["statusText"]}>
                  <p className={styles["statusTitle"]}>{t((m) => m["IMS--View"].analysisPanel.analyzing.title)}</p>
                  <p className={styles["statusStep"]}>{currentStep}</p>
                </div>
              </div>

              <Progress
                value={progress}
                className={styles["progress"]}
              />
              <p className={styles["progressText"]}>{t((m) => m["IMS--View"].analysisPanel.analyzing.progress, {progress: String(Math.round(progress))})}</p>
            </motion.div>
          ) : (
            <motion.div
              key='idle'
              initial={{opacity: 0}}
              animate={{opacity: 1}}
              exit={{opacity: 0}}
              className={styles["idleState"]}>
              {/* Last Analyzed Info */}
              {invoice.lastUpdatedAt ? (
                <div className={styles["lastAnalyzed"]}>
                  <div className={styles["infoRow"]}>
                    <TbClock className={styles["infoIcon"]} />
                    <span className={styles["infoLabel"]}>{t((m) => m["IMS--View"].analysisPanel.labels.lastAnalyzed)}</span>
                  </div>
                  <p className={styles["infoValue"]}>
                    {formatDate(invoice.lastUpdatedAt, {
                      locale,
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                  </p>
                  {typeof invoice.numberOfUpdates === "number" && invoice.numberOfUpdates > 0 && (
                    <div className={styles["updatesBadge"]}>
                      <Badge variant='outline'>{t((m) => m["IMS--View"].analysisPanel.labels.updates, {count: invoice.numberOfUpdates})}</Badge>
                    </div>
                  )}
                </div>
              ) : null}

              {/* Quick Re-Analyze Button */}
              <div className={styles["quickAction"]}>
                <Button
                  onClick={handleQuickAnalyze}
                  disabled={isAnalyzing}
                  className={styles["primaryButton"]}
                  variant='default'
                  size='default'>
                  <TbRefresh className={styles["buttonIcon"]} />
                  {t((m) => m["IMS--View"].analysisPanel.buttons.reanalyze)}
                </Button>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger render={<TbInfoCircle className={styles["infoIconButton"]} />} />
                    <TooltipContent>
                      <p>{t((m) => m["IMS--View"].analysisPanel.tooltips.reanalyze)}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>

              {/* Granular Analysis Options */}
              {invoice.items.length === 0 ? (
                <div className={styles["optionsSection"]}>
                  <p className={styles["optionsLabel"]}>{t((m) => m["IMS--View"].analysisPanel.labels.granularOptions)}</p>
                  <div className={styles["optionsGrid"]}>
                    {analysisOptions.map((option) => (
                      <TooltipProvider key={option.id}>
                        <Tooltip>
                          <TooltipTrigger
                            render={
                              <Button
                                onClick={createAnalyzeHandler(option.id)}
                                disabled={isAnalyzing}
                                variant='outline'
                                size='sm'
                                className={styles["optionButton"]}>
                                {option.icon}
                                <span className={styles["optionLabel"]}>{option.label}</span>
                                {selectedOption === option.id && isAnalyzing ? <TbCheck className={styles["activeIcon"]} /> : null}
                              </Button>
                            }
                          />
                          <TooltipContent>
                            <p>{option.description}</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    ))}
                  </div>
                </div>
              ) : (
                <div className={styles["completionMessage"]}>
                  <TbCheck className={styles["completionIcon"]} />
                  <p className={styles["completionText"]}>{t((m) => m["IMS--View"].analysisPanel.labels.analysisComplete)}</p>
                </div>
              )}

              {/* Quick Tip */}
              <div className={styles["tip"]}>
                <TbBolt className={styles["tipIcon"]} />
                <p className={styles["tipText"]}>{t((m) => m["IMS--View"].analysisPanel.tip)}</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </CardContent>
    </Card>
  );
}
