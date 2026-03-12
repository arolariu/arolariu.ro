import type {Meta, StoryObj} from "@storybook/react";
import {InvoiceGuestBanner} from "./InvoiceGuestBanner";

/**
 * InvoiceGuestBanner shows an informational alert to users viewing a shared
 * invoice they don't own. It uses a blue-themed Alert component.
 */
const meta = {
  title: "Invoices/ViewInvoice/Banners/GuestBanner",
  component: InvoiceGuestBanner,
  parameters: {
    layout: "centered",
  },
} satisfies Meta<typeof InvoiceGuestBanner>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Default guest banner displayed at the top of shared invoices. */
export const Default: Story = {};
