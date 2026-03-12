import type {Meta, StoryObj} from "@storybook/react";
import {
  TbAlertTriangle,
  TbAnalyze,
  TbFileInvoice,
  TbMessage,
  TbPhoto,
  TbReceipt,
  TbShare,
  TbShoppingCart,
  TbToolsKitchen3,
  TbTrash,
} from "react-icons/tb";

/**
 * Static visual preview of the DialogContainer component.
 *
 * @remarks Static preview — component transitively imports "use server" actions
 * via DeleteInvoiceDialog (deleteInvoice), ShareInvoiceDialog (patchInvoice),
 * AddScanDialog (attachInvoiceScan/createInvoiceScan), AnalyzeDialog (analyzeInvoice),
 * and RemoveScanDialog (deleteInvoiceScan) that cannot be bundled by Storybook's
 * Vite/Rollup. This story shows a schematic overview of all dialog types
 * the container can render.
 */
const meta = {
  title: "Invoices/Dialogs/DialogContainer",
  component: undefined as never,
  parameters: {
    layout: "centered",
  },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

const dialogTypes = [
  {icon: <TbAnalyze className='h-5 w-5' />, type: "EDIT_INVOICE__ANALYSIS", label: "Analyze Invoice", color: "text-purple-500"},
  {icon: <TbShoppingCart className='h-5 w-5' />, type: "EDIT_INVOICE__ITEMS", label: "Edit Items", color: "text-blue-500"},
  {icon: <TbMessage className='h-5 w-5' />, type: "EDIT_INVOICE__FEEDBACK", label: "Feedback", color: "text-green-500"},
  {icon: <TbReceipt className='h-5 w-5' />, type: "EDIT_INVOICE__MERCHANT", label: "Merchant Details", color: "text-orange-500"},
  {icon: <TbReceipt className='h-5 w-5' />, type: "EDIT_INVOICE__MERCHANT_INVOICES", label: "Merchant Receipts", color: "text-amber-500"},
  {icon: <TbFileInvoice className='h-5 w-5' />, type: "EDIT_INVOICE__METADATA", label: "Metadata", color: "text-cyan-500"},
  {icon: <TbPhoto className='h-5 w-5' />, type: "EDIT_INVOICE__IMAGE", label: "Image View", color: "text-indigo-500"},
  {icon: <TbPhoto className='h-5 w-5' />, type: "EDIT_INVOICE__SCAN", label: "Add/Remove Scan", color: "text-teal-500"},
  {icon: <TbToolsKitchen3 className='h-5 w-5' />, type: "EDIT_INVOICE__RECIPE", label: "Recipe", color: "text-rose-500"},
  {icon: <TbShare className='h-5 w-5' />, type: "VIEW_INVOICE__SHARE_ANALYTICS", label: "Share Analytics", color: "text-violet-500"},
  {icon: <TbFileInvoice className='h-5 w-5' />, type: "VIEW_SCANS__CREATE_INVOICE", label: "Create Invoice", color: "text-fuchsia-500"},
  {icon: <TbTrash className='h-5 w-5' />, type: "SHARED__INVOICE_DELETE", label: "Delete Invoice", color: "text-red-500"},
  {icon: <TbShare className='h-5 w-5' />, type: "SHARED__INVOICE_SHARE", label: "Share Invoice", color: "text-emerald-500"},
];

/** Overview of all dialog types managed by the container. */
export const Default: Story = {
  render: () => (
    <div className='rounded-xl border bg-white shadow-xl dark:border-gray-700 dark:bg-gray-900'>
      <div className='border-b p-6'>
        <h2 className='text-lg font-semibold'>Dialog Container</h2>
        <p className='mt-1 text-sm text-gray-500'>
          Manages visibility of all invoice-related dialogs via <code className='rounded bg-gray-100 px-1 text-xs dark:bg-gray-800'>useDialogs</code>{" "}
          context. Renders the active dialog based on the current dialog type.
        </p>
      </div>

      <div className='p-6'>
        <p className='mb-3 text-xs font-medium uppercase tracking-wider text-gray-500'>Registered Dialog Types</p>
        <div className='grid gap-2'>
          {dialogTypes.map((d) => (
            <div
              key={d.type}
              className='flex items-center gap-3 rounded-lg border p-3 transition-colors hover:bg-gray-50 dark:hover:bg-gray-800'>
              <div className={d.color}>{d.icon}</div>
              <div className='flex-1'>
                <p className='text-sm font-medium'>{d.label}</p>
                <code className='text-xs text-gray-400'>{d.type}</code>
              </div>
              <div className='h-2 w-2 rounded-full bg-gray-300 dark:bg-gray-600' />
            </div>
          ))}
        </div>

        <div className='mt-4 rounded-lg border border-yellow-200 bg-yellow-50 p-3 dark:border-yellow-900 dark:bg-yellow-950/30'>
          <div className='flex items-center gap-2'>
            <TbAlertTriangle className='h-4 w-4 text-yellow-600' />
            <p className='text-xs text-yellow-800 dark:text-yellow-300'>
              Only one dialog is rendered at a time. The container returns <code className='font-mono'>null</code> when no dialog is active.
            </p>
          </div>
        </div>
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
