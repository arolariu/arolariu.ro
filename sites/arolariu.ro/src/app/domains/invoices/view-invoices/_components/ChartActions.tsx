/** @format */

"use client";

import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  toast,
} from "@arolariu/components";
import {Check, Copy, Download, Mail, MessageSquare, Share2} from "lucide-react";
import {useState} from "react";
import {FeedbackDialog} from "./dialogs/Feedback";

type Props = {
  chartId: string;
  title: string;
};

export function ChartActions({chartId, title}: Readonly<Props>) {
  const [copied, setCopied] = useState<boolean>(false);
  const [feedbackOpen, setFeedbackOpen] = useState<boolean>(false);

  const captureChart = async () => {
    try {
      // Use html2canvas to capture the chart
      // This is a client-side only lazy import
      const html2canvas = (await import("html2canvas")).default;
      const chartElement = document.getElementById(chartId);

      if (!chartElement) {
        toast("Error", {
          description: "Could not find chart to share",
        });
        return null;
      }

      return await html2canvas(chartElement, {
        backgroundColor: null,
        scale: 2, // Higher quality
        logging: false,
      });
    } catch (error) {
      console.error("Error capturing chart:", error);
      toast("Error", {
        description: "Failed to capture chart image",
      });
      return null;
    }
  };

  const copyToClipboard = async () => {
    const canvas = await captureChart();
    if (!canvas) return;

    try {
      canvas.toBlob(async (blob) => {
        if (!blob) {
          toast("Error", {
            description: "Failed to create image",
          });
          return;
        }

        // Create a ClipboardItem
        const item = new ClipboardItem({"image/png": blob});
        await navigator.clipboard.write([item]);

        setCopied(true);
        toast("Success", {
          description: "Chart copied to clipboard",
        });

        setTimeout(() => setCopied(false), 2000);
      });
    } catch (error) {
      console.error("Error copying to clipboard:", error);
      toast("Error", {
        description: "Failed to copy to clipboard. Your browser may not support this feature.",
      });
    }
  };

  const downloadChart = async () => {
    const canvas = await captureChart();
    if (!canvas) return;

    try {
      // Convert canvas to data URL
      const dataUrl = canvas.toDataURL("image/png");

      // Create download link
      const link = document.createElement("a");
      link.download = `${title.toLowerCase().replace(/\s+/g, "-")}-chart.png`;
      link.href = dataUrl;
      link.click();

      toast("Success", {
        description: "Chart downloaded successfully",
      });
    } catch (error) {
      console.error("Error downloading chart:", error);
      toast("Error", {
        description: "Failed to download chart",
      });
    }
  };

  const shareViaEmail = async () => {
    const canvas = await captureChart();
    if (!canvas) return;

    try {
      // Convert canvas to data URL
      const dataUrl = canvas.toDataURL("image/png");

      // Create email content
      const subject = encodeURIComponent(`Chart: ${title}`);
      const body = encodeURIComponent(`Here's my chart from the Invoice Dashboard.\n\n`);

      // Open email client
      window.location.href = `mailto:?subject=${subject}&body=${body}&attachment=${dataUrl}`;

      toast("Sent email!", {
        description: "Share your chart via email",
      });
    } catch (error) {
      console.error("Error sharing via email:", error);
      toast("Error", {
        description: "Failed to share via email",
      });
    }
  };

  return (
    <>
      <div className='absolute right-2 top-2 z-10 flex gap-1'>
        <Button
          variant='ghost'
          size='icon'
          className='bg-background/80 h-8 w-8 backdrop-blur-sm'
          onClick={() => setFeedbackOpen(true)}>
          <MessageSquare className='h-4 w-4' />
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant='ghost'
              size='icon'
              className='bg-background/80 h-8 w-8 backdrop-blur-sm'>
              <Share2 className='h-4 w-4' />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align='end'>
            <DropdownMenuItem onClick={copyToClipboard}>
              {copied ? <Check className='mr-2 h-4 w-4' /> : <Copy className='mr-2 h-4 w-4' />}
              Copy to clipboard
            </DropdownMenuItem>
            <DropdownMenuItem onClick={downloadChart}>
              <Download className='mr-2 h-4 w-4' />
              Download as PNG
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={shareViaEmail}>
              <Mail className='mr-2 h-4 w-4' />
              Share via email
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <FeedbackDialog
        open={feedbackOpen}
        onOpenChange={setFeedbackOpen}
        chartTitle={title}
      />
    </>
  );
}

