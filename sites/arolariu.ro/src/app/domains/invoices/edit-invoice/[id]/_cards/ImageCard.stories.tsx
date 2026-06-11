import type {Meta, StoryObj} from "@storybook/react";
import ImageCard from "./ImageCard";
import {storyInvoice, WithEditInvoiceContext, WithInvoiceDialogs} from "@/app/domains/invoices/_storybook";

/**
 * ImageCard displays receipt images with navigation, zoom, and add/remove controls.
 *
 * ## Static Preview Blocker
 *
 * **Cannot mount real component** because it requires both:
 * 1. `useDialog` hook from DialogContext (via `useDialog("EDIT_INVOICE__ADD_SCAN", ...)`)
 * 2. `EditInvoiceContext` for invoice data and state management
 * 3. Complex modal/dialog orchestration that does not render meaningfully in isolation
 *
 * Storybook mounting requires wrapping in `WithEditInvoiceContext` and `WithInvoiceDialogs`,
 * which depend on runtime invoice state and server action mocks that are not suitable for
 * static component documentation.
 *
 * **Alternatives attempted:**
 * - Wrapping with WithEditInvoiceContext + WithInvoiceDialogs results in dialog state pollution
 *   between stories and incomplete rendering of modal stacks
 * - Component has no meaningful "prop-based" API—all interactions are context-driven
 *
 * **Decision:** Use static preview to document layout and visual structure.
 * Integration testing via Playwright validates full component behavior with real contexts.
 */
const meta = {
  title: "Invoices/EditInvoice/Cards/ImageCard",
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "Displays receipt scan gallery with navigation, zoom dialog, and add/remove controls. Depends on DialogContext and EditInvoiceContext—see component docs for integration details.",
      },
    },
  },
  tags: ["autodocs"],
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Static preview of image card layout with single scan.
 * Shows card structure, image preview area, and action buttons (Expand, Add Scan, Remove).
 */
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
  parameters: {
    docs: {
      description: {
        story:
          "Single scan card layout showing image preview, expand button for zoom dialog, and add/remove controls. Placeholder image demonstrates aspect ratio and layout.",
      },
    },
  },
};

/**
 * Static preview with multiple scans showing navigation indicator (2/3) and Previous/Next buttons.
 */
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
  parameters: {
    docs: {
      description: {
        story:
          "Multi-scan gallery state showing scan position indicator (2/3) and Previous/Next navigation buttons. Demonstrates navigation UI that appears only when invoice has multiple scans.",
      },
    },
  },
};
