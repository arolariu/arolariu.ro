import {
  WithViewInvoiceContext,
  invoicePresets,
  resetInvoiceStoryStores,
  seedInvoiceStoryStores,
  storyInvoice,
  storyOnlineInvoice,
  storyPublicInvoice,
  withEntityPreset,
} from "@/app/domains/invoices/_storybook";
import type {Invoice} from "@/types/invoices";
import {InvoiceCategory} from "@/types/invoices";
import type {Meta, StoryObj} from "@storybook/react";
import {RelatedInvoicesCard} from "./RelatedInvoicesCard";

type StoryArgs = {invoice: Invoice; invoicePreset: "standard" | "public"};

const meta = {
  title: "arolariu.ro/IMS/Cards/Invoice/RelatedInvoices",
  component: RelatedInvoicesCard,
  tags: ["!autodocs"],
  parameters: {
    layout: "padded",
    docs: {
      disable: true,
      description: {
        component:
          "Horizontal carousel card displaying related invoices based on merchant, category, or amount similarity. **Note:** These stories seed global invoice store state and are intended for isolated canvas viewing to prevent cross-story contamination.",
      },
    },
  },
  argTypes: {
    invoicePreset: {control: "select", options: ["standard", "public"]},
    invoice: {control: "object"},
  },
  args: {invoicePreset: "standard", invoice: storyInvoice},
  decorators: [withEntityPreset("invoicePreset", "invoice", invoicePresets)],
} satisfies Meta<StoryArgs>;

export default meta;
type Story = StoryObj<StoryArgs>;

export const NoRelated: Story = {
  render: ({invoice}) => {
    resetInvoiceStoryStores();
    seedInvoiceStoryStores({invoices: [invoice]});
    return (
      <WithViewInvoiceContext invoice={invoice}>
        <RelatedInvoicesCard />
      </WithViewInvoiceContext>
    );
  },
  parameters: {docs: {description: {story: "No related invoices found - component returns null (only current invoice in store)."}}},
};

export const SameMerchant: Story = {
  render: () => {
    const merchantId = "merchant-123";
    const currentInvoice = {...storyInvoice, merchantReference: merchantId, name: "Current Invoice"};
    const related1 = {...storyPublicInvoice, merchantReference: merchantId, name: "Related Invoice 1"};
    const related2 = {...storyOnlineInvoice, merchantReference: merchantId, name: "Related Invoice 2"};
    resetInvoiceStoryStores();
    seedInvoiceStoryStores({invoices: [currentInvoice, related1, related2]});
    return (
      <WithViewInvoiceContext invoice={currentInvoice}>
        <RelatedInvoicesCard />
      </WithViewInvoiceContext>
    );
  },
  parameters: {
    docs: {description: {story: "Carousel displaying 2 related invoices from the same merchant (current invoice filtered out)."}},
  },
};

export const SameCategory: Story = {
  render: () => {
    const currentInvoice = {...storyInvoice, category: InvoiceCategory.GROCERY, name: "Current Grocery Invoice"};
    const related1 = {
      ...storyPublicInvoice,
      category: InvoiceCategory.GROCERY,
      merchantReference: "merchant-diff-1",
      name: "Grocery Invoice 1",
    };
    const related2 = {
      ...storyOnlineInvoice,
      category: InvoiceCategory.GROCERY,
      merchantReference: "merchant-diff-2",
      name: "Grocery Invoice 2",
    };
    resetInvoiceStoryStores();
    seedInvoiceStoryStores({invoices: [currentInvoice, related1, related2]});
    return (
      <WithViewInvoiceContext invoice={currentInvoice}>
        <RelatedInvoicesCard />
      </WithViewInvoiceContext>
    );
  },
  parameters: {
    docs: {description: {story: "Carousel displaying 2 related invoices with the same category (current invoice filtered out)."}},
  },
};

export const MixedRelationships: Story = {
  render: () => {
    const merchantId = "merchant-xyz";
    const currentInvoice = {
      ...storyInvoice,
      merchantReference: merchantId,
      category: InvoiceCategory.GROCERY,
      paymentInformation: {...storyInvoice.paymentInformation, totalCostAmount: 150.0},
      name: "Current Invoice",
    };
    const sameMerchant = {
      ...storyPublicInvoice,
      merchantReference: merchantId,
      category: InvoiceCategory.NOT_DEFINED,
      name: "Same Merchant",
    };
    const sameCategory = {
      ...storyOnlineInvoice,
      merchantReference: "different-merchant",
      category: InvoiceCategory.GROCERY,
      name: "Same Category",
    };
    resetInvoiceStoryStores();
    seedInvoiceStoryStores({invoices: [currentInvoice, sameMerchant, sameCategory]});
    return (
      <WithViewInvoiceContext invoice={currentInvoice}>
        <RelatedInvoicesCard />
      </WithViewInvoiceContext>
    );
  },
  parameters: {
    docs: {description: {story: "Displays 2 related invoices: one by same merchant (priority 1), one by same category (priority 2)."}},
  },
};

/** Many related invoices — overflow/carousel test. */
export const ManyRelated: Story = {
  render: () => {
    const merchantId = "merchant-abc";
    const currentInvoice = {...storyInvoice, merchantReference: merchantId, name: "Current"};
    const relatedInvoices = Array.from({length: 10}, (_, i) => ({
      ...storyPublicInvoice,
      id: `related-${i}`,
      merchantReference: merchantId,
      name: `Related Invoice ${i + 1}`,
    }));
    resetInvoiceStoryStores();
    seedInvoiceStoryStores({invoices: [currentInvoice, ...relatedInvoices]});
    return (
      <WithViewInvoiceContext invoice={currentInvoice}>
        <RelatedInvoicesCard />
      </WithViewInvoiceContext>
    );
  },
  parameters: {
    docs: {
      description: {
        story: "Carousel with 10 related invoices from the same merchant to verify horizontal scrolling and overflow handling.",
      },
    },
  },
};

/** Single related invoice only. */
export const SingleRelated: Story = {
  render: () => {
    const merchantId = "merchant-single";
    const currentInvoice = {...storyInvoice, merchantReference: merchantId, name: "Current Invoice"};
    const relatedInvoice = {...storyPublicInvoice, merchantReference: merchantId, name: "Related Invoice"};
    resetInvoiceStoryStores();
    seedInvoiceStoryStores({invoices: [currentInvoice, relatedInvoice]});
    return (
      <WithViewInvoiceContext invoice={currentInvoice}>
        <RelatedInvoicesCard />
      </WithViewInvoiceContext>
    );
  },
  parameters: {
    docs: {description: {story: "Card displaying a single related invoice (carousel with one item)."}},
  },
};

/** Related by similar amount. */
export const SimilarAmount: Story = {
  render: () => {
    const currentInvoice = {
      ...storyInvoice,
      paymentInformation: {...storyInvoice.paymentInformation, totalCostAmount: 100.0},
      name: "Current Invoice",
    };
    const related1 = {
      ...storyPublicInvoice,
      paymentInformation: {...storyPublicInvoice.paymentInformation, totalCostAmount: 95.0},
      merchantReference: "merchant-diff-1",
      category: 300 as typeof storyPublicInvoice.category,
      name: "Similar Amount Invoice 1",
    };
    const related2 = {
      ...storyOnlineInvoice,
      paymentInformation: {...storyOnlineInvoice.paymentInformation, totalCostAmount: 105.0},
      merchantReference: "merchant-diff-2",
      category: 400 as typeof storyOnlineInvoice.category,
      name: "Similar Amount Invoice 2",
    };
    resetInvoiceStoryStores();
    seedInvoiceStoryStores({invoices: [currentInvoice, related1, related2]});
    return (
      <WithViewInvoiceContext invoice={currentInvoice}>
        <RelatedInvoicesCard />
      </WithViewInvoiceContext>
    );
  },
  parameters: {
    docs: {description: {story: "Invoices related by similar total amounts (within tolerance)."}},
  },
};

/** Related by date proximity. */
export const DateProximity: Story = {
  render: () => {
    const baseDate = new Date("2024-03-15T10:00:00.000Z");
    const currentInvoice = {
      ...storyInvoice,
      paymentInformation: {...storyInvoice.paymentInformation, transactionDate: baseDate},
      name: "Current Invoice",
    };
    const related1 = {
      ...storyPublicInvoice,
      paymentInformation: {...storyPublicInvoice.paymentInformation, transactionDate: new Date("2024-03-14T10:00:00.000Z")},
      merchantReference: "merchant-diff-1",
      category: 300 as typeof storyPublicInvoice.category,
      name: "Previous Day Invoice",
    };
    const related2 = {
      ...storyOnlineInvoice,
      paymentInformation: {...storyOnlineInvoice.paymentInformation, transactionDate: new Date("2024-03-16T10:00:00.000Z")},
      merchantReference: "merchant-diff-2",
      category: 400 as typeof storyOnlineInvoice.category,
      name: "Next Day Invoice",
    };
    resetInvoiceStoryStores();
    seedInvoiceStoryStores({invoices: [currentInvoice, related1, related2]});
    return (
      <WithViewInvoiceContext invoice={currentInvoice}>
        <RelatedInvoicesCard />
      </WithViewInvoiceContext>
    );
  },
  parameters: {
    docs: {description: {story: "Invoices related by date proximity (within 1-2 days)."}},
  },
};

/** Three related invoices — mid-size carousel. */
export const ThreeRelated: Story = {
  render: () => {
    const merchantId = "merchant-three";
    const currentInvoice = {...storyInvoice, merchantReference: merchantId, name: "Current"};
    const related1 = {...storyPublicInvoice, merchantReference: merchantId, id: "related-1", name: "Related 1"};
    const related2 = {...storyOnlineInvoice, merchantReference: merchantId, id: "related-2", name: "Related 2"};
    const related3 = {...storyInvoice, merchantReference: merchantId, id: "related-3", name: "Related 3"};
    resetInvoiceStoryStores();
    seedInvoiceStoryStores({invoices: [currentInvoice, related1, related2, related3]});
    return (
      <WithViewInvoiceContext invoice={currentInvoice}>
        <RelatedInvoicesCard />
      </WithViewInvoiceContext>
    );
  },
  parameters: {
    docs: {description: {story: "Carousel with exactly three related invoices."}},
  },
};

/** Five related invoices — mid-range carousel. */
export const FiveRelated: Story = {
  render: () => {
    const merchantId = "merchant-five";
    const currentInvoice = {...storyInvoice, merchantReference: merchantId, name: "Current"};
    const relatedInvoices = Array.from({length: 5}, (_, i) => ({
      ...storyPublicInvoice,
      id: `related-${i}`,
      merchantReference: merchantId,
      name: `Related ${i + 1}`,
    }));
    resetInvoiceStoryStores();
    seedInvoiceStoryStores({invoices: [currentInvoice, ...relatedInvoices]});
    return (
      <WithViewInvoiceContext invoice={currentInvoice}>
        <RelatedInvoicesCard />
      </WithViewInvoiceContext>
    );
  },
  parameters: {
    docs: {description: {story: "Carousel with five related invoices to test mid-range scrolling."}},
  },
};
