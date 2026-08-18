import {buildProduct} from "../../../../../../../tests/helpers/builders/domain";
import type {Meta, StoryObj} from "@storybook/react";
import GuidedEditBanner from "./GuidedEditBanner";

const meta = {
  title: "Invoices/Edit Invoice/GuidedEditBanner",
  component: GuidedEditBanner,
  parameters: {layout: "padded"},
} satisfies Meta<typeof GuidedEditBanner>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Complete: Story = {
  args: {items: [buildProduct(), buildProduct({name: "Complete product"})], onReviewAll: () => undefined},
};

export const NeedsReview: Story = {
  args: {
    items: [buildProduct({classification: null, metadata: {isEdited: false, isComplete: false, isSoftDeleted: false, confidence: 0.5}})],
    onReviewAll: () => undefined,
  },
};
