import type {Meta, StoryObj} from "@storybook/react";
import {NextIntlClientProvider} from "next-intl";
import {TbCheck, TbFileInvoice, TbRobot, TbShare, TbStar} from "react-icons/tb";
import {TimelineEventType} from "../../_types/timeline";
import messages from "../../../../../../../../messages/en.json";
import {TimelineItem} from "./TimelineItem";

/**
 * TimelineItem renders a single event in the invoice timeline with an icon,
 * title, description, tooltip, and relative time label.
 */
const meta = {
  title: "Invoices/ViewInvoice/TimelineItem",
  component: TimelineItem,
  tags: ["autodocs"],
  decorators: [
    (Story) => (
      <NextIntlClientProvider
        locale="en"
        messages={messages}
        timeZone="Europe/Bucharest">
        <div className="max-w-lg p-4">
          <Story />
        </div>
      </NextIntlClientProvider>
    ),
  ],
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
      icon: <TbFileInvoice className="h-3.5 w-3.5" />,
      completed: true,
      metadata: {method: "camera_scan"},
    },
    icon: <TbFileInvoice className="h-3.5 w-3.5" />,
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
      icon: <TbRobot className="h-3.5 w-3.5" />,
      completed: true,
      metadata: {duration: "2.3s", itemCount: 12, confidence: 94},
    },
    icon: <TbRobot className="h-3.5 w-3.5" />,
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
      icon: <TbShare className="h-3.5 w-3.5" />,
      completed: true,
      metadata: {users: ["alice@example.com", "bob@example.com"]},
    },
    icon: <TbShare className="h-3.5 w-3.5" />,
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
      icon: <TbStar className="h-3.5 w-3.5" />,
      completed: true,
    },
    icon: <TbStar className="h-3.5 w-3.5" />,
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
      icon: <TbCheck className="h-3.5 w-3.5" />,
      completed: false,
      metadata: {itemCount: 5},
    },
    icon: <TbCheck className="h-3.5 w-3.5" />,
    isLast: true,
  },
};
