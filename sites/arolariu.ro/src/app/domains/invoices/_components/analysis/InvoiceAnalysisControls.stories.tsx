import type {Meta, StoryObj} from "@storybook/react";
import {resolveInvoiceCapabilities} from "@/types/invoices/Analysis";
import InvoiceAnalysisControls from "./InvoiceAnalysisControls";

/**
 * Capability and profile controls used while an invoice analysis request is idle.
 *
 * @remarks
 * Consumers represent submission by setting `disabled`. Queued requests replace
 * these controls with `QueuedAnalysisNotice`, so this component has no queued state.
 */
const meta = {
  title: "Invoices/Analysis/InvoiceAnalysisControls",
  component: InvoiceAnalysisControls,
  parameters: {
    layout: "padded",
  },
  tags: ["autodocs"],
  args: {
    profile: "balanced",
    value: resolveInvoiceCapabilities("balanced"),
    onChange: () => undefined,
  },
  argTypes: {
    onChange: {control: false},
  },
} satisfies Meta<typeof InvoiceAnalysisControls>;

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
    value: resolveInvoiceCapabilities("comprehensive"),
    disabled: true,
  },
};

/** Custom capabilities that diverge from the selected profile preset. */
export const Custom: Story = {
  args: {
    value: {
      ...resolveInvoiceCapabilities("balanced"),
      invoiceSummary: false,
    },
  },
};
