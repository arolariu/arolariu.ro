import {generateRandomInvoices} from "@/data/mocks";
import type {Meta, StoryObj} from "@storybook/react";
import {faker} from "@faker-js/faker";
import RenderInvoicesView from "./InvoicesView";

faker.seed(42);

/**
 * InvoicesView displays a list of invoices with search, filter, and
 * pagination functionality. Supports table and grid view modes.
 * Uses `usePaginationWithSearch`, `useWindowSize`, and `useTranslations`.
 */
const meta = {
  title: "Invoices/Views/InvoicesView",
  component: RenderInvoicesView,
  parameters: {
    layout: "fullscreen",
  },
  decorators: [
    (Story) => (
      <div className='p-6'>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof RenderInvoicesView>;

export default meta;
type Story = StoryObj<typeof meta>;

const mockInvoices = generateRandomInvoices(5);

/** Default invoices view with mock data. */
export const Default: Story = {
  args: {
    invoices: mockInvoices,
  },
};

/** Dark mode variant. */
export const DarkMode: Story = {
  args: {
    invoices: mockInvoices,
  },
  parameters: {
    themes: {themeOverride: "dark"},
  },
};

/** Empty state with no invoices. */
export const EmptyState: Story = {
  args: {
    invoices: [],
  },
};

/** Mobile viewport variant. */
export const MobileViewport: Story = {
  args: {
    invoices: mockInvoices,
  },
  parameters: {
    viewport: {defaultViewport: "mobile1"},
  },
};
