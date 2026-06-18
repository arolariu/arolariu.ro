import type {Meta, StoryObj} from "@storybook/react";
import {MessageList} from "./MessageList";

/**
 * MessageList renders a chat-style list of messages between the user and
 * an AI assistant. Each message includes an avatar, timestamp, and content.
 */
const meta = {
  title: "arolariu.ro/IMS/Components/Invoice/MessageList",
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

/** Many messages (20) — overflow scroll test. */
export const ManyMessages: Story = {
  args: {
    messages: Array.from({length: 20}, (_, i) => ({
      id: String(i + 1),
      role: i % 2 === 0 ? ("user" as const) : ("assistant" as const),
      content:
        i % 2 === 0
          ? `User question ${i / 2 + 1}: What can you tell me about my spending?`
          : `Assistant response ${Math.floor(i / 2) + 1}: Based on your invoices, here are some insights...`,
      timestamp: new Date(Date.now() - (20 - i) * 300000).toISOString(),
    })),
  },
  parameters: {
    docs: {
      description: {
        story:
          "Message list with 20 alternating user/assistant messages. Tests overflow scrolling, rendering performance, and conversation flow with many messages.",
      },
    },
  },
};

/** Message with very long content — text wrapping test. */
export const LongMessageContent: Story = {
  args: {
    messages: [
      {
        id: "1",
        role: "user",
        content: "Can you provide a detailed analysis?",
        timestamp: new Date(Date.now() - 3600000).toISOString(),
      },
      {
        id: "2",
        role: "assistant",
        content:
          "Based on your comprehensive invoice history spanning the last six months, I can provide an in-depth analysis of your spending patterns across multiple dimensions including temporal trends, categorical distributions, merchant preferences, payment method utilization, and seasonal variations. Your grocery spending shows a consistent upward trajectory with notable peaks during holiday periods, while your discretionary spending on dining and entertainment fluctuates more significantly based on day of week and time of month, with concentration around weekends and month-end periods. The data also reveals interesting patterns in your bulk purchasing behavior, suggesting opportunities for further optimization through strategic timing and vendor selection. Additionally, your payment method distribution indicates a strong preference for contactless transactions, which aligns with modern security best practices while also providing enhanced tracking capabilities for personal finance management and budgeting purposes.",
        timestamp: new Date(Date.now() - 3500000).toISOString(),
      },
    ],
  },
  parameters: {
    docs: {
      description: {
        story:
          "Message list with assistant message containing very long content. Tests text wrapping, readability, and layout handling of extended responses.",
      },
    },
  },
};

/** Two messages — minimal viable conversation. */
export const TwoMessages: Story = {
  args: {
    messages: [
      {
        id: "1",
        role: "user",
        content: "Hello, can you help me analyze my invoices?",
        timestamp: new Date(Date.now() - 3600000).toISOString(),
      },
      {
        id: "2",
        role: "assistant",
        content: "Of course! I can help you analyze your invoice data. What would you like to know?",
        timestamp: new Date(Date.now() - 3500000).toISOString(),
      },
    ],
  },
  parameters: {
    docs: {
      description: {
        story: "Message list with minimal two-message conversation. Tests basic conversation rendering.",
      },
    },
  },
};

/** Six messages — moderate conversation length. */
export const SixMessages: Story = {
  args: {
    messages: [
      {
        id: "1",
        role: "user",
        content: "What are my top spending categories?",
        timestamp: new Date(Date.now() - 3600000).toISOString(),
      },
      {
        id: "2",
        role: "assistant",
        content: "Your top categories are Groceries (45%), Dining (25%), and Transportation (15%).",
        timestamp: new Date(Date.now() - 3500000).toISOString(),
      },
      {
        id: "3",
        role: "user",
        content: "How does this compare to last month?",
        timestamp: new Date(Date.now() - 3400000).toISOString(),
      },
      {
        id: "4",
        role: "assistant",
        content: "Groceries increased by 10%, while Dining decreased by 5% compared to last month.",
        timestamp: new Date(Date.now() - 3300000).toISOString(),
      },
      {
        id: "5",
        role: "user",
        content: "What about my average invoice amount?",
        timestamp: new Date(Date.now() - 3200000).toISOString(),
      },
      {
        id: "6",
        role: "assistant",
        content: "Your average invoice amount is 87.50 RON, which is 12% higher than last month.",
        timestamp: new Date(Date.now() - 3100000).toISOString(),
      },
    ],
  },
  parameters: {
    docs: {
      description: {
        story: "Message list with six messages in back-and-forth conversation. Tests moderate conversation flow and scrolling.",
      },
    },
  },
};
