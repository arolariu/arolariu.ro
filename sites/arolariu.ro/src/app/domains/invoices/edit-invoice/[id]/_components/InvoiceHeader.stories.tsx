import type {Meta, StoryObj} from "@storybook/react";
import InvoiceHeader from "./InvoiceHeader";

/**
 * InvoiceHeader (edit) renders the editable invoice header with inline name
 * editing, save, discard, print, and delete controls.
 *
 * ## Static Preview Blocker
 *
 * **Cannot mount real component** because it requires:
 * 1. `useEditInvoiceContext` hook for invoice state (name, pending changes, save/discard handlers)
 * 2. `useDialog` hook for delete and analysis dialog orchestration
 * 3. `useTranslations` hook with next-intl runtime dictionary
 * 4. Complex state management across invoice editing workflow
 *
 * **Alternatives attempted:**
 * - Wrapping with `WithEditInvoiceContext` and `WithInvoiceDialogs` requires mock server actions
 *   for patchInvoice, deleteInvoice, and AI analysis endpoints
 * - Component has no stable prop-based API—all state is context-driven
 * - Dialog interactions (delete confirmation, AI analysis) do not render meaningfully in isolation
 *
 * **Decision:** Use static preview to document header layout and button states.
 * Integration testing via Playwright validates full behavior with real contexts.
 */
const meta = {
  title: "Invoices/EditInvoice/InvoiceHeader",
  parameters: {
    layout: "fullscreen",
    docs: {
      description: {
        component:
          "Editable invoice header with inline name input, save/discard for pending changes, print, AI analysis, and delete. Depends on EditInvoiceContext and DialogContext—see component docs for integration details.",
      },
    },
  },
  tags: ["autodocs"],
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Static preview of header with no pending changes.
 * Shows editable invoice name input, Print button, and Delete button (destructive red variant).
 */
export const NoChanges: Story = {
  render: () => (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "0.75rem",
        borderBottom: "1px solid #e5e7eb",
        backgroundColor: "#ffffff",
        paddingLeft: "1.5rem",
        paddingRight: "1.5rem",
        paddingTop: "1rem",
        paddingBottom: "1rem",
      }}>
      <div>
        <input
          type='text'
          defaultValue='Weekly Grocery Shopping'
          style={{
            width: "100%",
            border: "none",
            backgroundColor: "transparent",
            fontSize: "1.875rem",
            fontWeight: "700",
            letterSpacing: "-0.025em",
          }}
          readOnly
        />
      </div>
      <div style={{display: "flex", gap: "0.5rem"}}>
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
          🖨 Print
        </button>
        <button
          type='button'
          style={{
            borderRadius: "0.375rem",
            backgroundColor: "#dc2626",
            paddingLeft: "0.75rem",
            paddingRight: "0.75rem",
            paddingTop: "0.375rem",
            paddingBottom: "0.375rem",
            fontSize: "0.875rem",
            color: "#ffffff",
          }}>
          🗑 Delete
        </button>
      </div>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story:
          "Clean state with no unsaved modifications. Only Print and Delete buttons are visible. Save/Discard buttons appear when user edits invoice fields.",
      },
    },
  },
};

/**
 * Static preview with pending changes showing Save and Discard buttons.
 * Demonstrates full button layout when invoice has unsaved modifications.
 */
export const WithPendingChanges: Story = {
  render: () => (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "0.75rem",
        borderBottom: "1px solid #e5e7eb",
        backgroundColor: "#ffffff",
        paddingLeft: "1.5rem",
        paddingRight: "1.5rem",
        paddingTop: "1rem",
        paddingBottom: "1rem",
      }}>
      <div>
        <input
          type='text'
          defaultValue='Weekly Grocery Shopping (edited)'
          style={{
            width: "100%",
            border: "none",
            backgroundColor: "transparent",
            fontSize: "1.875rem",
            fontWeight: "700",
            letterSpacing: "-0.025em",
          }}
          readOnly
        />
      </div>
      <div style={{display: "flex", gap: "0.5rem"}}>
        <button
          type='button'
          style={{
            borderRadius: "0.375rem",
            backgroundColor: "#2563eb",
            paddingLeft: "0.75rem",
            paddingRight: "0.75rem",
            paddingTop: "0.375rem",
            paddingBottom: "0.375rem",
            fontSize: "0.875rem",
            color: "#ffffff",
          }}>
          💾 Save
        </button>
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
          ✕ Discard
        </button>
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
          🖨 Print
        </button>
        <button
          type='button'
          style={{
            borderRadius: "0.375rem",
            backgroundColor: "#dc2626",
            paddingLeft: "0.75rem",
            paddingRight: "0.75rem",
            paddingTop: "0.375rem",
            paddingBottom: "0.375rem",
            fontSize: "0.875rem",
            color: "#ffffff",
          }}>
          🗑 Delete
        </button>
      </div>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story:
          "Active editing state with pending changes. Blue Save button (primary action) and Discard button appear when invoice name or other fields are modified. Demonstrates full action button layout.",
      },
    },
  },
};
