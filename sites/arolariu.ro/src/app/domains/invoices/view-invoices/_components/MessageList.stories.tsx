import type {Meta, StoryObj} from "@storybook/react";
import {MessageList} from "./MessageList";

/**
 * MessageList renders a chat-style list of messages between the user and
 * an AI assistant. Each message includes an avatar, timestamp, and content.
 */
const meta = {
  title: "Invoices/ViewInvoices/MessageList",
  component: MessageList,
  parameters: {
    layout: "centered",
  },
} satisfies Meta<typeof MessageList>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Conversation between user and AI assistant. */
export const Default: Story = {
  args: {
    messages: [
      {
        id: "1",
        role: "user",
        content: "Can you analyze my spending patterns for December?",
        timestamp: new Date(Date.now() - 3600000).toISOString(),
      },
      {
        id: "2",
        role: "assistant",
        content:
          "Based on your invoices from December, I can see the following patterns:\n\n1. Grocery spending increased by 35% compared to November\n2. You made 12 shopping trips, averaging every 2.5 days\n3. Your highest single purchase was $89.50 at Kaufland",
        timestamp: new Date(Date.now() - 3500000).toISOString(),
      },
      {
        id: "3",
        role: "user",
        content: "What about my most common categories?",
        timestamp: new Date(Date.now() - 3400000).toISOString(),
      },
      {
        id: "4",
        role: "assistant",
        content:
          "Your top spending categories are:\n- Groceries: $450 (52%)\n- Beverages: $120 (14%)\n- Dairy Products: $95 (11%)\n- Meat & Fish: $88 (10%)",
        timestamp: new Date(Date.now() - 3300000).toISOString(),
      },
    ],
  },
};

/** Single message from the assistant. */
export const SingleAssistantMessage: Story = {
  args: {
    messages: [
      {
        id: "1",
        role: "assistant",
        content: "Hello! I can help you analyze your invoices and find spending patterns. What would you like to know?",
        timestamp: new Date().toISOString(),
      },
    ],
  },
};

/** Empty conversation. */
export const Empty: Story = {
  args: {
    messages: [],
  },
};
