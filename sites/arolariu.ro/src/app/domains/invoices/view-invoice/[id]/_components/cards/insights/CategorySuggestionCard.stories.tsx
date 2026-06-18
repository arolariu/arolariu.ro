import type {Meta, StoryObj} from "@storybook/react";
import {CategorySuggestionCard} from "./CategorySuggestionCard";

/**
 * CategorySuggestionCard lets users pick a category for an uncategorized invoice.
 * It holds its own local state and needs no invoice context, so it mounts directly.
 */
const meta = {
  title: "arolariu.ro/IMS/Insights/Products/CategorySuggestionCard",
  component: CategorySuggestionCard,
  parameters: {layout: "centered"},
} satisfies Meta<typeof CategorySuggestionCard>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Default category suggestion card with selectable main/extended categories. */
export const Default: Story = {};
