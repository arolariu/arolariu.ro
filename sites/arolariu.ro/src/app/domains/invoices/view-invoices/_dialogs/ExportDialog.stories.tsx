import type {Meta, StoryObj} from "@storybook/react";
import {TbDownload, TbFileSpreadsheet, TbFileText, TbJson} from "react-icons/tb";

/**
 * Static visual preview of the ExportDialog component.
 *
 * The actual component depends on `useDialog` and `useInvoicesStore`,
 * so this story renders a faithful HTML replica of the export form
 * with format selection and options checkboxes.
 */
const meta = {
  title: "Invoices/ViewInvoices/Dialogs/ExportDialog",
  parameters: {
    layout: "centered",
  },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

/** Default export dialog with CSV selected. */
export const Default: Story = {
  render: () => (
    <div
      style={{
        borderRadius: "0.75rem",
        border: "1px solid #e5e7eb",
        backgroundColor: "#ffffff",
        boxShadow: "0 20px 25px -5px rgba(0,0,0,0.1)",
      }}>
      <div style={{borderBottom: "1px solid #e5e7eb", padding: "1.5rem"}}>
        <h2 style={{fontSize: "1.125rem", fontWeight: 600}}>Export Invoices</h2>
        <p style={{marginTop: "0.25rem", fontSize: "0.875rem", color: "#6b7280"}}>Export 5 invoices in your preferred format.</p>
      </div>

      <div style={{display: "flex", flexDirection: "column", gap: "1.25rem", padding: "1.5rem"}}>
        {/* Format selection */}
        <div>
          <h3 style={{marginBottom: "0.5rem", fontSize: "0.875rem", fontWeight: 600}}>Export Format</h3>
          <div style={{display: "flex", flexDirection: "column", gap: "0.5rem"}}>
            {[
              {
                value: "csv",
                icon: <TbFileSpreadsheet style={{height: "1rem", width: "1rem", color: "#16a34a"}} />,
                label: "CSV",
                selected: true,
              },
              {value: "json", icon: <TbJson style={{height: "1rem", width: "1rem", color: "#2563eb"}} />, label: "JSON", selected: false},
              {value: "pdf", icon: <TbFileText style={{height: "1rem", width: "1rem", color: "#dc2626"}} />, label: "PDF", selected: false},
            ].map((format) => (
              <label
                key={format.value}
                style={{display: "flex", alignItems: "center", gap: "0.75rem", fontSize: "0.875rem"}}>
                <input
                  type='radio'
                  name='format'
                  checked={format.selected}
                  readOnly
                  style={{height: "1rem", width: "1rem"}}
                />
                <span style={{display: "flex", alignItems: "center", gap: "0.5rem"}}>
                  {format.icon}
                  {format.label}
                </span>
              </label>
            ))}
          </div>
        </div>

        {/* Options */}
        <div>
          <h3 style={{marginBottom: "0.5rem", fontSize: "0.875rem", fontWeight: 600}}>Include in Export</h3>
          <div style={{display: "flex", flexDirection: "column", gap: "0.5rem"}}>
            {[
              {label: "Include Metadata", checked: false},
              {label: "Include Products", checked: true},
              {label: "Include Merchant", checked: false},
              {label: "Include Headers", checked: true},
            ].map((opt) => (
              <label
                key={opt.label}
                style={{display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.875rem"}}>
                <input
                  type='checkbox'
                  checked={opt.checked}
                  readOnly
                  style={{height: "1rem", width: "1rem", borderRadius: "0.25rem", border: "1px solid #e5e7eb"}}
                />
                {opt.label}
              </label>
            ))}
          </div>
        </div>
      </div>

      <div style={{display: "flex", justifyContent: "flex-end", gap: "0.5rem", borderTop: "1px solid #e5e7eb", padding: "1rem"}}>
        <button style={{borderRadius: "0.375rem", border: "1px solid #e5e7eb", padding: "0.5rem 1rem", fontSize: "0.875rem"}}>
          Cancel
        </button>
        <button
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            borderRadius: "0.375rem",
            backgroundColor: "#111827",
            padding: "0.5rem 1rem",
            fontSize: "0.875rem",
            color: "#ffffff",
          }}>
          <TbDownload style={{height: "1rem", width: "1rem"}} />
          Export
        </button>
      </div>
    </div>
  ),
};
