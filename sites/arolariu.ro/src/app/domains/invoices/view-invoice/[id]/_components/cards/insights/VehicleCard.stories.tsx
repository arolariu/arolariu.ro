import type {Meta, StoryObj} from "@storybook/react";
import {NextIntlClientProvider} from "next-intl";
import messages from "../../../../../../../../../messages/en.json";

/**
 * VehicleCard displays vehicle/fuel-related insights including
 * fuel details, monthly spending charts, cost per km, maintenance
 * reminders, and cheapest nearby station tips.
 * Depends on `useInvoiceContext`.
 *
 * This story renders a static preview of the vehicle card layout.
 */
const meta = {
  title: "Invoices/Insights/VehicleCard",
  tags: ["autodocs"],
  decorators: [
    (Story) => (
      <NextIntlClientProvider
        locale="en"
        messages={messages}
        timeZone="Europe/Bucharest">
        <div className="max-w-md">
          <Story />
        </div>
      </NextIntlClientProvider>
    ),
  ],
  parameters: {
    layout: "centered",
  },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

/** Preview of the vehicle insights card. */
export const Preview: Story = {
  render: () => (
    <div className="rounded-lg border bg-white shadow-sm dark:bg-gray-900">
      <div className="border-b p-4">
        <h3 className="flex items-center gap-2 text-lg font-semibold">🚗 Vehicle &amp; Fuel</h3>
      </div>
      <div className="space-y-4 p-4">
        {/* Expense Type */}
        <div className="flex items-center gap-2 rounded-md bg-amber-50 px-3 py-1.5 dark:bg-amber-900/20">
          <span>⛽</span>
          <span className="text-sm font-medium text-amber-700 dark:text-amber-300">Fuel Purchase</span>
        </div>

        {/* Fuel Details Grid */}
        <div className="grid grid-cols-2 gap-3">
          {[
            {icon: "⛽", label: "Liters", value: "~45L"},
            {icon: "💰", label: "Price / Liter", value: "6.70 RON"},
            {icon: "📍", label: "Station", value: "Petrom"},
            {icon: "🚗", label: "Vehicle", value: "Not set", muted: true},
          ].map((detail) => (
            <div
              key={detail.label}
              className="flex items-center gap-2 rounded-md border p-2 dark:border-gray-700">
              <span>{detail.icon}</span>
              <div>
                <p className="text-xs text-gray-500">{detail.label}</p>
                <p className={`text-sm font-medium ${detail.muted ? "text-gray-400" : ""}`}>{detail.value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-md border p-2 text-center dark:border-gray-700">
            <span className="text-xs text-gray-500">This Month</span>
            <p className="text-sm font-bold">560 RON</p>
            <span className="text-xs text-gray-400">3 fill-ups</span>
          </div>
          <div className="rounded-md border p-2 text-center dark:border-gray-700">
            <span className="text-xs text-gray-500">Cost / km</span>
            <p className="text-sm font-bold">0.52 RON</p>
            <span className="text-xs text-gray-400">Estimated</span>
          </div>
          <div className="rounded-md border p-2 text-center dark:border-gray-700">
            <span className="text-xs text-gray-500">Fuel Price</span>
            <p className="text-sm font-bold text-red-500">+8%</p>
            <span className="text-xs text-gray-400">This month</span>
          </div>
        </div>

        {/* Maintenance Reminders */}
        <div>
          <p className="mb-1 flex items-center gap-1 text-xs font-semibold text-gray-500">🛢️ Maintenance</p>
          <ul className="space-y-1 text-xs text-gray-600 dark:text-gray-400">
            <li>• Oil change due in 2,000 km</li>
            <li>• Tire rotation recommended</li>
          </ul>
        </div>

        {/* Tip */}
        <div className="flex gap-2 rounded-md bg-green-50 p-3 dark:bg-green-900/20">
          <span>💡</span>
          <div>
            <p className="text-sm font-medium">Cheapest Nearby</p>
            <p className="text-xs text-gray-600 dark:text-gray-400">MOL Drumul Taberei - 6.55 RON/L</p>
          </div>
        </div>

        {/* CTA */}
        <div className="flex gap-2">
          <button
            type="button"
            className="flex-1 rounded border px-3 py-1.5 text-sm dark:border-gray-700">
            Add Vehicle
          </button>
          <button
            type="button"
            className="flex-1 rounded border px-3 py-1.5 text-sm dark:border-gray-700">
            Full Report
          </button>
        </div>
      </div>
    </div>
  ),
};

/** Dark mode variant. */
export const DarkMode: Story = {
  render: Preview.render,
  parameters: {
    themes: {themeOverride: "dark"},
  },
};

/** Mobile viewport variant. */
export const MobileViewport: Story = {
  render: Preview.render,
  parameters: {
    viewport: {defaultViewport: "mobile1"},
  },
};
