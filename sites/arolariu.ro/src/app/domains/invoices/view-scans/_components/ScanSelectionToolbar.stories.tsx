import type {Meta, StoryObj} from "@storybook/react";

/**
 * ScanSelectionToolbar appears when scans are selected, providing bulk
 * actions like creating invoices. Depends on `useScans` hook.
 *
 * This story renders a static preview of the selection toolbar.
 */
const meta = {
  title: "Invoices/ViewScans/ScanSelectionToolbar",
  parameters: {
    layout: "fullscreen",
  },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

/** Single scan selected. */
export const SingleSelected: Story = {
  render: () => (
    <div
      style={{
        borderBottom: "1px solid #e5e7eb",
        backgroundColor: "white",
        paddingInline: "1rem",
        paddingBlock: "0.75rem",
        boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
      }}>
      <div style={{marginInline: "auto", display: "flex", maxWidth: "80rem", alignItems: "center", justifyContent: "space-between"}}>
        <div style={{display: "flex", alignItems: "center", gap: "0.75rem"}}>
          <span style={{fontSize: "0.875rem", fontWeight: 500}}>1 selected</span>
          <button
            type='button'
            style={{fontSize: "0.875rem", color: "#6b7280"}}>
            ✕ Clear
          </button>
        </div>
        <button
          type='button'
          style={{
            borderRadius: "0.375rem",
            backgroundImage: "linear-gradient(to right, #16a34a, #059669)",
            paddingInline: "1rem",
            paddingBlock: "0.5rem",
            fontSize: "0.875rem",
            color: "white",
          }}>
          📄 Create Invoice
        </button>
      </div>
    </div>
  ),
};

/** Multiple scans selected. */
export const MultipleSelected: Story = {
  render: () => (
    <div
      style={{
        borderBottom: "1px solid #e5e7eb",
        backgroundColor: "white",
        paddingInline: "1rem",
        paddingBlock: "0.75rem",
        boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
      }}>
      <div style={{marginInline: "auto", display: "flex", maxWidth: "80rem", alignItems: "center", justifyContent: "space-between"}}>
        <div style={{display: "flex", alignItems: "center", gap: "0.75rem"}}>
          <span style={{fontSize: "0.875rem", fontWeight: 500}}>5 selected</span>
          <button
            type='button'
            style={{fontSize: "0.875rem", color: "#6b7280"}}>
            ✕ Clear
          </button>
        </div>
        <button
          type='button'
          style={{
            borderRadius: "0.375rem",
            backgroundImage: "linear-gradient(to right, #16a34a, #059669)",
            paddingInline: "1rem",
            paddingBlock: "0.5rem",
            fontSize: "0.875rem",
            color: "white",
          }}>
          📄 Create Invoices
        </button>
      </div>
    </div>
  ),
};
