import type {Meta, StoryObj} from "@storybook/react";
import {CategorySuggestionCard} from "./CategorySuggestionCard";

/**
 * CategorySuggestionCard allows users to categorize their invoice by selecting
 * from main and extended category options. Uses a step-based UI with progress.
 * Has no props and no context dependency — only local state and `useTranslations`.
 */
const meta = {
  title: "Invoices/ViewInvoice/Insights/CategorySuggestionCard",
  component: CategorySuggestionCard,
  parameters: {
    layout: "centered",
  },
} satisfies Meta<typeof CategorySuggestionCard>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Default categorization prompt with main and extended category options. */
export const Default: Story = {};
