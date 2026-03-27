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
    <div style={{borderRadius: '0.75rem', border: '1px solid #e5e7eb', backgroundColor: '#ffffff', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'}}>
      <div style={{borderBottom: '1px solid #e5e7eb', padding: '1.5rem'}}>
        <h2 style={{fontSize: '1.125rem', fontWeight: '600'}}>Dialog Container</h2>
        <p style={{marginTop: '0.25rem', fontSize: '0.875rem', color: '#6b7280'}}>
          Manages visibility of all invoice-related dialogs via{" "}
          <code style={{borderRadius: '0.25rem', backgroundColor: '#f3f4f6', paddingLeft: '0.25rem', paddingRight: '0.25rem', fontSize: '0.75rem'}}>useDialogs</code> context. Renders the active dialog based on
          the current dialog type.
        </p>
      </div>

      <div style={{padding: '1.5rem'}}>
        <p style={{marginBottom: '0.75rem', fontSize: '0.75rem', fontWeight: '500', letterSpacing: '0.05em', color: '#6b7280', textTransform: 'uppercase'}}>Registered Dialog Types</p>
        <div style={{display: 'grid', gap: '0.5rem'}}>
          {dialogTypes.map((d) => (
            <div
              key={d.type}
              style={{display: 'flex', alignItems: 'center', gap: '0.75rem', borderRadius: '0.5rem', border: '1px solid #e5e7eb', padding: '0.75rem'}}>
              <div className={d.color}>{d.icon}</div>
              <div style={{flex: '1'}}>
                <p style={{fontSize: '0.875rem', fontWeight: '500'}}>{d.label}</p>
                <code style={{fontSize: '0.75rem', color: '#9ca3af'}}>{d.type}</code>
              </div>
              <div style={{height: '0.5rem', width: '0.5rem', borderRadius: '9999px', backgroundColor: '#d1d5db'}} />
            </div>
          ))}
        </div>

        <div style={{marginTop: '1rem', borderRadius: '0.5rem', border: '1px solid #fcd34d', backgroundColor: '#fffbeb', padding: '0.75rem'}}>
          <div style={{display: 'flex', alignItems: 'center', gap: '0.5rem'}}>
            <TbAlertTriangle style={{height: '1rem', width: '1rem', color: '#d97706'}} />
            <p style={{fontSize: '0.75rem', color: '#92400e'}}>
              Only one dialog is rendered at a time. The container returns <code style={{fontFamily: 'monospace'}}>null</code> when no dialog is active.
            </p>
          </div>
        </div>
      </div>
    </div>
  ),
};
