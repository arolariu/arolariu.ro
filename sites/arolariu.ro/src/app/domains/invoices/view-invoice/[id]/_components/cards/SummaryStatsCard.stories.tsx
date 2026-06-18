import type {Meta, StoryObj} from "@storybook/react";
import {SummaryStatsCard} from "./SummaryStatsCard";

/**
 * SummaryStatsCard displays key statistics for an invoice including total items,
 * categories, average price, tax rate, and extreme price items.
 */
const meta = {
  title: "arolariu.ro/IMS/Cards/Invoice/SummaryStats",
  component: SummaryStatsCard,
  parameters: {
    layout: "centered",
  },
} satisfies Meta<typeof SummaryStatsCard>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Default summary stats with typical grocery invoice data. */
export const Default: Story = {
  args: {
    currency: "USD",
    summary: {
      totalItems: 12,
      uniqueCategories: 4,
      averageItemPrice: 8.75,
      totalAmount: 105.0,
      taxPercentage: 19.0,
      taxAmount: 15.5,
      highestItem: {name: "Fresh Salmon Fillet", price: 24.99},
      lowestItem: {name: "Baguette", price: 1.2},
    },
  },
};

/** Small invoice with few items. */
export const SmallInvoice: Story = {
  args: {
    currency: "EUR",
    summary: {
      totalItems: 3,
      uniqueCategories: 2,
      averageItemPrice: 4.33,
      totalAmount: 13.0,
      taxPercentage: 9.0,
      taxAmount: 1.17,
      highestItem: {name: "Organic Milk", price: 5.99},
      lowestItem: {name: "Bread Roll", price: 0.89},
    },
  },
};

/** Large invoice with many items and high tax. */
export const LargeInvoice: Story = {
  args: {
    currency: "RON",
    summary: {
      totalItems: 45,
      uniqueCategories: 8,
      averageItemPrice: 22.5,
      totalAmount: 1012.5,
      taxPercentage: 24.0,
      taxAmount: 195.0,
      highestItem: {name: "Premium Olive Oil 1L", price: 89.99},
      lowestItem: {name: "Salt 500g", price: 2.49},
    },
  },
};

/** Edge case — invoice with zero items. */
export const ZeroItems: Story = {
  args: {
    currency: "USD",
    summary: {
      totalItems: 0,
      uniqueCategories: 0,
      averageItemPrice: 0,
      totalAmount: 0,
      taxPercentage: 0,
      taxAmount: 0,
      highestItem: {name: "N/A", price: 0},
      lowestItem: {name: "N/A", price: 0},
    },
  },
};

/** Very large invoice — stress test. */
export const VeryLargeInvoice: Story = {
  args: {
    currency: "USD",
    summary: {
      totalItems: 250,
      uniqueCategories: 15,
      averageItemPrice: 45.75,
      totalAmount: 11437.5,
      taxPercentage: 19.0,
      taxAmount: 2173.13,
      highestItem: {name: "Premium Electronics Bundle", price: 899.99},
      lowestItem: {name: "Plastic Bag", price: 0.1},
    },
  },
};

/** Single item invoice. */
export const SingleItem: Story = {
  args: {
    currency: "EUR",
    summary: {
      totalItems: 1,
      uniqueCategories: 1,
      averageItemPrice: 15.99,
      totalAmount: 15.99,
      taxPercentage: 9.0,
      taxAmount: 1.44,
      highestItem: {name: "Coffee Beans 500g", price: 15.99},
      lowestItem: {name: "Coffee Beans 500g", price: 15.99},
    },
  },
};

/** Invoice with very long item names. */
export const LongItemNames: Story = {
  args: {
    currency: "RON",
    summary: {
      totalItems: 3,
      uniqueCategories: 2,
      averageItemPrice: 35.0,
      totalAmount: 105.0,
      taxPercentage: 19.0,
      taxAmount: 19.95,
      highestItem: {
        name: "Extra Virgin Organic Cold-Pressed Mediterranean Olive Oil First Harvest Limited Edition Premium Quality 1L",
        price: 75.0,
      },
      lowestItem: {name: "Sea Salt 250g", price: 5.0},
    },
  },
};

/** High tax rate — 24%. */
export const HighTaxRate: Story = {
  args: {
    currency: "RON",
    summary: {
      totalItems: 8,
      uniqueCategories: 3,
      averageItemPrice: 18.75,
      totalAmount: 150.0,
      taxPercentage: 24.0,
      taxAmount: 36.0,
      highestItem: {name: "Premium Wine", price: 45.0},
      lowestItem: {name: "Bread", price: 3.5},
    },
  },
  parameters: {
    docs: {
      description: {
        story: "Invoice with high tax rate (24%) to test tax percentage display.",
      },
    },
  },
};

/** Low tax rate — 5%. */
export const LowTaxRate: Story = {
  args: {
    currency: "EUR",
    summary: {
      totalItems: 6,
      uniqueCategories: 2,
      averageItemPrice: 12.5,
      totalAmount: 75.0,
      taxPercentage: 5.0,
      taxAmount: 3.75,
      highestItem: {name: "Book", price: 25.0},
      lowestItem: {name: "Pen", price: 2.0},
    },
  },
  parameters: {
    docs: {
      description: {
        story: "Invoice with low tax rate (5%) to test minimal tax display.",
      },
    },
  },
};

/** GBP currency variant. */
export const GbpCurrency: Story = {
  args: {
    currency: "GBP",
    summary: {
      totalItems: 15,
      uniqueCategories: 5,
      averageItemPrice: 9.99,
      totalAmount: 149.85,
      taxPercentage: 20.0,
      taxAmount: 29.97,
      highestItem: {name: "Premium Cheese", price: 28.99},
      lowestItem: {name: "Biscuits", price: 1.5},
    },
  },
  parameters: {
    docs: {
      description: {
        story: "Summary stats in GBP currency to verify British pound formatting.",
      },
    },
  },
};

/** USD currency variant. */
export const UsdCurrency: Story = {
  args: {
    currency: "USD",
    summary: {
      totalItems: 20,
      uniqueCategories: 6,
      averageItemPrice: 15.5,
      totalAmount: 310.0,
      taxPercentage: 8.5,
      taxAmount: 26.35,
      highestItem: {name: "Organic Beef", price: 45.0},
      lowestItem: {name: "Garlic", price: 0.99},
    },
  },
  parameters: {
    docs: {
      description: {
        story: "Summary stats in USD currency to verify dollar formatting.",
      },
    },
  },
};

/** Two items only — minimal invoice. */
export const TwoItems: Story = {
  args: {
    currency: "RON",
    summary: {
      totalItems: 2,
      uniqueCategories: 2,
      averageItemPrice: 7.5,
      totalAmount: 15.0,
      taxPercentage: 9.0,
      taxAmount: 1.35,
      highestItem: {name: "Cheese", price: 10.0},
      lowestItem: {name: "Bread", price: 5.0},
    },
  },
  parameters: {
    docs: {
      description: {
        story: "Summary stats for an invoice with only two items.",
      },
    },
  },
};

/** High average price — premium products. */
export const PremiumProducts: Story = {
  args: {
    currency: "EUR",
    summary: {
      totalItems: 5,
      uniqueCategories: 3,
      averageItemPrice: 125.0,
      totalAmount: 625.0,
      taxPercentage: 19.0,
      taxAmount: 118.75,
      highestItem: {name: "Champagne Dom Pérignon", price: 200.0},
      lowestItem: {name: "Truffle Salt", price: 45.0},
    },
  },
  parameters: {
    docs: {
      description: {
        story: "Summary stats for premium products with high average item price (€125).",
      },
    },
  },
};
