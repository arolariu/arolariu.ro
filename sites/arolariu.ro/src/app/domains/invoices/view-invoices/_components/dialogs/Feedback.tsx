/** @format */

"use client";

import {
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
import {useState} from "react";
import {GoThumbsdown, GoThumbsup} from "react-icons/go";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  chartTitle: string;
};

/**
 * The FeedbackDialog component allows users to provide feedback on a chart.
 * It includes options for positive and negative feedback, as well as a textarea for additional comments.
 * @returns The FeedbackDialog component, CSR'ed.
 */
export function FeedbackDialog({open, onOpenChange, chartTitle}: Readonly<Props>) {
  const [feedback, setFeedback] = useState<string>("");
  const [sentiment, setSentiment] = useState<"positive" | "negative" | null>(null);

  const handleSubmit = () => {
    // In a real app, you would send this feedback to your backend
    console.log({
      chartTitle,
      feedback,
      sentiment,
    });

    toast("Feedback submitted!", {
      description: "Thank you for your feedback!",
    });

    // Reset and close
    setFeedback("");
    setSentiment(null);
    onOpenChange(false);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-[425px]'>
        <DialogHeader>
          <DialogTitle>Chart Feedback</DialogTitle>
          <DialogDescription>Share your thoughts about the "{chartTitle}" chart</DialogDescription>
        </DialogHeader>

        <div className='space-y-4 py-4'>
          <div className='flex justify-center gap-4'>
            <Button
              variant={sentiment === "positive" ? "default" : "outline"}
              className={sentiment === "positive" ? "bg-green-600 hover:bg-green-700" : ""}
              size='lg'
              onClick={() => setSentiment("positive")}>
              <GoThumbsup className='mr-2 h-5 w-5' />
              Helpful
            </Button>
            <Button
              variant={sentiment === "negative" ? "default" : "outline"}
              className={sentiment === "negative" ? "bg-red-600 hover:bg-red-700" : ""}
              size='lg'
              onClick={() => setSentiment("negative")}>
              <GoThumbsdown className='mr-2 h-5 w-5' />
              Not Helpful
            </Button>
          </div>

          <div className='space-y-2'>
            <label
              htmlFor='feedback'
              className='text-sm font-medium'>
              Additional Comments (Optional)
            </label>
            <Textarea
              id='feedback'
              placeholder='Tell us what you think about this chart...'
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              rows={4}
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant='outline'
            onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!sentiment}>
            Submit Feedback
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
