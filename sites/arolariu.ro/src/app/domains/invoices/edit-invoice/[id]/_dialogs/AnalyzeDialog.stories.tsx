/**
 * @fileoverview Storybook coverage for the production analysis dialog.
 * @module app/domains/invoices/edit-invoice/[id]/_dialogs/AnalyzeDialog.stories
 */

import {mockInvoice} from "@/data/mocks";
import {useDialog} from "@/app/domains/invoices/_contexts/DialogContext";
import type {Meta, StoryObj} from "@storybook/react";
import {useEffect} from "react";
import {withDialogProvider} from "../../../../../../../.storybook/providers";
import AnalyzeDialog from "./AnalyzeDialog";

const storyInvoice = {
  ...mockInvoice,
  id: "11111111-1111-4111-8111-111111111111",
};

/**
 * Opens the real dialog after the dialog context provider mounts.
 *
 * @returns The production dialog in its open state.
 */
export function OpenAnalyzeDialogStory(): React.JSX.Element {
  const {isOpen, open} = useDialog("EDIT_INVOICE__ANALYSIS", "view", {invoice: storyInvoice});

  useEffect(() => {
    open();
  }, [open]);

  return isOpen ? <AnalyzeDialog /> : <></>;
}

const meta = {
  title: "Invoices/EditInvoice/Dialogs/AnalyzeDialog",
  component: AnalyzeDialog,
  decorators: [withDialogProvider],
  parameters: {
    layout: "centered",
  },
} satisfies Meta<typeof AnalyzeDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

/** The real analysis dialog using the selected Storybook locale and theme. */
export const Default: Story = {
  render: () => <OpenAnalyzeDialogStory />,
};
