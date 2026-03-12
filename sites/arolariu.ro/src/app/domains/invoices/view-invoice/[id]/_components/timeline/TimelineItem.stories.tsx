import type {Meta, StoryObj} from "@storybook/react";
import {TbCheck, TbFileInvoice, TbRobot, TbShare, TbStar} from "react-icons/tb";
import {TimelineEventType} from "../../_types/timeline";
import {TimelineItem} from "./TimelineItem";

/**
 * TimelineItem renders a single event in the invoice timeline with an icon,
 * title, description, tooltip, and relative time label.
 */
const meta = {
  title: "Invoices/ViewInvoice/Timeline/TimelineItem",
  component: TimelineItem,
  parameters: {
    layout: "centered",
  },
} satisfies Meta<typeof TimelineItem>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Created event — the first event in any timeline. */
export const CreatedEvent: Story = {
  args: {
    event: {
      id: "evt-1",
      type: TimelineEventType.CREATED,
      date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
      title: "Invoice Created",
      description: "Receipt scanned and invoice created",
      icon: <TbFileInvoice className='h-3.5 w-3.5' />,
      completed: true,
      metadata: {method: "camera_scan"},
    },
    icon: <TbFileInvoice className='h-3.5 w-3.5' />,
    isLast: false,
  },
};

/** AI analysis event. */
export const AIAnalysisEvent: Story = {
  args: {
    event: {
      id: "evt-2",
      type: TimelineEventType.AI_ANALYSIS,
      date: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000),
      title: "AI Analysis Complete",
      description: "12 items detected via AI",
      icon: <TbRobot className='h-3.5 w-3.5' />,
      completed: true,
      metadata: {duration: "2.3s", itemCount: 12, confidence: 94},
    },
    icon: <TbRobot className='h-3.5 w-3.5' />,
    isLast: false,
  },
};

/** Shared event. */
export const SharedEvent: Story = {
  args: {
    event: {
      id: "evt-3",
      type: TimelineEventType.SHARED,
      date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      title: "Invoice Shared",
      description: "Shared with 2 users",
      icon: <TbShare className='h-3.5 w-3.5' />,
      completed: true,
      metadata: {users: ["alice@example.com", "bob@example.com"]},
    },
    icon: <TbShare className='h-3.5 w-3.5' />,
    isLast: false,
  },
};

/** Marked important — last event in timeline. */
export const MarkedImportantLast: Story = {
  args: {
    event: {
      id: "evt-4",
      type: TimelineEventType.MARKED_IMPORTANT,
      date: new Date(Date.now() - 60 * 60 * 1000), // 1 hour ago
      title: "Marked Important",
      description: "Invoice flagged for quick access",
      icon: <TbStar className='h-3.5 w-3.5' />,
      completed: true,
    },
    icon: <TbStar className='h-3.5 w-3.5' />,
    isLast: true,
  },
};

/** Pending event (not yet completed). */
export const PendingEvent: Story = {
  args: {
    event: {
      id: "evt-5",
      type: TimelineEventType.RECIPES_GENERATED,
      date: new Date(),
      title: "Generating Recipes",
      description: "AI is generating recipe suggestions",
      icon: <TbCheck className='h-3.5 w-3.5' />,
      completed: false,
      metadata: {itemCount: 5},
    },
    icon: <TbCheck className='h-3.5 w-3.5' />,
    isLast: true,
  },
};

/** Event with a very long description to test text wrapping and overflow. */
export const WithLongDescription: Story = {
  args: {
    event: {
      id: "evt-long",
      type: TimelineEventType.EDITED,
      date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
      title: "Invoice Edited",
      description:
        "The invoice was manually edited to correct several line items that were incorrectly detected by the AI analysis. " +
        "Changes include: updated merchant name from 'Kfland' to 'Kaufland', corrected the total amount from $125.50 to $132.47, " +
        "added 3 missing items (butter, eggs, and bread), removed 1 duplicate entry for 'Organic Milk', and updated the payment method from CASH to CREDIT CARD. " +
        "The category was also changed from UNCATEGORIZED to GROCERIES for better analytics tracking.",
      icon: <TbFileInvoice className='h-3.5 w-3.5' />,
      completed: true,
      metadata: {notes: "Manual correction after AI scan"},
    },
    icon: <TbFileInvoice className='h-3.5 w-3.5' />,
    isLast: false,
  },
};

/** Error/warning type event — exported with a failed state. */
export const ErrorEvent: Story = {
  args: {
    event: {
      id: "evt-error",
      type: TimelineEventType.EXPORTED,
      date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      title: "Export Failed",
      description: "PDF export failed due to missing data fields",
      icon: <TbFileInvoice className='h-3.5 w-3.5' />,
      completed: false,
      metadata: {method: "PDF", notes: "Error: Required fields merchant.address and invoice.total are null"},
    },
    icon: <TbFileInvoice className='h-3.5 w-3.5' />,
    isLast: true,
  },
};

/** Timeline item at mobile viewport width. */
export const MobileViewport: Story = {
  args: {
    event: {
      id: "evt-mobile",
      type: TimelineEventType.CREATED,
      date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      title: "Invoice Created",
      description: "Receipt scanned and invoice created",
      icon: <TbFileInvoice className='h-3.5 w-3.5' />,
      completed: true,
      metadata: {method: "camera_scan"},
    },
    icon: <TbFileInvoice className='h-3.5 w-3.5' />,
    isLast: false,
  },
  parameters: {
    viewport: {defaultViewport: "mobile1"},
  },
};
