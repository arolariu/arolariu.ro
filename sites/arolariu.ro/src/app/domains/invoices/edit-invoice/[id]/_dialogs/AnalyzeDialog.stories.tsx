import type {Invoice} from "@/types/invoices";
import type {Meta, StoryObj} from "@storybook/react";
import {
  invoicePresets,
  OpenDialogButton,
  playOpenDialog,
  storyEmptyInvoice,
  storyInvoice,
  storyLowConfidenceInvoice,
  storyMixedConfidenceInvoice,
  withEntityPreset,
} from "../../../_storybook";
import AnalyzeDialog from "./AnalyzeDialog";

type StoryArgs = {invoice: Invoice; invoicePreset: "standard" | "public"};

/**
 * AnalyzeDialog allows users to perform AI analysis on invoice scans.
 *
 * @remarks
 * This story mounts the real AnalyzeDialog component with OpenDialogButton
 * harness, opening the dialog automatically on mount with a story invoice payload.
 */
const meta = {
  title: "arolariu.ro/IMS/Dialogs/Invoice/Analyze",
  component: AnalyzeDialog,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  argTypes: {
    invoicePreset: {control: "select", options: ["standard", "public"]},
    invoice: {control: "object"},
  },
  args: {invoicePreset: "standard", invoice: storyInvoice},
  decorators: [withEntityPreset("invoicePreset", "invoice", invoicePresets)],
} satisfies Meta<StoryArgs>;

export default meta;
type Story = StoryObj<StoryArgs>;

/**
 * Default dialog content with analysis options.
 */
export const Default: Story = {
  play: playOpenDialog,
  render: ({invoice}) => (
    <OpenDialogButton
      dialog='EDIT_INVOICE__ANALYSIS'
      mode='view'
      payload={{invoice}}>
      <AnalyzeDialog />
    </OpenDialogButton>
  ),
};

/**
 * Analyze dialog for an invoice that has no scans attached yet.
 */
export const NoScans: Story = {
  play: playOpenDialog,
  render: ({invoice}) => (
    <OpenDialogButton
      dialog='EDIT_INVOICE__ANALYSIS'
      mode='view'
      payload={{invoice: {...invoice, scans: []}}}>
      <AnalyzeDialog />
    </OpenDialogButton>
  ),
};

/** Analyze dialog for an invoice with many scans. */
export const ManyScans: Story = {
  play: playOpenDialog,
  render: ({invoice}) => (
    <OpenDialogButton
      dialog='EDIT_INVOICE__ANALYSIS'
      mode='view'
      payload={{invoice: {...invoice, scans: [...invoice.scans, ...invoice.scans, ...invoice.scans]}}}>
      <AnalyzeDialog />
    </OpenDialogButton>
  ),
};

/** Analyze dialog for a low-confidence invoice. */
export const LowConfidence: Story = {
  play: playOpenDialog,
  render: () => (
    <OpenDialogButton
      dialog='EDIT_INVOICE__ANALYSIS'
      mode='view'
      payload={{invoice: storyLowConfidenceInvoice}}>
      <AnalyzeDialog />
    </OpenDialogButton>
  ),
};

/** Analyze dialog for an invoice with mixed confidence. */
export const MixedConfidence: Story = {
  play: playOpenDialog,
  render: () => (
    <OpenDialogButton
      dialog='EDIT_INVOICE__ANALYSIS'
      mode='view'
      payload={{invoice: storyMixedConfidenceInvoice}}>
      <AnalyzeDialog />
    </OpenDialogButton>
  ),
};

/** Analyze dialog for an empty invoice. */
export const EmptyInvoice: Story = {
  play: playOpenDialog,
  render: () => (
    <OpenDialogButton
      dialog='EDIT_INVOICE__ANALYSIS'
      mode='view'
      payload={{invoice: storyEmptyInvoice}}>
      <AnalyzeDialog />
    </OpenDialogButton>
  ),
};
