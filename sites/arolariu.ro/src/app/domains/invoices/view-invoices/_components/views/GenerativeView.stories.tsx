import {generateRandomInvoices} from "@/data/mocks";
import type {Meta, StoryObj} from "@storybook/react";
import {faker} from "@faker-js/faker";
import RenderGenerativeView from "./GenerativeView";

faker.seed(42);

/**
 * GenerativeView renders the AI chat interface for invoice analysis.
 * Accepts `{invoices: ReadonlyArray<Invoice>}` and uses `useTranslations`.
 */
const meta = {
  title: "Invoices/Views/GenerativeView",
  component: RenderGenerativeView,
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
} satisfies Meta<typeof RenderGenerativeView>;

export default meta;
type Story = StoryObj<typeof meta>;

const mockInvoices = generateRandomInvoices(3);

/** Default generative view with mock invoices and welcome message. */
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

/** Empty invoices state. */
export const EmptyInvoices: Story = {
  args: {
    invoices: [],
  },
};
