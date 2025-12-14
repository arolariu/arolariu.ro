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

/** Available analysis options with their configurations. */
const ANALYSIS_OPTIONS: AnalysisOptionConfig[] = [
  {
    id: InvoiceAnalysisOptions.CompleteAnalysis,
    title: "Complete Analysis",
    description: "Full AI-powered analysis including all invoice data, items, and merchant information.",
    icon: <TbBrain className='h-6 w-6' />,
    estimatedTime: "2-3 min",
    features: ["OCR extraction", "Item categorization", "Merchant identification", "Price analysis", "Receipt validation"],
    recommended: true,
  },
  {
    id: InvoiceAnalysisOptions.InvoiceOnly,
    title: "Invoice Data Only",
    description: "Analyze basic invoice information like totals, dates, and payment details.",
    icon: <TbReceipt className='h-6 w-6' />,
    estimatedTime: "30-60 sec",
    features: ["Total extraction", "Date parsing", "Payment method detection"],
  },
  {
    id: InvoiceAnalysisOptions.InvoiceItemsOnly,
    title: "Items Analysis",
    description: "Focus on extracting and categorizing individual line items from the invoice.",
    icon: <TbShoppingCart className='h-6 w-6' />,
    estimatedTime: "1-2 min",
    features: ["Item extraction", "Category assignment", "Price per item", "Quantity detection"],
  },
  {
    id: InvoiceAnalysisOptions.InvoiceMerchantOnly,
    title: "Merchant Analysis",
    description: "Identify and analyze merchant information including location and category.",
    icon: <TbBuildingStore className='h-6 w-6' />,
    estimatedTime: "30-45 sec",
    features: ["Merchant identification", "Location extraction", "Business category", "Contact info"],
  },
];

/** Additional analysis enhancements. */
type AnalysisEnhancement = {
  id: string;
  label: string;
  description: string;
  icon: React.ReactNode;
};

const ANALYSIS_ENHANCEMENTS: AnalysisEnhancement[] = [
  {
    id: "priceComparison",
    label: "Price Comparison",
    description: "Compare prices with historical data",
    icon: <TbChartBar className='h-4 w-4' />,
  },
  {
    id: "savingsTips",
    label: "Savings Suggestions",
    description: "Get AI-powered saving recommendations",
    icon: <TbSparkles className='h-4 w-4' />,
  },
  {
    id: "quickExtract",
    label: "Quick Extract Mode",
    description: "Prioritize speed over accuracy",
    icon: <TbBolt className='h-4 w-4' />,
  },
];

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

  const handleOptionSelect = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const optionId = (e.currentTarget as HTMLDivElement).dataset["optionId"];
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
      "Preparing document...",
      "Running OCR extraction...",
      "Analyzing with AI...",
      "Categorizing items...",
      "Finalizing results...",
    ];

    try {
      const analysisPromise = analyzeInvoice({
        invoiceIdentifier: invoice.id,
        analysisOptions: selectedOption,
      });

      // Keep the same spinner + step texts while the backend request is pending.
      // We intentionally cap progress at 95% until the request completes.
      let isAnalysisSettled = false;

      analysisPromise
        .then(() => {
          isAnalysisSettled = true;
        })
        .catch(() => {
          isAnalysisSettled = true;
        });

      const stepDelayMs = 800;

      while (!isAnalysisSettled) {
        for (let i = 0; i < steps.length; i++) {
          if (isAnalysisSettled) break;

          setCurrentStep(steps[i] ?? "Processing...");
          setProgress(((i + 1) / steps.length) * 95);

          // Wait briefly before advancing steps, but don’t block completion.
          await Promise.race([analysisPromise, delay(stepDelayMs)]);
        }
      }

      // Await again so we propagate errors into the catch below.
      await analysisPromise;

      // Log analysis configuration (enhancements not wired into the API yet)
      console.info("Analyzing invoice:", invoice.id, {
        option: selectedOption,
        enhancements: selectedEnhancements,
      });

      setCurrentStep("Finalizing results...");
      setProgress(100);

      toast("Analysis Complete", {
        description: "Your invoice has been analyzed successfully.",
      });

      close();
    } catch (error) {
      console.error("Error analyzing invoice:", error);
      toast("Analysis Failed", {
        description: "We couldn't analyze your invoice. Please try again.",
      });
    } finally {
      setIsAnalyzing(false);
      setProgress(0);
      setCurrentStep("");
    }
  }, [invoice.id, selectedOption, selectedEnhancements, close]);

  const selectedConfig = ANALYSIS_OPTIONS.find((opt) => opt.id === selectedOption);

  return (
    <Dialog
      open={isOpen}
      // eslint-disable-next-line react/jsx-no-bind -- this is a simple fn.
      onOpenChange={(shouldOpen) => (shouldOpen ? open() : close())}>
      <DialogContent className='max-h-[90vh] overflow-y-auto sm:max-w-2xl md:max-w-4xl'>
        <DialogHeader>
          <DialogTitle className='flex items-center gap-2'>
            <TbScanEye className='h-6 w-6 text-purple-500' />
            Analyze Invoice
          </DialogTitle>
          <DialogDescription>
            Configure AI-powered analysis for invoice <span className='font-mono text-xs'>{invoice.id.slice(0, 8)}...</span>
          </DialogDescription>
        </DialogHeader>

        <AnimatePresence mode='wait'>
          {isAnalyzing ? (
            <motion.div
              key='analyzing'
              initial={{opacity: 0, y: 20}}
              animate={{opacity: 1, y: 0}}
              exit={{opacity: 0, y: -20}}
              className='space-y-6 py-8'>
              <div className='flex flex-col items-center justify-center space-y-4'>
                <motion.div
                  animate={{rotate: 360}}
                  transition={{duration: 2, repeat: Number.POSITIVE_INFINITY, ease: "linear"}}
                  className='rounded-full bg-purple-100 p-4 dark:bg-purple-900/30'>
                  <TbLoader2 className='h-12 w-12 text-purple-500' />
                </motion.div>
                <h3 className='text-lg font-semibold'>Analyzing Invoice</h3>
                <p className='text-muted-foreground text-sm'>{currentStep}</p>
              </div>
              <div className='mx-auto max-w-md space-y-2'>
                <Progress
                  value={progress}
                  className='h-2'
                />
                <p className='text-muted-foreground text-center text-xs'>{Math.round(progress)}% complete</p>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key='options'
              initial={{opacity: 0}}
              animate={{opacity: 1}}
              exit={{opacity: 0}}
              className='space-y-6'>
              {/* Analysis Type Selection */}
              <div className='space-y-3'>
                <Label className='text-base font-medium'>Analysis Type</Label>
                <div className='grid gap-3 sm:grid-cols-2'>
                  {ANALYSIS_OPTIONS.map((option) => (
                    <Card
                      key={option.id}
                      data-option-id={option.id}
                      onClick={handleOptionSelect}
                      className={`cursor-pointer transition-all duration-200 ${
                        selectedOption === option.id
                          ? "border-purple-500 bg-purple-50 ring-2 ring-purple-500/20 dark:bg-purple-900/20"
                          : "hover:bg-muted/50 hover:border-purple-300"
                      }`}>
                      <CardHeader className='pb-2'>
                        <div className='flex items-start justify-between'>
                          <div className={`rounded-lg p-2 ${selectedOption === option.id ? "bg-purple-500 text-white" : "bg-muted"}`}>
                            {option.icon}
                          </div>
                          <div className='flex items-center gap-2'>
                            {option.recommended && (
                              <Badge
                                variant='secondary'
                                className='bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300'>
                                Recommended
                              </Badge>
                            )}
                            {selectedOption === option.id && <TbCheck className='h-5 w-5 text-purple-500' />}
                          </div>
                        </div>
                        <CardTitle className='text-base'>{option.title}</CardTitle>
                        <CardDescription className='text-xs'>{option.description}</CardDescription>
                      </CardHeader>
                      <CardContent className='pt-0'>
                        <div className='text-muted-foreground flex items-center gap-1 text-xs'>
                          <TbClock className='h-3 w-3' />
                          <span>{option.estimatedTime}</span>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>

              {/* Selected Option Features */}
              {selectedConfig && (
                <motion.div
                  initial={{opacity: 0, height: 0}}
                  animate={{opacity: 1, height: "auto"}}
                  className='space-y-2'>
                  <Label className='text-sm font-medium'>Included Features</Label>
                  <div className='flex flex-wrap gap-2'>
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
              )}

              <Separator />

              {/* Analysis Enhancements */}
              <div className='space-y-3'>
                <Label className='text-base font-medium'>Enhancements (Optional)</Label>
                <div className='space-y-3'>
                  {ANALYSIS_ENHANCEMENTS.map((enhancement) => (
                    <div
                      key={enhancement.id}
                      className='hover:bg-muted/50 flex items-start space-x-3 rounded-lg border p-3 transition-colors'>
                      <Checkbox
                        id={enhancement.id}
                        checked={selectedEnhancements.includes(enhancement.id)}
                        // eslint-disable-next-line react/jsx-no-bind -- simple toggle handler
                        onCheckedChange={() => handleEnhancementToggle(enhancement.id)}
                      />
                      <div className='flex flex-1 items-start gap-3'>
                        <div className='text-muted-foreground mt-0.5'>{enhancement.icon}</div>
                        <div className='space-y-1'>
                          <Label
                            htmlFor={enhancement.id}
                            className='cursor-pointer font-medium'>
                            {enhancement.label}
                          </Label>
                          <p className='text-muted-foreground text-xs'>{enhancement.description}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Analysis Summary */}
              <Card className='bg-muted/30'>
                <CardContent className='flex items-center justify-between py-4'>
                  <div className='flex items-center gap-3'>
                    <TbFileAnalytics className='h-8 w-8 text-purple-500' />
                    <div>
                      <p className='font-medium'>{selectedConfig?.title}</p>
                      <p className='text-muted-foreground text-sm'>
                        {selectedEnhancements.length > 0 ? `+ ${selectedEnhancements.length} enhancement(s)` : "No enhancements selected"}
                      </p>
                    </div>
                  </div>
                  <div className='text-right'>
                    <p className='text-muted-foreground text-sm'>Estimated time</p>
                    <p className='font-semibold'>{selectedConfig?.estimatedTime}</p>
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
            Cancel
          </Button>
          <Button
            type='button'
            onClick={handleAnalysis}
            disabled={isAnalyzing || selectedOption === InvoiceAnalysisOptions.NoAnalysis}
            className='bg-purple-600 hover:bg-purple-700'>
            {isAnalyzing ? (
              <>
                <TbLoader2 className='mr-2 h-4 w-4 animate-spin' />
                Analyzing...
              </>
            ) : (
              <>
                <TbScanEye className='mr-2 h-4 w-4' />
                Start Analysis
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
