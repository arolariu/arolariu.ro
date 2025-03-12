/** @format */

"use client";

import type {Invoice} from "@/types/invoices";
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
import {Star} from "lucide-react";
import {useState} from "react";
import {useDialog} from "../../_contexts/DialogContext";

type Props = {
  invoice: Invoice;
};

export function FeedbackDialog({invoice}: Readonly<Props>) {
  const [rating, setRating] = useState<number>(0);
  const [feedback, setFeedback] = useState<string>("");
  const {isOpen, open, close} = useDialog("feedback");
  const [hoveredRating, setHoveredRating] = useState<number>(0);
  const [selectedFeatures, setSelectedFeatures] = useState<string[]>([]);

  const features = ["Spending Trends", "Price Comparisons", "Savings Tips", "Merchant Analysis", "Visual Charts", "Category Breakdown"];

  const handleSubmit = () => {
    if (rating === 0) {
      toast("Rating required", {
        description: "Please provide a star rating before submitting",
      });
      return;
    }

    // In a real app, this would submit the feedback to a server
    toast("Feedback submitted", {
      description: "Thank you for your feedback!",
    });

    close();
  };

  const toggleFeature = (feature: string) => {
    setSelectedFeatures((prev) => (prev.includes(feature) ? prev.filter((f) => f !== feature) : [...prev, feature]));
  };

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(shouldOpen) => (shouldOpen ? open() : close())}>
      <DialogContent className='sm:max-w-md'>
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
                  <Star
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
          <Button
            variant='outline'
            onClick={close}>
            Cancel
          </Button>
          <Button onClick={handleSubmit}>Submit Feedback</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
