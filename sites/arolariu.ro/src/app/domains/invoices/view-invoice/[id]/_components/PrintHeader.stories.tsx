import type {Meta, StoryObj} from "@storybook/react";
import {generateRandomInvoice, generateRandomMerchant} from "@/data/mocks";
import {InvoiceCategory} from "@/types/invoices";
import {PrintHeader} from "./PrintHeader";

/**
 * Print header component - only visible when printing.
 *
 * **Component Description:**
 * Displays invoice summary information at the top of printed pages, including:
 * - Invoice name
 * - Transaction date
 * - Merchant name
 * - Total amount
 * - Item count
 * - Print generation timestamp
 *
 * **Features:**
 * - Clean print-optimized layout
 * - Formatted currency and date displays
 * - Print-only visibility (hidden on screen)
 * - Responsive grid layout for invoice details
 *
 * **Usage:**
 * This component is automatically included in the view-invoice page
 * and appears at the top of the page when the user prints or exports to PDF.
 */
const meta = {
  title: "Invoices/View Invoice/Components/PrintHeader",
  component: PrintHeader,
  parameters: {
    layout: "fullscreen",
    docs: {
      description: {
        component:
          "Print-only header component displaying invoice summary information at the top of printed pages. Includes invoice name, date, merchant, total, and item count with clean formatting optimized for print media.",
      },
    },
  },
  tags: ["autodocs"],
  argTypes: {
    invoice: {
      description: "The invoice data to display in the print header",
      control: false,
    },
    merchant: {
      description: "The merchant associated with the invoice (nullable)",
      control: false,
    },
  },
} satisfies Meta<typeof PrintHeader>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Default print header with complete invoice and merchant data.
 *
 * **Story Description:**
 * Shows a typical print header with all fields populated:
 * invoice name, date, merchant name, total amount, and item count.
 */
export const Default: Story = {
  args: {
    invoice: generateRandomInvoice(),
    merchant: generateRandomMerchant(),
  },
  parameters: {
    docs: {
      description: {
        story: "Default print header with complete invoice and merchant information. Displays all summary fields including date, merchant name, total, and item count.",
      },
    },
  },
};

/**
 * Print header with no merchant information.
 *
 * **Story Description:**
 * Displays the print header when merchant data is unavailable or not linked.
 * Merchant field shows empty.
 */
export const WithoutMerchant: Story = {
  args: {
    invoice: generateRandomInvoice(),
    merchant: null,
  },
  parameters: {
    docs: {
      description: {
        story: "Print header when merchant information is not available. The merchant field is displayed but left empty.",
      },
    },
  },
};

/**
 * Print header for a grocery invoice.
 *
 * **Story Description:**
 * Example of a print header for a grocery store receipt with multiple items.
 */
export const GroceryInvoice: Story = {
  args: {
    invoice: {
      ...generateRandomInvoice(),
      name: "Carrefour Grocery Shopping",
      category: InvoiceCategory.GROCERIES,
      items: Array(15)
        .fill(null)
        .map(() => ({...generateRandomInvoice().items[0]})),
      paymentInformation: {
        ...generateRandomInvoice().paymentInformation,
        totalCostAmount: 245.67,
        currency: {code: "RON", symbol: "RON", name: "Romanian Leu"},
      },
    },
    merchant: {
      ...generateRandomMerchant(),
      name: "Carrefour",
    },
  },
  parameters: {
    docs: {
      description: {
        story: "Print header for a grocery store invoice with 15 items and a total of 245.67 RON.",
      },
    },
  },
};

/**
 * Print header for a restaurant/dining invoice.
 *
 * **Story Description:**
 * Example of a print header for a restaurant receipt with fewer items
 * and a different currency format.
 */
export const RestaurantInvoice: Story = {
  args: {
    invoice: {
      ...generateRandomInvoice(),
      name: "Dinner at La Mama Restaurant",
      category: InvoiceCategory.FAST_FOOD,
      items: Array(5)
        .fill(null)
        .map(() => ({...generateRandomInvoice().items[0]})),
      paymentInformation: {
        ...generateRandomInvoice().paymentInformation,
        totalCostAmount: 128.5,
        currency: {code: "RON", symbol: "lei", name: "Romanian Leu"},
        transactionDate: new Date("2024-06-15T19:30:00"),
      },
    },
    merchant: {
      ...generateRandomMerchant(),
      name: "La Mama Restaurant",
    },
  },
  parameters: {
    docs: {
      description: {
        story: "Print header for a restaurant invoice with 5 items and dinner timestamp. Total amount: 128.50 lei.",
      },
    },
  },
};

/**
 * Print header for a high-value invoice.
 *
 * **Story Description:**
 * Example showing formatting of a large total amount with many items.
 */
export const HighValueInvoice: Story = {
  args: {
    invoice: {
      ...generateRandomInvoice(),
      name: "Electronics Purchase - Laptop & Accessories",
      category: InvoiceCategory.ELECTRONICS,
      items: Array(8)
        .fill(null)
        .map(() => ({...generateRandomInvoice().items[0]})),
      paymentInformation: {
        ...generateRandomInvoice().paymentInformation,
        totalCostAmount: 5499.99,
        currency: {code: "RON", symbol: "RON", name: "Romanian Leu"},
      },
    },
    merchant: {
      ...generateRandomMerchant(),
      name: "eMAG Electronics",
    },
  },
  parameters: {
    docs: {
      description: {
        story: "Print header for a high-value electronics purchase with 8 items and a total of 5,499.99 RON.",
      },
    },
  },
};

/**
 * Print header with long invoice name.
 *
 * **Story Description:**
 * Tests layout with a very long invoice name to ensure proper wrapping/truncation.
 */
export const WithLongName: Story = {
  args: {
    invoice: {
      ...generateRandomInvoice(),
      name: "Monthly Grocery Shopping Including Fresh Produce, Dairy Products, Beverages, Household Cleaning Supplies and Personal Care Items",
      items: Array(20)
        .fill(null)
        .map(() => ({...generateRandomInvoice().items[0]})),
    },
    merchant: generateRandomMerchant(),
  },
  parameters: {
    docs: {
      description: {
        story: "Print header with a very long invoice name to test text wrapping and layout resilience.",
      },
    },
  },
};

/**
 * Print header with single item.
 *
 * **Story Description:**
 * Minimal invoice with just one item purchased.
 */
export const SingleItem: Story = {
  args: {
    invoice: {
      ...generateRandomInvoice(),
      name: "Coffee Purchase",
      items: [generateRandomInvoice().items[0]],
      paymentInformation: {
        ...generateRandomInvoice().paymentInformation,
        totalCostAmount: 12.5,
        currency: {code: "RON", symbol: "lei", name: "Romanian Leu"},
      },
    },
    merchant: {
      ...generateRandomMerchant(),
      name: "Starbucks",
    },
  },
  parameters: {
    docs: {
      description: {
        story: "Print header for a minimal invoice with just one item (coffee for 12.50 lei).",
      },
    },
  },
};
