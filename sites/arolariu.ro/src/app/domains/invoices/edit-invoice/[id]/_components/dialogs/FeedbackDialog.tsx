"use client";

import type {Invoice, Merchant} from "@/types/invoices";
import {
  Badge,
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Textarea,
  toast,
} from "@arolariu/components";
import {useTranslations} from "next-intl";
import {useCallback, useState} from "react";
import {TbStar} from "react-icons/tb";
import {useDialog} from "../../../../_contexts/DialogContext";
import styles from "./FeedbackDialog.module.scss";

/**
 * Dialog for collecting user feedback on invoice analytics features.
 *
 * @remarks
 * **Rendering Context**: Client Component (`"use client"` directive).
 *
 * **Feedback Collection**:
 * - **Star Rating**: 1-5 star visual rating with hover preview
 * - **Feature Selection**: Multi-select badges for specific analytics features
 * - **Comments**: Freeform textarea for detailed feedback
 *
 * **Features Available for Feedback**:
 * Spending Trends, Price Comparisons, Savings Tips, Merchant Analysis,
 * Visual Charts, Category Breakdown
 *
 * **Submission Flow**:
 * 1. User rates analytics (required)
 * 2. Optionally selects helpful features and adds comments
 * 3. Submits via POST to `/api/mail/invoices/feedback/{invoiceId}`
 * 4. Toast notifications indicate success or failure
 * 5. Form resets and dialog closes on success
 *
 * **Error Handling**: Validates rating is provided before submission.
 * Network errors are caught and displayed via toast.
 *
 * **Dialog Integration**: Uses `useDialog` hook with `INVOICE_FEEDBACK` type.
 * Payload contains `{invoice, merchant}` for context.
 *
 * @returns Client-rendered dialog with feedback form and submission handling
 *
 * @example
 * ```tsx
 * // Opened via AnalyticsCard "Feedback" button:
 * const {open} = useDialog("INVOICE_FEEDBACK", "add", {invoice, merchant});
 * <Button onClick={open}>Feedback</Button>
 * ```
 *
 * @see {@link useDialog} - Dialog state management hook
 * @see {@link AnalyticsCard} - Parent component that opens this dialog
 */
export default function FeedbackDialog(): React.JSX.Element {
  const t = useTranslations("Invoices.EditInvoice.feedbackDialog");
  const [rating, setRating] = useState<number>(0);
  const [feedback, setFeedback] = useState<string>("");
  const [hoveredRating, setHoveredRating] = useState<number>(0);
  const [selectedFeatures, setSelectedFeatures] = useState<string[]>([]);
  const {
    currentDialog: {payload},
    isOpen,
    open,
    close,
  } = useDialog("EDIT_INVOICE__FEEDBACK");

  const {invoice, merchant} = payload as {invoice: Invoice; merchant: Merchant};
  const features = [
    t("features.spendingTrends"),
    t("features.priceComparisons"),
    t("features.savingsTips"),
    t("features.merchantAnalysis"),
    t("features.visualCharts"),
    t("features.categoryBreakdown"),
  ];

  // Stable handlers to avoid inline arrow functions in JSX
  const handleStarEnter = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    const value = Number((e.currentTarget as HTMLButtonElement).dataset["star"]);
    if (!Number.isNaN(value)) {
      setHoveredRating(value);
    }
  }, []);

  const handleStarLeave = useCallback(() => {
    setHoveredRating(0);
  }, []);

  const handleStarClick = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    const value = Number((e.currentTarget as HTMLButtonElement).dataset["star"]);
    if (!Number.isNaN(value)) {
      setRating(value);
    }
  }, []);

  const handleSubmit = useCallback(
    async (e: React.SubmitEvent) => {
      e.preventDefault();

      // Show loading toast
      const loadingToast = toast(t("toasts.sending.title"), {
        description: t("toasts.sending.description"),
        className: "z-100",
      });

      if (rating === 0) {
        toast.dismiss(loadingToast);
        toast(t("toasts.ratingRequired.title"), {
          description: t("toasts.ratingRequired.description"),
        });
        return;
      }

      try {
        // Send feedback to the server
        const response = await fetch(`/api/mail/invoices/feedback/${invoice.id}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            feedbackFrom: "todo@todo.com",
            feedbackText: feedback,
            feedbackRating: rating,
            feedbackFeatures: selectedFeatures,
          }),
        });

        if (!response.ok) {
          throw new Error(`>>> Failed to send feedback: ${response.status}`);
        }

        toast.dismiss(loadingToast);
        toast(t("toasts.success.title"), {
          description: t("toasts.success.description"),
          className: "z-100",
        });
        setRating(0);
        setFeedback("");
        setSelectedFeatures([]);
        setHoveredRating(0);
      } catch (error: unknown) {
        console.error(">>> Failed to send feedback:", error);
        toast.dismiss(loadingToast);
        toast(t("toasts.error.title"), {
          description: t("toasts.error.description"),
        });
      } finally {
        close();
      }
    },
    [feedback, invoice.id, rating, selectedFeatures, close, t],
  );

  const handleToggleFeature = useCallback((e: React.MouseEvent<HTMLElement>) => {
    const {feature} = (e.currentTarget as HTMLElement).dataset;
    if (!feature) {
      return;
    }
    setSelectedFeatures((prev) => (prev.includes(feature) ? prev.filter((f) => f !== feature) : [...prev, feature]));
  }, []);

  const handleFeedbackChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setFeedback(e.target.value);
  }, []);

  return (
    <Dialog
      open={isOpen}
      // eslint-disable-next-line react/jsx-no-bind -- this is a simple fn.
      onOpenChange={(shouldOpen) => (shouldOpen ? open() : close())}>
      <DialogContent className={styles["dialogContent"]}>
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
          <DialogDescription>{t("description", {merchant: merchant.name})}</DialogDescription>
        </DialogHeader>

        <div className={styles["body"]}>
          {/* Star Rating */}
          <div className={styles["section"]}>
            <h4 className={styles["sectionHeading"]}>{t("sections.rating")}</h4>
            <div className={styles["starRow"]}>
              {[1, 2, 3, 4, 5].map((star) => (
                <Button
                  key={star}
                  type='button'
                  className={styles["starButton"]}
                  data-star={star}
                  onMouseEnter={handleStarEnter}
                  onMouseLeave={handleStarLeave}
                  onClick={handleStarClick}>
                  <TbStar className={star <= (hoveredRating || rating) ? styles["starActive"] : styles["starInactive"]} />
                </Button>
              ))}
            </div>
          </div>

          {/* Feature Selection */}
          <div className={styles["section"]}>
            <h4 className={styles["sectionHeading"]}>{t("sections.features")}</h4>
            <div className={styles["featuresWrap"]}>
              {features.map((feature) => (
                <Badge
                  key={feature}
                  variant={selectedFeatures.includes(feature) ? "default" : "outline"}
                  className={styles["featureBadge"]}
                  data-feature={feature}
                  onClick={handleToggleFeature}>
                  {feature}
                </Badge>
              ))}
            </div>
          </div>

          {/* Written Feedback */}
          <div className={styles["section"]}>
            <h4 className={styles["sectionHeading"]}>{t("sections.comments")}</h4>
            <Textarea
              placeholder={t("commentsPlaceholder")}
              value={feedback}
              onChange={handleFeedbackChange}
              rows={4}
            />
          </div>
        </div>

        <DialogFooter>
          <form
            onSubmit={handleSubmit}
            className={styles["footerForm"]}>
            <Button
              variant='outline'
              onClick={close}>
              {t("buttons.cancel")}
            </Button>
            <Button type='submit'>{t("buttons.submit")}</Button>
          </form>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
