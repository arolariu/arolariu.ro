import type {Meta, StoryObj} from "@storybook/react";

/**
 * ItemsTable renders a paginated table of invoice line items with editing
 * capabilities. Depends on `useDialog` for the edit dialog.
 *
 * This story renders a static preview of the items table layout.
 */
const meta = {
  title: "Invoices/EditInvoice/Tables/ItemsTable",
  parameters: {
    layout: "centered",
  },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

/** Preview of items table with sample products. */
export const WithItems: Story = {
  render: () => (
    <div style={{borderRadius: "0.5rem", border: "1px solid #e5e7eb", backgroundColor: "#ffffff"}}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          borderBottom: "1px solid #e5e7eb",
          padding: "1rem",
        }}>
        <h3 style={{fontSize: "0.875rem", fontWeight: "600"}}>Items (5)</h3>
        <button
          type='button'
          style={{
            borderRadius: "0.375rem",
            border: "1px solid #e5e7eb",
            paddingLeft: "0.75rem",
            paddingRight: "0.75rem",
            paddingTop: "0.375rem",
            paddingBottom: "0.375rem",
            fontSize: "0.875rem",
          }}>
          ✏️ Edit Items
        </button>
      </div>
      <table style={{width: "100%", fontSize: "0.875rem"}}>
        <thead>
          <tr style={{borderBottom: "1px solid #e5e7eb", fontSize: "0.75rem", color: "#6b7280"}}>
            <th style={{paddingLeft: "1rem", paddingRight: "1rem", paddingTop: "0.5rem", paddingBottom: "0.5rem", textAlign: "left"}}>
              Item
            </th>
            <th style={{paddingLeft: "1rem", paddingRight: "1rem", paddingTop: "0.5rem", paddingBottom: "0.5rem", textAlign: "right"}}>
              Qty
            </th>
            <th style={{paddingLeft: "1rem", paddingRight: "1rem", paddingTop: "0.5rem", paddingBottom: "0.5rem", textAlign: "right"}}>
              Unit Price
            </th>
            <th style={{paddingLeft: "1rem", paddingRight: "1rem", paddingTop: "0.5rem", paddingBottom: "0.5rem", textAlign: "right"}}>
              Total
            </th>
          </tr>
        </thead>
        <tbody>
          <tr style={{borderBottom: "1px solid #e5e7eb"}}>
            <td style={{paddingLeft: "1rem", paddingRight: "1rem", paddingTop: "0.5rem", paddingBottom: "0.5rem"}}>Organic Milk 2L</td>
            <td style={{paddingLeft: "1rem", paddingRight: "1rem", paddingTop: "0.5rem", paddingBottom: "0.5rem", textAlign: "right"}}>
              2 pcs
            </td>
            <td style={{paddingLeft: "1rem", paddingRight: "1rem", paddingTop: "0.5rem", paddingBottom: "0.5rem", textAlign: "right"}}>
              $3.99
            </td>
            <td
              style={{
                paddingLeft: "1rem",
                paddingRight: "1rem",
                paddingTop: "0.5rem",
                paddingBottom: "0.5rem",
                textAlign: "right",
                fontWeight: "500",
              }}>
              $7.98
            </td>
          </tr>
          <tr style={{borderBottom: "1px solid #e5e7eb"}}>
            <td style={{paddingLeft: "1rem", paddingRight: "1rem", paddingTop: "0.5rem", paddingBottom: "0.5rem"}}>Sourdough Bread</td>
            <td style={{paddingLeft: "1rem", paddingRight: "1rem", paddingTop: "0.5rem", paddingBottom: "0.5rem", textAlign: "right"}}>
              1 pcs
            </td>
            <td style={{paddingLeft: "1rem", paddingRight: "1rem", paddingTop: "0.5rem", paddingBottom: "0.5rem", textAlign: "right"}}>
              $5.50
            </td>
            <td
              style={{
                paddingLeft: "1rem",
                paddingRight: "1rem",
                paddingTop: "0.5rem",
                paddingBottom: "0.5rem",
                textAlign: "right",
                fontWeight: "500",
              }}>
              $5.50
            </td>
          </tr>
          <tr style={{borderBottom: "1px solid #e5e7eb"}}>
            <td style={{paddingLeft: "1rem", paddingRight: "1rem", paddingTop: "0.5rem", paddingBottom: "0.5rem"}}>Fresh Chicken Breast</td>
            <td style={{paddingLeft: "1rem", paddingRight: "1rem", paddingTop: "0.5rem", paddingBottom: "0.5rem", textAlign: "right"}}>
              0.8 kg
            </td>
            <td style={{paddingLeft: "1rem", paddingRight: "1rem", paddingTop: "0.5rem", paddingBottom: "0.5rem", textAlign: "right"}}>
              $8.99
            </td>
            <td
              style={{
                paddingLeft: "1rem",
                paddingRight: "1rem",
                paddingTop: "0.5rem",
                paddingBottom: "0.5rem",
                textAlign: "right",
                fontWeight: "500",
              }}>
              $7.19
            </td>
          </tr>
        </tbody>
        <tfoot>
          <tr style={{backgroundColor: "#f9fafb", fontWeight: "600"}}>
            <td
              style={{paddingLeft: "1rem", paddingRight: "1rem", paddingTop: "0.5rem", paddingBottom: "0.5rem"}}
              colSpan={3}>
              Grand Total
            </td>
            <td style={{paddingLeft: "1rem", paddingRight: "1rem", paddingTop: "0.5rem", paddingBottom: "0.5rem", textAlign: "right"}}>
              $20.67
            </td>
          </tr>
        </tfoot>
      </table>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          borderTop: "1px solid #e5e7eb",
          padding: "1rem",
          fontSize: "0.875rem",
          color: "#6b7280",
        }}>
        <span>Page 1 of 2</span>
        <div style={{display: "flex", gap: "0.5rem"}}>
          <button
            type='button'
            disabled
            style={{
              borderRadius: "0.375rem",
              border: "1px solid #e5e7eb",
              paddingLeft: "0.75rem",
              paddingRight: "0.75rem",
              paddingTop: "0.25rem",
              paddingBottom: "0.25rem",
              fontSize: "0.875rem",
              opacity: 0.5,
            }}>
            ← Previous
          </button>
          <button
            type='button'
            style={{
              borderRadius: "0.375rem",
              border: "1px solid #e5e7eb",
              paddingLeft: "0.75rem",
              paddingRight: "0.75rem",
              paddingTop: "0.25rem",
              paddingBottom: "0.25rem",
              fontSize: "0.875rem",
            }}>
            Next →
          </button>
        </div>
      </div>
    </div>
  ),
};

/** Empty items table. */
export const Empty: Story = {
  render: () => (
    <div style={{borderRadius: "0.5rem", border: "1px solid #e5e7eb", backgroundColor: "#ffffff"}}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          borderBottom: "1px solid #e5e7eb",
          padding: "1rem",
        }}>
        <h3 style={{fontSize: "0.875rem", fontWeight: "600"}}>Items (0)</h3>
        <button
          type='button'
          style={{
            borderRadius: "0.375rem",
            border: "1px solid #e5e7eb",
            paddingLeft: "0.75rem",
            paddingRight: "0.75rem",
            paddingTop: "0.375rem",
            paddingBottom: "0.375rem",
            fontSize: "0.875rem",
          }}>
          ✏️ Edit Items
        </button>
      </div>
      <div style={{padding: "2rem", textAlign: "center", fontSize: "0.875rem", color: "#6b7280"}}>No items found on this invoice.</div>
    </div>
  ),
};
