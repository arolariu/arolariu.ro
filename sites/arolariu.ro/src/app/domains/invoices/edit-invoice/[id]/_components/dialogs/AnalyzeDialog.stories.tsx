import type {Meta, StoryObj} from "@storybook/react";
import {TbBolt, TbBrain, TbBuildingStore, TbCheck, TbChartBar, TbClock, TbReceipt, TbScanEye, TbShoppingCart, TbSparkles} from "react-icons/tb";

/**
 * Static visual preview of the AnalyzeDialog component.
 *
 * The actual component depends on `useDialog` context and server actions,
 * so this story renders a faithful HTML replica of the dialog content
 * including analysis options, enhancements, and summary.
 */
const meta = {
  title: "Invoices/EditInvoice/Dialogs/AnalyzeDialog",
  parameters: {
    layout: "centered",
  },
  decorators: [
    (Story) => (
      <div className='max-w-3xl p-4'>
        <Story />
      </div>
    ),
  ],
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

/** Default dialog content with analysis options. */
export const Default: Story = {
  render: () => (
    <div className='rounded-xl border bg-white shadow-xl dark:border-gray-700 dark:bg-gray-900'>
      {/* Header */}
      <div className='border-b p-6'>
        <h2 className='flex items-center gap-2 text-lg font-semibold'>
          <TbScanEye className='h-6 w-6 text-purple-500' />
          Analyze Invoice
        </h2>
        <p className='mt-1 text-sm text-gray-500'>
          Choose analysis type for invoice <code className='rounded bg-gray-100 px-1 text-xs dark:bg-gray-800'>a1b2c3d4</code>...
        </p>
      </div>

      {/* Options Grid */}
      <div className='space-y-4 p-6'>
        <p className='text-sm font-medium'>Analysis Type</p>
        <div className='grid grid-cols-2 gap-3'>
          {[
            {icon: <TbBrain className='h-6 w-6' />, title: "Complete Analysis", time: "~30 sec", recommended: true, selected: true},
            {icon: <TbReceipt className='h-6 w-6' />, title: "Invoice Only", time: "~10 sec", recommended: false, selected: false},
            {icon: <TbShoppingCart className='h-6 w-6' />, title: "Items Only", time: "~15 sec", recommended: false, selected: false},
            {icon: <TbBuildingStore className='h-6 w-6' />, title: "Merchant Only", time: "~8 sec", recommended: false, selected: false},
          ].map((opt) => (
            <div
              key={opt.title}
              className={`cursor-pointer rounded-lg border-2 p-4 transition-all ${
                opt.selected ? "border-purple-500 bg-purple-50 dark:bg-purple-900/20" : "border-gray-200 dark:border-gray-700"
              }`}>
              <div className='flex items-start justify-between'>
                <div className={opt.selected ? "text-purple-600" : "text-gray-400"}>{opt.icon}</div>
                <div className='flex items-center gap-1'>
                  {opt.recommended && (
                    <span className='rounded-full bg-purple-100 px-2 py-0.5 text-xs text-purple-700 dark:bg-purple-900/50 dark:text-purple-300'>
                      Recommended
                    </span>
                  )}
                  {opt.selected && <TbCheck className='h-5 w-5 text-purple-500' />}
                </div>
              </div>
              <h4 className='mt-2 font-semibold'>{opt.title}</h4>
              <div className='mt-1 flex items-center gap-1 text-xs text-gray-500'>
                <TbClock className='h-3 w-3' />
                <span>{opt.time}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Features */}
        <div>
          <p className='mb-2 text-sm font-medium'>Included Features</p>
          <div className='flex flex-wrap gap-2'>
            {["OCR Extraction", "Item Categorization", "Merchant ID", "Price Analysis", "Receipt Validation"].map((f) => (
              <span
                key={f}
                className='flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs'>
                <TbCheck className='h-3 w-3 text-green-500' />
                {f}
              </span>
            ))}
          </div>
        </div>

        <hr className='dark:border-gray-700' />

        {/* Enhancements */}
        <div>
          <p className='mb-2 text-sm font-medium'>Enhancements (Optional)</p>
          <div className='space-y-2'>
            {[
              {icon: <TbChartBar className='h-4 w-4' />, label: "Price Comparison", desc: "Compare prices across merchants"},
              {icon: <TbSparkles className='h-4 w-4' />, label: "Savings Tips", desc: "Get personalized saving recommendations"},
              {icon: <TbBolt className='h-4 w-4' />, label: "Quick Extract", desc: "Prioritize speed over detail"},
            ].map((e) => (
              <div
                key={e.label}
                className='flex items-center gap-3'>
                <input
                  type='checkbox'
                  className='h-4 w-4 rounded border'
                  readOnly
                />
                <div className='flex items-center gap-2'>
                  {e.icon}
                  <div>
                    <p className='text-sm font-medium'>{e.label}</p>
                    <p className='text-xs text-gray-500'>{e.desc}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className='flex justify-end gap-2 border-t p-4'>
        <button className='rounded-md border px-4 py-2 text-sm'>Cancel</button>
        <button className='flex items-center gap-2 rounded-md bg-purple-600 px-4 py-2 text-sm text-white hover:bg-purple-700'>
          <TbScanEye className='h-4 w-4' />
          Start Analysis
        </button>
      </div>
    </div>
  ),
};

/** Dark mode variant. */
export const DarkMode: Story = {
  ...Default,
  parameters: {
    themes: {themeOverride: "dark"},
  },
};
