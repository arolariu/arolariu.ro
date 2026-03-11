import type {Meta, StoryObj} from "@storybook/react";
import {NextIntlClientProvider} from "next-intl";
import messages from "../../../../../../../messages/en.json";
import RenderStatisticsView from "./StatisticsView";

/**
 * StatisticsView renders the statistics overview for the invoice
 * management system. Displays a header with title and subtitle.
 * Uses the `Invoices.ViewInvoices.statisticsView` i18n namespace.
 */
const meta = {
  title: "Invoices/Views/StatisticsView",
  component: RenderStatisticsView,
  tags: ["autodocs"],
  decorators: [
    (Story) => (
      <NextIntlClientProvider
        locale="en"
        messages={messages}
        timeZone="Europe/Bucharest">
        <Story />
      </NextIntlClientProvider>
    ),
  ],
  parameters: {
    layout: "fullscreen",
  },
} satisfies Meta<typeof RenderStatisticsView>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Default statistics view with empty invoices list. */
export const Default: Story = {
  args: {
    invoices: [],
  },
};

/** Dark mode variant. */
export const DarkMode: Story = {
  args: {
    invoices: [],
  },
  parameters: {
    themes: {themeOverride: "dark"},
  },
};

/** Mobile viewport variant. */
export const MobileViewport: Story = {
  args: {
    invoices: [],
  },
  parameters: {
    viewport: {defaultViewport: "mobile1"},
  },
};
