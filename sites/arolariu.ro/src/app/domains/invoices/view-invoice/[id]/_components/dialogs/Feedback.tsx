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
  Label,
  Textarea,
  toast,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@arolariu/components";
import {motion} from "framer-motion";
import {Send, Star} from "lucide-react";
import {useCallback, useState} from "react";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function FeedbackDialog({open, onOpenChange}: Readonly<Props>) {
  const [hoveredRating, setHoveredRating] = useState<number>(0);
  const [comment, setComment] = useState<string>("");
  const [rating, setRating] = useState<number>(0);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();

      if (rating === 0) {
        toast("Rating required", {
          description: "Please provide a rating before submitting",
        });
        return;
      }

      toast("Feedback submitted!", {
        description: "Thank you for your feedback!",
      });

      // Reset form
      setRating(0);
      setComment("");
      onOpenChange(false);
    },
    [rating, onOpenChange],
  );

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-md'>
        <DialogHeader>
          <DialogTitle>Provide Feedback</DialogTitle>
          <DialogDescription>Help us improve our analytics and suggestions</DialogDescription>
        </DialogHeader>

        <form
          onSubmit={handleSubmit}
          className='space-y-4 py-2'>
          <div className='space-y-2'>
            <Label>How useful are these analytics?</Label>
            <div className='flex justify-center py-2'>
              <TooltipProvider>
                {[1, 2, 3, 4, 5].map((star) => (
                  <Tooltip key={star}>
                    <motion.button
                      type='button'
                      whileHover={{scale: 1.2}}
                      whileTap={{scale: 0.9}}
                      onClick={() => setRating(star)}
                      onMouseEnter={() => setHoveredRating(star)}
                      onMouseLeave={() => setHoveredRating(0)}
                      className='p-1'>
                      <TooltipTrigger asChild>
                        <Star
                          className={`h-8 w-8 ${
                            star <= (hoveredRating || rating) ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground"
                          } transition-colors`}
                        />
                      </TooltipTrigger>
                      <TooltipContent>
                        <span>TODO: {star} stars!</span>
                      </TooltipContent>
                    </motion.button>
                  </Tooltip>
                ))}
              </TooltipProvider>
            </div>
            <p className='text-muted-foreground text-center text-sm'>
              {rating === 1 && "Not useful"}
              {rating === 2 && "Somewhat useful"}
              {rating === 3 && "Useful"}
              {rating === 4 && "Very useful"}
              {rating === 5 && "Extremely useful"}
              {rating === 0 && "Select a rating"}
            </p>
          </div>

          <div className='space-y-2'>
            <Label htmlFor='comment'>Comments (optional)</Label>
            <Textarea
              id='comment'
              placeholder='What did you like or dislike? How can we improve?'
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={4}
            />
          </div>

          <div className='space-y-2'>
            <Label>Which features were most helpful?</Label>
            <div className='flex flex-wrap gap-2'>
              {["Currency conversion", "Spending trends", "Merchant comparison", "Category breakdown", "Savings tips"].map((feature) => (
                <Button
                  key={feature}
                  type='button'
                  variant='outline'
                  size='sm'
                  className='rounded-full hover:bg-primary/10 hover:text-primary'
                  onClick={() => {
                    setComment((prev) =>
                      prev ? `${prev}\nI found the ${feature} feature helpful.` : `I found the ${feature} feature helpful.`,
                    );
                  }}>
                  {feature}
                </Button>
              ))}
            </div>
          </div>

          <DialogFooter className='pt-4'>
            <Button
              variant='outline'
              type='button'
              onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type='submit'>
              <Send className='mr-2 h-4 w-4' />
              Submit Feedback
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
