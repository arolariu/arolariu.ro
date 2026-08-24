import type {Meta, StoryObj} from "@storybook/react";
import {resolveMerchantCapabilities} from "@/types/invoices/Analysis";
import MerchantAnalysisControls from "./MerchantAnalysisControls";

/**
 * Capability and profile controls used while a merchant analysis request is idle.
 *
 * @remarks
 * Consumers represent submission by setting `disabled`. Queued request rendering
 * belongs to the parent workflow, so this component has no queued state.
 */
const meta = {
  title: "Invoices/Analysis/MerchantAnalysisControls",
  component: MerchantAnalysisControls,
  parameters: {
    layout: "padded",
  },
  tags: ["autodocs"],
  args: {
    profile: "balanced",
    value: resolveMerchantCapabilities("balanced"),
    onChange: () => undefined,
  },
  argTypes: {
    onChange: {control: false},
  },
} satisfies Meta<typeof MerchantAnalysisControls>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Idle state with the balanced profile selected. */
export const Idle: Story = {};

/** Submitting state, represented through the component's disabled API. */
export const Submitting: Story = {
  args: {
    disabled: true,
  },
};

/** Explicit disabled state for contexts that cannot accept capability edits. */
export const Disabled: Story = {
  args: {
    profile: "comprehensive",
    value: resolveMerchantCapabilities("comprehensive"),
    disabled: true,
  },
};

/** Custom capabilities that diverge from the selected profile preset. */
export const Custom: Story = {
  args: {
    value: {
      ...resolveMerchantCapabilities("balanced"),
      descriptionGeneration: false,
    },
  },
};
