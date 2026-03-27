import type {Meta, StoryObj} from "@storybook/react";
import {TbCards, TbCategory, TbClock, TbFilter, TbSearch, TbTable} from "react-icons/tb";

/**
 * Static visual preview of the InvoicesView component.
 *
 * @remarks Static preview — component imports `usePaginationWithSearch` from the `@/hooks`
 * barrel which transitively pulls in "use server" actions (fetchInvoice, fetchMerchant, etc.)
 * that cannot be bundled by Storybook's Vite/Rollup. This story renders a faithful HTML
 * replica of the toolbar and placeholder content area.
 */
const meta = {
  title: "Invoices/ViewInvoices/Views/InvoicesView",
  parameters: {
    layout: "fullscreen",
  },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

/** Default invoices view with search toolbar and table placeholder. */
export const Default: Story = {
  render: () => (
    <div style={{display: 'flex', flexDirection: 'column', gap: '1rem'}}>
      {/* Toolbar */}
      <div style={{display: 'flex', flexDirection: 'column', gap: '0.75rem'}}>
        <div style={{position: 'relative'}}>
          <TbSearch style={{position: 'absolute', top: '50%', left: '0.75rem', height: '1rem', width: '1rem', transform: 'translateY(-50%)', color: '#9ca3af'}} />
          <input
            type='text'
            placeholder='Search invoices...'
            style={{width: '100%', borderRadius: '0.375rem', border: '1px solid #e5e7eb', backgroundColor: 'transparent', padding: '0.5rem 0.75rem 0.5rem 2.25rem', fontSize: '0.875rem', outline: 'none'}}
            readOnly
          />
        </div>
        <div style={{display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0.5rem'}}>
          <div style={{display: 'flex', alignItems: 'center', gap: '0.25rem', borderRadius: '0.375rem', border: '1px solid #e5e7eb', padding: '0.375rem 0.75rem', fontSize: '0.875rem'}}>
            <TbCategory style={{height: '1rem', width: '1rem', color: '#6b7280'}} />
            <span>Category</span>
          </div>
          <div style={{display: 'flex', alignItems: 'center', gap: '0.25rem', borderRadius: '0.375rem', border: '1px solid #e5e7eb', padding: '0.375rem 0.75rem', fontSize: '0.875rem'}}>
            <TbClock style={{height: '1rem', width: '1rem', color: '#6b7280'}} />
            <span>Time of Day</span>
          </div>
          <button style={{borderRadius: '0.375rem', border: '1px solid #e5e7eb', padding: '0.375rem 0.5rem'}}>
            <TbFilter style={{height: '1rem', width: '1rem', color: '#6b7280'}} />
          </button>
          <div style={{marginLeft: 'auto', display: 'flex'}}>
            <button style={{borderTopLeftRadius: '0.375rem', borderBottomLeftRadius: '0.375rem', backgroundColor: '#111827', padding: '0.375rem 0.5rem', color: '#ffffff'}}>
              <TbTable style={{height: '1rem', width: '1rem'}} />
            </button>
            <button style={{borderTopRightRadius: '0.375rem', borderBottomRightRadius: '0.375rem', border: '1px solid #e5e7eb', padding: '0.375rem 0.5rem'}}>
              <TbCards style={{height: '1rem', width: '1rem'}} />
            </button>
          </div>
        </div>
      </div>

      {/* Table placeholder */}
      <div style={{borderRadius: '0.375rem', border: '1px solid #e5e7eb'}}>
        <div style={{display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', borderBottom: '1px solid #e5e7eb', backgroundColor: '#f9fafb', padding: '0.625rem 1rem', fontSize: '0.75rem', fontWeight: 500, color: '#6b7280'}}>
          <span>Merchant</span>
          <span>Date</span>
          <span>Category</span>
          <span>Total</span>
          <span>Status</span>
        </div>
        {[
          {merchant: "Lidl", date: "Jan 15", category: "Groceries", total: "$45.80", status: "Analyzed"},
          {merchant: "Amazon", date: "Jan 12", category: "Electronics", total: "$129.99", status: "Pending"},
          {merchant: "Starbucks", date: "Jan 10", category: "Dining", total: "$8.50", status: "Analyzed"},
        ].map((row) => (
          <div
            key={row.merchant}
            style={{display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', borderBottom: '1px solid #e5e7eb', padding: '0.75rem 1rem', fontSize: '0.875rem'}}>
            <span style={{fontWeight: 500}}>{row.merchant}</span>
            <span style={{color: '#6b7280'}}>{row.date}</span>
            <span>{row.category}</span>
            <span>{row.total}</span>
            <span style={{color: row.status === "Analyzed" ? '#16a34a' : '#ca8a04'}}>{row.status}</span>
          </div>
        ))}
      </div>
    </div>
  ),
};
