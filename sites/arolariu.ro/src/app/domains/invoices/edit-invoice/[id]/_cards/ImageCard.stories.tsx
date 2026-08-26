import {generateRandomInvoice} from "@/data/mocks";
import {InvoiceScanType, type Invoice} from "@/types/invoices";
import type {Decorator, Meta, StoryObj} from "@storybook/react";
import {DialogProvider} from "../../../_contexts/DialogContext";
import ImageCard from "./ImageCard";

/**
 * ImageCard displays receipt images with navigation, zoom, and add/remove controls.
 *
 * Requires `DialogProvider` because it dispatches `EDIT_INVOICE__ADD_SCAN`
 * and `EDIT_INVOICE__REMOVE_SCAN` dialogs from its footer buttons.
 */
const withDialogProviderDecorator: Decorator = (Story) => (
  <DialogProvider>
    <Story />
  </DialogProvider>
);

const meta = {
  title: "Invoices/EditInvoice/Cards/ImageCard",
  component: ImageCard,
  decorators: [withDialogProviderDecorator],
  parameters: {
    layout: "centered",
  },
} satisfies Meta<typeof ImageCard>;

export default meta;
type Story = StoryObj<typeof meta>;

const singleScanInvoice: Invoice = generateRandomInvoice();

const multiScanInvoice: Invoice = {
  ...generateRandomInvoice(),
  scans: [
    {type: InvoiceScanType.JPEG, location: "https://picsum.photos/seed/imagecard1/400/600", metadata: {}},
    {type: InvoiceScanType.JPEG, location: "https://picsum.photos/seed/imagecard2/400/600", metadata: {}},
    {type: InvoiceScanType.JPEG, location: "https://picsum.photos/seed/imagecard3/400/600", metadata: {}},
  ],
};

/** Single scan — no navigation controls rendered. */
export const SingleScan: Story = {
  args: {invoice: singleScanInvoice},
};

/** Multiple scans — previous/next navigation and position indicator appear. */
export const MultipleScans: Story = {
  args: {invoice: multiScanInvoice},
};
