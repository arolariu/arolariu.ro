import {DialogProvider} from "@/app/domains/invoices/_contexts/DialogContext";
import type {Meta, StoryObj} from "@storybook/react";
import MetadataTab from "./MetadataTab";

type StoryArgs = {metadata: Record<string, string>};

/**
 * MetadataTab displays key-value metadata pairs for an invoice with
 * add, edit, and delete capabilities. Depends on `useDialog`.
 */
const meta = {
  title: "arolariu.ro/IMS/Tabs/Invoice/MetadataTab",
  component: MetadataTab,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "Displays custom metadata key-value pairs for an invoice in responsive card grid layout. "
          + "Edit and delete action buttons are currently disabled. Add action may be available. "
          + "Shows empty state when no metadata exists. Mounted with real component wrapped in DialogProvider decorator.",
      },
    },
  },
  argTypes: {
    metadata: {control: "object"},
  },
  args: {
    metadata: {
      store_id: "KFL-2024-BUC",
      receipt_number: "INV-2024-001234",
      cashier: "Station 3",
      loyalty_points: "150",
      payment_method: "VISA-4242",
    },
  },
  decorators: [
    (Story) => (
      <DialogProvider>
        <div style={{minWidth: "600px"}}>
          <Story />
        </div>
      </DialogProvider>
    ),
  ],
} satisfies Meta<StoryArgs>;

export default meta;
type Story = StoryObj<StoryArgs>;

/** Metadata tab with sample key-value pairs. */
export const WithMetadata: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "Metadata tab populated with five sample key-value pairs including store ID, receipt number, cashier, "
          + "loyalty points, and payment method. Demonstrates card grid layout with disabled action buttons for each entry.",
      },
    },
  },
};

/** Empty metadata tab showing empty state. */
export const Empty: Story = {
  parameters: {
    docs: {
      description: {
        story: "Empty state when no metadata exists for the invoice. Shows placeholder message and add button.",
      },
    },
  },
  args: {
    metadata: {},
  },
};

/** Metadata tab with just two entries to test minimal content rendering. */
export const FewEntries: Story = {
  args: {
    metadata: {
      invoice_type: "Receipt",
      tax_id: "RO12345678",
    },
  },
};

/** Metadata tab with many entries to test grid layout and scrolling behavior. */
export const ManyEntries: Story = {
  args: {
    metadata: {
      store_id: "KFL-2024-BUC",
      receipt_number: "INV-2024-001234",
      cashier: "Station 3",
      loyalty_points: "150",
      payment_method: "VISA-4242",
      transaction_id: "TXN-20240618-ABC123",
      register_number: "POS-07",
      shift_id: "SHIFT-MORNING-01",
      employee_id: "EMP-9876",
      tax_rate: "19%",
      discount_code: "SUMMER2024",
      customer_group: "Premium",
    },
  },
};

/** Metadata tab with very long key and value strings to test text wrapping and ellipsis. */
export const LongKeysAndValues: Story = {
  args: {
    metadata: {
      very_long_metadata_key_name_that_tests_wrapping_behavior:
        "This is an extremely long metadata value string that should test the component's ability to handle text wrapping, truncation, or overflow scenarios in the UI layout without breaking the design system constraints",
      promotional_campaign_identifier: "MEGA_SUPER_SUMMER_SALE_2024_LOYALTY_REWARDS_CAMPAIGN_EXTENDED_EDITION",
      short: "ok",
    },
  },
};

/** Metadata tab with special characters and Unicode to test encoding and display handling. */
export const SpecialCharacters: Story = {
  args: {
    metadata: {
      customer_note: "Preț special: 50% reducere! ✓",
      location: "București, Sector 1, Str. Universității Nr. 13",
      tags: "#promoție #vară2024 @client-premium",
      email: "customer@exemplu.ro",
      symbols: "€ $ £ ¥ © ® ™ • ← → ↑ ↓",
    },
  },
};

/** Metadata tab with numeric values, dates, and mixed data types as strings. */
export const MixedDataTypes: Story = {
  args: {
    metadata: {
      total_items: "42",
      invoice_date: "2024-06-18T22:49:56+03:00",
      expiry_date: "2024-12-31",
      discount_percent: "15.5",
      vat_included: "true",
      reference_url: "https://merchant.example.com/invoice/123456",
    },
  },
};
