import type {Meta, StoryObj} from "@storybook/react";
import {TbFile, TbUpload} from "react-icons/tb";

/**
 * Static visual preview of the ImportDialog component.
 *
 * The actual component depends on `useDialog` and `react-dropzone`,
 * so this story renders a faithful HTML replica of the import form
 * with tab selection, dropzone area, and file list.
 */
const meta = {
  title: "Invoices/ViewInvoices/Dialogs/ImportDialog",
  parameters: {
    layout: "centered",
  },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

/** Default import dialog with empty dropzone. */
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
        <h2 style={{fontSize: "1.125rem", fontWeight: 600}}>Import Invoices</h2>
        <p style={{marginTop: "0.25rem", fontSize: "0.875rem", color: "#6b7280"}}>Upload invoice files to import data.</p>
      </div>

      <div style={{padding: "1.5rem"}}>
        {/* Tab bar */}
        <div
          style={{
            marginBottom: "1rem",
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            borderRadius: "0.5rem",
            backgroundColor: "#f3f4f6",
            padding: "0.25rem",
          }}>
          <button
            style={{
              borderRadius: "0.375rem",
              backgroundColor: "#ffffff",
              padding: "0.375rem 0",
              fontSize: "0.875rem",
              fontWeight: 500,
              boxShadow: "0 1px 2px 0 rgba(0,0,0,0.05)",
            }}>
            CSV
          </button>
          <button style={{padding: "0.375rem 0", fontSize: "0.875rem", color: "#6b7280"}}>PDF</button>
          <button style={{padding: "0.375rem 0", fontSize: "0.875rem", color: "#6b7280"}}>XLSX</button>
        </div>

        {/* Dropzone */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            borderRadius: "0.5rem",
            borderWidth: "2px",
            borderStyle: "dashed",
            borderColor: "#d1d5db",
            backgroundColor: "#f9fafb",
            padding: "2.5rem 1.5rem",
            textAlign: "center",
          }}>
          <div style={{borderRadius: "9999px", backgroundColor: "#dbeafe", padding: "0.75rem"}}>
            <TbUpload style={{height: "1.5rem", width: "1.5rem", color: "#2563eb"}} />
          </div>
          <h3 style={{marginTop: "0.75rem", fontSize: "0.875rem", fontWeight: 500}}>Drag and drop files here</h3>
          <p style={{marginTop: "0.25rem", fontSize: "0.75rem", color: "#6b7280"}}>or click to browse</p>
          <p style={{marginTop: "0.5rem", fontSize: "0.75rem", color: "#9ca3af"}}>Accepts .csv files up to 10MB</p>
        </div>
      </div>

      <div style={{display: "flex", justifyContent: "flex-end", gap: "0.5rem", borderTop: "1px solid #e5e7eb", padding: "1rem"}}>
        <button style={{borderRadius: "0.375rem", border: "1px solid #e5e7eb", padding: "0.5rem 1rem", fontSize: "0.875rem"}}>
          Cancel
        </button>
        <button
          style={{borderRadius: "0.375rem", backgroundColor: "#d1d5db", padding: "0.5rem 1rem", fontSize: "0.875rem", color: "#6b7280"}}
          disabled>
          Import
        </button>
      </div>
    </div>
  ),
};

/** With files selected. */
export const WithFiles: Story = {
  render: () => (
    <div
      style={{
        borderRadius: "0.75rem",
        border: "1px solid #e5e7eb",
        backgroundColor: "#ffffff",
        boxShadow: "0 20px 25px -5px rgba(0,0,0,0.1)",
      }}>
      <div style={{borderBottom: "1px solid #e5e7eb", padding: "1.5rem"}}>
        <h2 style={{fontSize: "1.125rem", fontWeight: 600}}>Import Invoices</h2>
        <p style={{marginTop: "0.25rem", fontSize: "0.875rem", color: "#6b7280"}}>Upload invoice files to import data.</p>
      </div>

      <div style={{padding: "1.5rem"}}>
        <div
          style={{
            marginBottom: "1rem",
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            borderRadius: "0.5rem",
            backgroundColor: "#f3f4f6",
            padding: "0.25rem",
          }}>
          <button
            style={{
              borderRadius: "0.375rem",
              backgroundColor: "#ffffff",
              padding: "0.375rem 0",
              fontSize: "0.875rem",
              fontWeight: 500,
              boxShadow: "0 1px 2px 0 rgba(0,0,0,0.05)",
            }}>
            CSV
          </button>
          <button style={{padding: "0.375rem 0", fontSize: "0.875rem", color: "#6b7280"}}>PDF</button>
          <button style={{padding: "0.375rem 0", fontSize: "0.875rem", color: "#6b7280"}}>XLSX</button>
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            borderRadius: "0.5rem",
            borderWidth: "2px",
            borderStyle: "dashed",
            borderColor: "#d1d5db",
            backgroundColor: "#f9fafb",
            padding: "1.5rem",
          }}>
          <TbUpload style={{height: "1.5rem", width: "1.5rem", color: "#2563eb"}} />
          <p style={{marginTop: "0.5rem", fontSize: "0.75rem", color: "#6b7280"}}>Drop more files or click to browse</p>
        </div>

        {/* File list */}
        <div style={{marginTop: "1rem"}}>
          <h4 style={{marginBottom: "0.5rem", fontSize: "0.875rem", fontWeight: 500}}>Selected Files</h4>
          <div style={{display: "flex", flexDirection: "column", gap: "0.5rem"}}>
            {["invoices-jan-2025.csv", "invoices-feb-2025.csv"].map((name) => (
              <div
                key={name}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  borderRadius: "0.375rem",
                  border: "1px solid #e5e7eb",
                  padding: "0.5rem 0.75rem",
                }}>
                <div style={{display: "flex", alignItems: "center", gap: "0.5rem"}}>
                  <TbFile style={{height: "1rem", width: "1rem", color: "#3b82f6"}} />
                  <span style={{fontSize: "0.875rem"}}>{name}</span>
                </div>
                <button style={{fontSize: "0.75rem", color: "#6b7280"}}>Remove</button>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{display: "flex", justifyContent: "flex-end", gap: "0.5rem", borderTop: "1px solid #e5e7eb", padding: "1rem"}}>
        <button style={{borderRadius: "0.375rem", border: "1px solid #e5e7eb", padding: "0.5rem 1rem", fontSize: "0.875rem"}}>
          Cancel
        </button>
        <button
          style={{borderRadius: "0.375rem", backgroundColor: "#111827", padding: "0.5rem 1rem", fontSize: "0.875rem", color: "#ffffff"}}>
          Import 2 files
        </button>
      </div>
    </div>
  ),
};
