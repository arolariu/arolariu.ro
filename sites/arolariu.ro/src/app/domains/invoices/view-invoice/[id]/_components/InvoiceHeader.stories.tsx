import {generateRandomMerchant, InvoiceBuilder} from "@/data/mocks";
import type {Invoice} from "@/types/invoices";
import type {Decorator, Meta, StoryObj} from "@storybook/react";
import {DialogProvider, InvoiceContextProvider} from "../../../../../../../.storybook/providers";
import {InvoiceHeader} from "./InvoiceHeader";

/**
 * InvoiceHeader (view) displays the invoice title, importance badge, and
 * action buttons (edit, delete, print, export). Reads the invoice via
 * `useInvoiceContext`, the authenticated user via the real
 * `useUserInformation` hook (falls back to the guest/nil-UUID identity when
 * `/api/user` is unreachable in Storybook), and opens the shared delete/export
 * dialogs via `useDialog`, so every story mounts the real component inside
 * both the real `InvoiceContextProvider` and `DialogProvider` re-exported
 * from `.storybook/providers`.
 */
const mockMerchant = generateRandomMerchant();

function withInvoice(invoice: Invoice): Decorator {
  return (Story) => (
    <DialogProvider>
      <InvoiceContextProvider
        invoice={invoice}
        merchant={mockMerchant}>
        <Story />
      </InvoiceContextProvider>
    </DialogProvider>
  );
}

const meta = {
  title: "Invoices/ViewInvoice/InvoiceHeader",
  component: InvoiceHeader,
  parameters: {
    layout: "fullscreen",
  },
} satisfies Meta<typeof InvoiceHeader>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Owner view — `userIdentifier` matches the guest/nil UUID that
 * `useUserInformation` falls back to, so edit and delete buttons are visible.
 */
export const OwnerView: Story = {
  decorators: [
    withInvoice(
      new InvoiceBuilder().withName("Weekly Grocery Shopping").withUserIdentifier("00000000-0000-0000-0000-000000000000").build(),
    ),
  ],
};

/** Guest view — invoice belongs to a different user, so only print/export buttons are visible. */
export const GuestView: Story = {
  decorators: [withInvoice(new InvoiceBuilder().withName("Shared Invoice").build())],
};
