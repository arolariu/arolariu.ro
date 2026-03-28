import type {Meta, StoryObj} from "@storybook/react";

/**
 * ScansHeader shows the scan count, sync status, and action buttons
 * (upload, invoices, sync). Depends on `useScans` hook.
 *
 * This story renders a static preview of the scans header.
 */
const meta = {
  title: "Invoices/ViewScans/ScansHeader",
  parameters: {
    layout: "fullscreen",
  },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

/** Default header with scans and sync info. */
export const Default: Story = {
  render: () => (
    <div style={{display: "flex", flexDirection: "column", gap: "1rem", backgroundColor: "white", paddingInline: "1.5rem", paddingBlock: "1rem"}}>
      <div style={{display: "flex", alignItems: "center", gap: "0.5rem"}}>
        <div>
          <h1 style={{fontSize: "1.5rem", fontWeight: 700, letterSpacing: "-0.025em"}}>Your Scans (12)</h1>
          <p style={{fontSize: "0.875rem", color: "#6b7280"}}>Last synced: 5m ago</p>
        </div>
        <button
          type='button'
          style={{marginTop: "0.25rem", color: "#9ca3af"}}
          title='Scans are stored locally and synced with the server'>
          ℹ️
        </button>
      </div>
      <div style={{display: "flex", gap: "0.5rem"}}>
        <button
          type='button'
          style={{display: "flex", alignItems: "center", gap: "0.5rem", borderRadius: "0.375rem", backgroundImage: "linear-gradient(to right, #2563eb, #06b6d4)", paddingInline: "1rem", paddingBlock: "0.5rem", fontSize: "0.875rem", color: "white"}}>
          📤 Upload More
        </button>
        <button
          type='button'
          style={{display: "flex", alignItems: "center", gap: "0.5rem", borderRadius: "0.375rem", border: "1px solid #e5e7eb", paddingInline: "1rem", paddingBlock: "0.5rem", fontSize: "0.875rem"}}>
          📄 My Invoices
        </button>
        <button
          type='button'
          style={{display: "flex", alignItems: "center", gap: "0.5rem", borderRadius: "0.375rem", border: "1px solid #e5e7eb", paddingInline: "1rem", paddingBlock: "0.5rem", fontSize: "0.875rem"}}>
          🔄 Sync
        </button>
      </div>
    </div>
  ),
};

/** Syncing state. */
export const Syncing: Story = {
  render: () => (
    <div style={{display: "flex", flexDirection: "column", gap: "1rem", backgroundColor: "white", paddingInline: "1.5rem", paddingBlock: "1rem"}}>
      <div>
        <h1 style={{fontSize: "1.5rem", fontWeight: 700, letterSpacing: "-0.025em"}}>Your Scans (12)</h1>
        <p style={{fontSize: "0.875rem", color: "#6b7280"}}>Syncing...</p>
      </div>
      <div style={{display: "flex", gap: "0.5rem"}}>
        <button
          type='button'
          style={{borderRadius: "0.375rem", backgroundImage: "linear-gradient(to right, #2563eb, #06b6d4)", paddingInline: "1rem", paddingBlock: "0.5rem", fontSize: "0.875rem", color: "white"}}>
          📤 Upload
        </button>
        <button
          type='button'
          disabled
          style={{display: "flex", alignItems: "center", gap: "0.5rem", borderRadius: "0.375rem", border: "1px solid #e5e7eb", paddingInline: "1rem", paddingBlock: "0.5rem", fontSize: "0.875rem", opacity: 0.5}}>
          <span>🔄</span> Syncing...
        </button>
      </div>
    </div>
  ),
};
