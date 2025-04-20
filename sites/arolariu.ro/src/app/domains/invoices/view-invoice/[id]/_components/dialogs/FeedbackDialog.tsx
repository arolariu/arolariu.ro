/** @format */

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
import {useCallback, useState} from "react";
import {TbStar} from "react-icons/tb";
import {useDialog} from "../../_contexts/DialogContext";

/**
 * The FeedbackDialog component allows users to provide feedback on the analytics.
 * It includes a star rating, feature selection, and a textarea for additional comments.
 * @returns The FeedbackDialog component, CSR'ed.
 */
export default function FeedbackDialog(): React.JSX.Element {
  const [rating, setRating] = useState<number>(0);
  const [feedback, setFeedback] = useState<string>("");
  const [hoveredRating, setHoveredRating] = useState<number>(0);
  const [selectedFeatures, setSelectedFeatures] = useState<string[]>([]);
  const {
    currentDialog: {payload},
    isOpen,
    open,
    close,
  } = useDialog("feedback");

  const {invoice, merchant} = payload as {invoice: Invoice; merchant: Merchant};
  console.log(">>> FeedbackDialog", {invoice, merchant});
  const features = ["Spending Trends", "Price Comparisons", "Savings Tips", "Merchant Analysis", "Visual Charts", "Category Breakdown"];

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      // Show loading toast
      const loadingToast = toast("Sending invitation...", {
        description: "Please wait while we send the invitation.",
        className: "z-100",
      });

      if (rating === 0) {
        toast.dismiss(loadingToast);
        toast("Rating required", {
          description: "Please provide a star rating before submitting",
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
        toast("Feedback sent!", {
          description: `Feedback sent successfully`,
          className: "z-100",
        });
        setRating(0);
        setFeedback("");
        setSelectedFeatures([]);
        setHoveredRating(0);
      } catch (error: unknown) {
        console.error(">>> Failed to send feedback:", error);
        toast.dismiss(loadingToast);
        toast("An error occurred while submitting feedback", {
          description: "Please try again later.",
        });
      } finally {
        close();
      }
    },
    [rating, close],
  );

  const toggleFeature = (feature: string) => {
    setSelectedFeatures((prev) => (prev.includes(feature) ? prev.filter((f) => f !== feature) : [...prev, feature]));
  };

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(shouldOpen) => (shouldOpen ? open() : close())}>
      <DialogContent className='sm:max-w-lg'>
        <DialogHeader>
          <DialogTitle>Provide Feedback</DialogTitle>
          <DialogDescription>Help us improve our analytics by sharing your thoughts</DialogDescription>
        </DialogHeader>

        <div className='space-y-6 py-4'>
          {/* Star Rating */}
          <div className='space-y-2'>
            <h4 className='text-sm font-medium'>How would you rate the analytics?</h4>
            <div className='flex justify-center'>
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type='button'
                  className='p-1'
                  onMouseEnter={() => setHoveredRating(star)}
                  onMouseLeave={() => setHoveredRating(0)}
                  onClick={() => setRating(star)}>
                  <TbStar
                    className={`h-8 w-8 ${star <= (hoveredRating || rating) ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground"}`}
                  />
                </button>
              ))}
            </div>
          </div>

          {/* Feature Selection */}
          <div className='space-y-2'>
            <h4 className='text-sm font-medium'>Which features were most helpful? (Select all that apply)</h4>
            <div className='flex flex-wrap gap-2'>
              {features.map((feature) => (
                <Badge
                  key={feature}
                  variant={selectedFeatures.includes(feature) ? "default" : "outline"}
                  className='cursor-pointer'
                  onClick={() => toggleFeature(feature)}>
                  {feature}
                </Badge>
              ))}
            </div>
          </div>

          {/* Written Feedback */}
          <div className='space-y-2'>
            <h4 className='text-sm font-medium'>Additional comments (optional)</h4>
            <Textarea
              placeholder='Share your thoughts about the analytics...'
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              rows={4}
            />
          </div>
        </div>

        <DialogFooter>
          <form
            onSubmit={handleSubmit}
            className='flex items-center justify-between gap-4'>
            <Button
              variant='outline'
              onClick={close}>
              Cancel
            </Button>
            <Button type='submit'>Submit Feedback</Button>
          </form>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
