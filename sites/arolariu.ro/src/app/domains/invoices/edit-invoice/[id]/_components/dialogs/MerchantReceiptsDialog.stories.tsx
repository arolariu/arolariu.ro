import type {Meta, StoryObj} from "@storybook/react";
import {TbArrowsUpDown, TbCalendar, TbDownload, TbSearch} from "react-icons/tb";

/**
 * Static visual preview of the MerchantReceiptsDialog component.
 *
 * @remarks Static preview — component imports `usePaginationWithSearch` from the `@/hooks`
 * barrel which transitively pulls in "use server" actions (fetchInvoice, fetchMerchant, etc.)
 * that cannot be bundled by Storybook's Vite/Rollup. Also depends on `useDialog` context and
 * API data fetching. This story renders a faithful HTML replica of the receipts table with
 * filtering controls.
 */
const meta = {
  title: "Invoices/EditInvoice/Dialogs/MerchantReceiptsDialog",
  parameters: {
    layout: "centered",
  },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

const sampleReceipts = [
  {name: "Weekly Groceries", date: "Dec 15, 2024", items: 12, id: "1"},
  {name: "Holiday Shopping", date: "Dec 22, 2024", items: 8, id: "2"},
  {name: "Pantry Restock", date: "Jan 3, 2025", items: 15, id: "3"},
];

/** Default receipts dialog with sample merchant receipts. */
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
        <h2 style={{fontSize: "1.125rem", fontWeight: 600}}>Receipts from Lidl</h2>
        <p style={{marginTop: "0.25rem", fontSize: "0.875rem", color: "#6b7280"}}>View all receipts associated with this merchant.</p>
      </div>

      <div style={{padding: "1.5rem", display: "flex", flexDirection: "column", gap: "1rem"}}>
        {/* Filter Row */}
        <div style={{display: "flex", flexDirection: "column", gap: "0.75rem"}}>
          <div style={{position: "relative", flex: 1}}>
            <TbSearch style={{position: "absolute", top: "0.625rem", left: "0.625rem", height: "1rem", width: "1rem", color: "#9ca3af"}} />
            <input
              style={{
                width: "100%",
                borderRadius: "0.375rem",
                border: "1px solid #e5e7eb",
                backgroundColor: "transparent",
                paddingBlock: "0.5rem",
                paddingRight: "0.75rem",
                paddingLeft: "2rem",
                fontSize: "0.875rem",
                outline: "none",
              }}
              placeholder='Search receipts...'
              readOnly
            />
          </div>
          <div style={{display: "flex", gap: "0.5rem"}}>
            <button
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.375rem",
                borderRadius: "0.375rem",
                border: "1px solid #e5e7eb",
                paddingInline: "0.75rem",
                paddingBlock: "0.5rem",
                fontSize: "0.875rem",
              }}>
              <TbCalendar style={{height: "1rem", width: "1rem"}} />
              All Time
            </button>
            <button
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.375rem",
                borderRadius: "0.375rem",
                border: "1px solid #e5e7eb",
                paddingInline: "0.75rem",
                paddingBlock: "0.5rem",
                fontSize: "0.875rem",
              }}>
              <TbArrowsUpDown style={{height: "1rem", width: "1rem"}} />
              Newest
            </button>
          </div>
        </div>

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
                  Receipt
                </th>
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
                  Date
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
                  Items
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
                  Actions
                </th>
              </tr>
            </thead>
            <tbody style={{backgroundColor: "#fff"}}>
              {sampleReceipts.map((receipt) => (
                <tr key={receipt.id}>
                  <td style={{paddingInline: "1rem", paddingBlock: "0.75rem", fontSize: "0.875rem", fontWeight: 500}}>{receipt.name}</td>
                  <td style={{paddingInline: "1rem", paddingBlock: "0.75rem", fontSize: "0.875rem"}}>{receipt.date}</td>
                  <td style={{paddingInline: "1rem", paddingBlock: "0.75rem", textAlign: "right", fontSize: "0.875rem"}}>
                    {receipt.items}
                  </td>
                  <td style={{paddingInline: "1rem", paddingBlock: "0.75rem", textAlign: "right"}}>
                    <button
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.25rem",
                        borderRadius: "0.375rem",
                        paddingInline: "0.5rem",
                        paddingBlock: "0.25rem",
                        fontSize: "0.875rem",
                      }}>
                      <TbDownload style={{height: "1rem", width: "1rem"}} />
                      View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr style={{backgroundColor: "#f9fafb"}}>
                <td
                  style={{paddingInline: "1rem", paddingBlock: "0.5rem", fontSize: "0.75rem", color: "#6b7280"}}
                  colSpan={4}>
                  3 receipts found (showing 3) — Page 1 of 1
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  ),
};
