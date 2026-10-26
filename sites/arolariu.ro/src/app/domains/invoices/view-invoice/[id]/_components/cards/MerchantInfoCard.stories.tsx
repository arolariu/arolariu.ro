import {InvoiceBuilder, MerchantBuilder} from "@/data/mocks";
import type {Invoice, Merchant} from "@/types/invoices";
import type {Decorator, Meta, StoryObj} from "@storybook/react";
import {InvoiceContextProvider} from "../../../../../../../../.storybook/providers";
import {MerchantInfoCard} from "./MerchantInfoCard";

/**
 * MerchantInfoCard displays merchant details: name, address, phone, category,
 * and website. Reads the invoice and merchant via `useInvoiceContext`, and also
 * reads cached invoices via the real `useInvoicesStore` (empty by default in
 * Storybook, which drives the "no spending history yet" branch).
 */
const baseInvoice = new InvoiceBuilder().build();

const merchantWithoutWebsite: Merchant = (() => {
  const merchant = new MerchantBuilder()
    .withName("Local Bakery")
    .withAddress("Str. Lipscani 42, Bucharest")
    .withPhoneNumber("+40 21 987 6543")
    .build();
  return {...merchant, address: {...merchant.address, website: ""}};
})();

/** Builds a decorator that supplies a specific invoice/merchant pair through the real InvoiceContext. */
function withInvoiceAndMerchant(invoice: Invoice, merchant: Merchant | null): Decorator {
  return (Story) => (
    <InvoiceContextProvider
      invoice={invoice}
      merchant={merchant}>
      <Story />
    </InvoiceContextProvider>
  );
}

const meta = {
  title: "Invoices/ViewInvoice/Cards/MerchantInfo",
  component: MerchantInfoCard,
  parameters: {
    layout: "centered",
  },
} satisfies Meta<typeof MerchantInfoCard>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Merchant with a website link. */
export const WithWebsite: Story = {
  decorators: [
    withInvoiceAndMerchant(
      baseInvoice,
      new MerchantBuilder().withName("Kaufland").withAddress("Calea Victoriei 123, Sector 1, Bucharest").build(),
    ),
  ],
};

/** Merchant without a website — the website row is not rendered. */
export const WithoutWebsite: Story = {
  decorators: [withInvoiceAndMerchant(baseInvoice, merchantWithoutWebsite)],
};

/** No merchant linked to the invoice — shows the empty state. */
export const NoMerchant: Story = {
  decorators: [withInvoiceAndMerchant(baseInvoice, null)],
};

/** Merchant with a very long name to test text overflow and wrapping. */
export const LongMerchantName: Story = {
  decorators: [
    withInvoiceAndMerchant(
      baseInvoice,
      new MerchantBuilder()
        .withName("Mega Image Supermarket International Premium Gold Deluxe Extra — Downtown Central Branch Nr. 42")
        .withAddress("Bulevardul Decebal Nr. 123, Bloc A4, Scara 2, Etaj 1, Apartament 42, Sector 3, Bucharest, 030167, Romania")
        .build(),
    ),
  ],
};
