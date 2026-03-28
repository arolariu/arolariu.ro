import type {Meta, StoryObj} from "@storybook/react";

/**
 * ImageCard displays receipt images with navigation, zoom, and add/remove controls.
 *
 * Because it depends on `useDialog` from DialogContext, this story renders
 * a **static preview** of the card layout and image gallery structure.
 */
const meta = {
  title: "Invoices/EditInvoice/Cards/ImageCard",
  parameters: {
    layout: "centered",
  },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

/** Static preview of the image card with a placeholder receipt image. */
export const Preview: Story = {
  render: () => (
    <div
      style={{
        overflow: "hidden",
        borderRadius: "0.5rem",
        border: "1px solid #e5e7eb",
        backgroundColor: "white",
        boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
      }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          borderBottom: "1px solid #e5e7eb",
          padding: "1rem",
        }}>
        <h3 style={{fontSize: "1.125rem", fontWeight: 600}}>Receipt Scan</h3>
      </div>
      <div style={{display: "flex", justifyContent: "center", padding: "1rem"}}>
        <div
          style={{
            position: "relative",
            height: "300px",
            width: "200px",
            overflow: "hidden",
            borderRadius: "0.375rem",
            border: "1px solid #e5e7eb",
            backgroundColor: "#f3f4f6",
          }}>
          <img
            src='https://picsum.photos/seed/imagecard/400/600'
            alt='Receipt scan'
            style={{height: "100%", width: "100%", objectFit: "cover"}}
          />
        </div>
      </div>
      <div style={{display: "flex", flexDirection: "column", gap: "0.5rem", borderTop: "1px solid #e5e7eb", padding: "1rem"}}>
        <button
          type='button'
          style={{width: "100%", borderRadius: "0.375rem", border: "1px solid #d1d5db", padding: "0.5rem 1rem", fontSize: "0.875rem"}}>
          🔍 Expand
        </button>
        <div style={{display: "flex", gap: "0.5rem"}}>
          <button
            type='button'
            style={{flex: 1, borderRadius: "0.375rem", border: "1px solid #d1d5db", padding: "0.5rem 0.75rem", fontSize: "0.875rem"}}>
            ➕ Add Scan
          </button>
          <button
            type='button'
            style={{
              flex: 1,
              borderRadius: "0.375rem",
              border: "1px solid #d1d5db",
              padding: "0.5rem 0.75rem",
              fontSize: "0.875rem",
              color: "#ef4444",
            }}>
            🗑 Remove
          </button>
        </div>
      </div>
    </div>
  ),
};

/** Multiple scans with navigation indicators. */
export const MultipleScans: Story = {
  render: () => (
    <div
      style={{
        overflow: "hidden",
        borderRadius: "0.5rem",
        border: "1px solid #e5e7eb",
        backgroundColor: "white",
        boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
      }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          borderBottom: "1px solid #e5e7eb",
          padding: "1rem",
        }}>
        <h3 style={{fontSize: "1.125rem", fontWeight: 600}}>Receipt Scan (2/3)</h3>
      </div>
      <div style={{display: "flex", justifyContent: "center", padding: "1rem"}}>
        <div
          style={{
            position: "relative",
            height: "300px",
            width: "200px",
            overflow: "hidden",
            borderRadius: "0.375rem",
            border: "1px solid #e5e7eb",
            backgroundColor: "#f3f4f6",
          }}>
          <img
            src='https://picsum.photos/seed/imagecard2/400/600'
            alt='Receipt scan 2 of 3'
            style={{height: "100%", width: "100%", objectFit: "cover"}}
          />
        </div>
      </div>
      <div style={{display: "flex", flexDirection: "column", gap: "0.5rem", borderTop: "1px solid #e5e7eb", padding: "1rem"}}>
        <button
          type='button'
          style={{width: "100%", borderRadius: "0.375rem", border: "1px solid #d1d5db", padding: "0.5rem 1rem", fontSize: "0.875rem"}}>
          🔍 Expand
        </button>
        <div style={{display: "flex", gap: "0.5rem"}}>
          <button
            type='button'
            style={{flex: 1, borderRadius: "0.375rem", border: "1px solid #d1d5db", padding: "0.5rem 0.75rem", fontSize: "0.875rem"}}>
            ← Previous
          </button>
          <button
            type='button'
            style={{flex: 1, borderRadius: "0.375rem", border: "1px solid #d1d5db", padding: "0.5rem 0.75rem", fontSize: "0.875rem"}}>
            Next →
          </button>
        </div>
      </div>
    </div>
  ),
};
