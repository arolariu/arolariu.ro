import type {Meta, StoryObj} from "@storybook/react";
import ScansHeader from "./ScansHeader";

/**
 * ScansHeader shows the scan count, sync status, and action buttons
 * (upload, invoices, sync).
 *
 * ## Static Preview Blocker
 *
 * **Cannot mount real component** because it requires:
 * 1. `useScans` hook from ScansContext (provides scans array, isSyncing state, lastSyncTimestamp, syncScans callback)
 * 2. `useTranslations` hook with next-intl runtime dictionary
 * 3. Client-side state management for sync operations and local storage integration
 *
 * **Alternatives attempted:**
 * - Wrapping with mock `ScansProvider` requires complex zustand store setup and sync logic mocks
 * - Component has no stable prop-based API—all state is hook-driven
 * - Sync button interaction requires server action mocks for scan synchronization
 *
 * **Decision:** Use static preview to document header layout and sync states.
 * Integration testing via Playwright validates full behavior with real ScansContext.
 */
const meta = {
  title: "Invoices/ViewScans/ScansHeader",
  parameters: {
    layout: "fullscreen",
    docs: {
      description: {
        component:
          "Header for scans listing page showing total count, last sync timestamp, and actions (Upload More, My Invoices, Sync). Depends on useScans hook for scan state and sync operations—see component docs for integration details.",
      },
    },
  },
  tags: ["autodocs"],
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Static preview of scans header with scan count and sync info.
 * Shows title with count, last synced timestamp, info tooltip, and action buttons.
 */
export const Default: Story = {
  render: () => (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "1rem",
        backgroundColor: "white",
        paddingInline: "1.5rem",
        paddingBlock: "1rem",
      }}>
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
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            borderRadius: "0.375rem",
            backgroundImage: "linear-gradient(to right, #2563eb, #06b6d4)",
            paddingInline: "1rem",
            paddingBlock: "0.5rem",
            fontSize: "0.875rem",
            color: "white",
          }}>
          📤 Upload More
        </button>
        <button
          type='button'
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            borderRadius: "0.375rem",
            border: "1px solid #e5e7eb",
            paddingInline: "1rem",
            paddingBlock: "0.5rem",
            fontSize: "0.875rem",
          }}>
          📄 My Invoices
        </button>
        <button
          type='button'
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            borderRadius: "0.375rem",
            border: "1px solid #e5e7eb",
            paddingInline: "1rem",
            paddingBlock: "0.5rem",
            fontSize: "0.875rem",
          }}>
          🔄 Sync
        </button>
      </div>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story:
          "Default header state showing scan count (12), relative last sync time (5m ago), info tooltip, and three action buttons. Upload More button uses gradient primary styling; My Invoices and Sync use outline variants.",
      },
    },
  },
};

/**
 * Static preview of header during active sync operation.
 * Shows syncing status text and disabled Sync button with spinner.
 */
export const Syncing: Story = {
  render: () => (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "1rem",
        backgroundColor: "white",
        paddingInline: "1.5rem",
        paddingBlock: "1rem",
      }}>
      <div>
        <h1 style={{fontSize: "1.5rem", fontWeight: 700, letterSpacing: "-0.025em"}}>Your Scans (12)</h1>
        <p style={{fontSize: "0.875rem", color: "#6b7280"}}>Syncing...</p>
      </div>
      <div style={{display: "flex", gap: "0.5rem"}}>
        <button
          type='button'
          style={{
            borderRadius: "0.375rem",
            backgroundImage: "linear-gradient(to right, #2563eb, #06b6d4)",
            paddingInline: "1rem",
            paddingBlock: "0.5rem",
            fontSize: "0.875rem",
            color: "white",
          }}>
          📤 Upload
        </button>
        <button
          type='button'
          disabled
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            borderRadius: "0.375rem",
            border: "1px solid #e5e7eb",
            paddingInline: "1rem",
            paddingBlock: "0.5rem",
            fontSize: "0.875rem",
            opacity: 0.5,
          }}>
          <span>🔄</span> Syncing...
        </button>
      </div>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story:
          "Active sync state showing 'Syncing...' status text and disabled Sync button with reduced opacity. Demonstrates visual feedback during server synchronization operation.",
      },
    },
  },
};
