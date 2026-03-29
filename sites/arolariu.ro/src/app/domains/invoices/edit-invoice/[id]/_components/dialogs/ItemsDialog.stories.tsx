import type {Meta, StoryObj} from "@storybook/react";
import {TbDisc, TbPlus, TbTrash} from "react-icons/tb";

/**
 * Static visual preview of the ItemsDialog component.
 *
 * @remarks Static preview — component imports `usePaginationWithSearch` from the `@/hooks`
 * barrel which transitively pulls in "use server" actions (fetchInvoice, fetchMerchant, etc.)
 * that cannot be bundled by Storybook's Vite/Rollup. Also depends on `useDialog` context and
 * editable item state. This story renders a faithful HTML replica of the items editing table
 * with sample line items.
 */
const meta = {
  title: "Invoices/EditInvoice/Dialogs/ItemsDialog",
  parameters: {
    layout: "centered",
  },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

const sampleItems = [
  {name: "Whole Milk 1L", qty: 2, unit: "pcs", price: 4.99, total: 9.98},
  {name: "Sourdough Bread", qty: 1, unit: "pcs", price: 6.5, total: 6.5},
  {name: "Free Range Eggs 10pk", qty: 1, unit: "pcs", price: 12.99, total: 12.99},
  {name: "Organic Bananas", qty: 1.2, unit: "kg", price: 3.99, total: 4.79},
  {name: "Cheddar Cheese 200g", qty: 1, unit: "pcs", price: 8.49, total: 8.49},
];

/** Default items editing dialog with sample data. */
export const Default: Story = {
  render: () => (
    <div
      style={{
        borderRadius: "0.75rem",
        border: "1px solid #e5e7eb",
        backgroundColor: "#fff",
        boxShadow: "0 20px 25px -5px rgba(0,0,0,.1),0 8px 10px -6px rgba(0,0,0,.1)",
      }}>
      {/* Header */}
      <div style={{borderBottom: "1px solid #e5e7eb", padding: "1.5rem"}}>
        <h2 style={{fontSize: "1.125rem", fontWeight: 600}}>Edit Invoice Items</h2>
        <p style={{marginTop: "0.25rem", fontSize: "0.875rem", color: "#6b7280"}}>Add, modify, or remove line items from this invoice.</p>
      </div>

      <div style={{padding: "1.5rem"}}>
        {/* Table */}
        <div style={{overflowX: "auto", borderRadius: "0.5rem", border: "1px solid #e5e7eb"}}>
          <table style={{minWidth: "100%"}}>
            <thead>
              <tr style={{backgroundColor: "#f9fafb"}}>
                <th
                  style={{
                    paddingInline: "1rem",
                    paddingBlock: "0.75rem",
                    textAlign: "left",
                    fontSize: "0.75rem",
                    fontWeight: 500,
                    letterSpacing: "0.05em",
                    color: "#6b7280",
                    textTransform: "uppercase",
                  }}>
                  Item
                </th>
                <th
                  style={{
                    paddingInline: "1rem",
                    paddingBlock: "0.75rem",
                    textAlign: "center",
                    fontSize: "0.75rem",
                    fontWeight: 500,
                    letterSpacing: "0.05em",
                    color: "#6b7280",
                    textTransform: "uppercase",
                  }}>
                  Qty
                </th>
                <th
                  style={{
                    paddingInline: "1rem",
                    paddingBlock: "0.75rem",
                    textAlign: "center",
                    fontSize: "0.75rem",
                    fontWeight: 500,
                    letterSpacing: "0.05em",
                    color: "#6b7280",
                    textTransform: "uppercase",
                  }}>
                  Unit
                </th>
                <th
                  style={{
                    paddingInline: "1rem",
                    paddingBlock: "0.75rem",
                    textAlign: "right",
                    fontSize: "0.75rem",
                    fontWeight: 500,
                    letterSpacing: "0.05em",
                    color: "#6b7280",
                    textTransform: "uppercase",
                  }}>
                  Price
                </th>
                <th
                  style={{
                    paddingInline: "1rem",
                    paddingBlock: "0.75rem",
                    textAlign: "right",
                    fontSize: "0.75rem",
                    fontWeight: 500,
                    letterSpacing: "0.05em",
                    color: "#6b7280",
                    textTransform: "uppercase",
                  }}>
                  Total
                </th>
                <th
                  style={{
                    paddingInline: "1rem",
                    paddingBlock: "0.75rem",
                    textAlign: "center",
                    fontSize: "0.75rem",
                    fontWeight: 500,
                    letterSpacing: "0.05em",
                    color: "#6b7280",
                    textTransform: "uppercase",
                  }}>
                  Actions
                </th>
              </tr>
            </thead>
            <tbody style={{backgroundColor: "#fff"}}>
              {sampleItems.map((item) => (
                <tr key={item.name}>
                  <td style={{paddingInline: "1rem", paddingBlock: "0.75rem", fontSize: "0.875rem", fontWeight: 500}}>{item.name}</td>
                  <td style={{paddingInline: "1rem", paddingBlock: "0.75rem", textAlign: "center", fontSize: "0.875rem"}}>{item.qty}</td>
                  <td style={{paddingInline: "1rem", paddingBlock: "0.75rem", textAlign: "center", fontSize: "0.875rem"}}>{item.unit}</td>
                  <td style={{paddingInline: "1rem", paddingBlock: "0.75rem", textAlign: "right", fontSize: "0.875rem"}}>
                    {item.price.toFixed(2)}
                  </td>
                  <td style={{paddingInline: "1rem", paddingBlock: "0.75rem", textAlign: "right", fontSize: "0.875rem", fontWeight: 500}}>
                    {item.total.toFixed(2)}
                  </td>
                  <td style={{paddingInline: "1rem", paddingBlock: "0.75rem", textAlign: "center"}}>
                    <button style={{borderRadius: "0.25rem", padding: "0.25rem"}}>
                      <TbTrash style={{height: "1rem", width: "1rem", color: "#ef4444"}} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr style={{backgroundColor: "#f9fafb"}}>
                <td
                  style={{paddingInline: "1rem", paddingBlock: "0.5rem", fontSize: "0.75rem", color: "#6b7280"}}
                  colSpan={2}>
                  5 items found (showing 5)
                </td>
                <td
                  style={{paddingInline: "1rem", paddingBlock: "0.5rem", textAlign: "right", fontSize: "0.75rem", color: "#6b7280"}}
                  colSpan={2}>
                  Page 1 of 1
                </td>
                <td
                  style={{paddingInline: "1rem", paddingBlock: "0.5rem", textAlign: "right"}}
                  colSpan={2}>
                  <button
                    style={{paddingInline: "0.5rem", paddingBlock: "0.25rem", fontSize: "0.75rem", color: "#9ca3af"}}
                    disabled>
                    Previous
                  </button>
                  <button
                    style={{paddingInline: "0.5rem", paddingBlock: "0.25rem", fontSize: "0.75rem", color: "#9ca3af"}}
                    disabled>
                    Next
                  </button>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Controls */}
        <div style={{marginTop: "1rem", display: "flex", alignItems: "center", justifyContent: "space-between"}}>
          <button
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.25rem",
              borderRadius: "0.375rem",
              border: "1px solid #e5e7eb",
              paddingInline: "0.75rem",
              paddingBlock: "0.375rem",
              fontSize: "0.875rem",
            }}>
            <TbPlus style={{height: "1rem", width: "1rem"}} />
            Add Item
          </button>
          <span style={{fontSize: "0.75rem", color: "#6b7280"}}>5 items total</span>
        </div>
      </div>

      {/* Footer */}
      <div style={{display: "flex", justifyContent: "flex-end", gap: "0.5rem", borderTop: "1px solid #e5e7eb", padding: "1rem"}}>
        <button
          style={{
            borderRadius: "0.375rem",
            border: "1px solid #e5e7eb",
            paddingInline: "1rem",
            paddingBlock: "0.5rem",
            fontSize: "0.875rem",
          }}>
          Cancel
        </button>
        <button
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            borderRadius: "0.375rem",
            backgroundColor: "#111827",
            paddingInline: "1rem",
            paddingBlock: "0.5rem",
            fontSize: "0.875rem",
            color: "#fff",
          }}>
          <TbDisc style={{height: "1rem", width: "1rem"}} />
          Save Changes
        </button>
      </div>
    </div>
  ),
};
