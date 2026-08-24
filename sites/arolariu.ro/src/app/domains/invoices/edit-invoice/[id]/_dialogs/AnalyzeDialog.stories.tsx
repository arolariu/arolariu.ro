import type {Meta, StoryObj} from "@storybook/react";
import {TbBrain, TbReceipt, TbScanEye, TbShoppingCart} from "react-icons/tb";

/**
 * Static visual preview of the AnalyzeDialog component.
 *
 * The actual component depends on `useDialog` context and server actions,
 * so this story renders a faithful HTML replica of the dialog content:
 * analysis controls (profile + capability selection) and the queued state.
 */
const meta = {
  title: "Invoices/EditInvoice/Dialogs/AnalyzeDialog",
  parameters: {
    layout: "centered",
  },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

/** Idle state — controls visible, ready to submit. */
export const Default: Story = {
  render: () => (
    <div
      style={{
        borderRadius: "0.75rem",
        border: "1px solid #e5e7eb",
        backgroundColor: "#fff",
        boxShadow: "0 20px 25px -5px rgba(0,0,0,.1),0 8px 10px -6px rgba(0,0,0,.1)",
        maxWidth: "36rem",
        width: "100%",
      }}>
      {/* Header */}
      <div style={{borderBottom: "1px solid #e5e7eb", padding: "1.5rem"}}>
        <h2 style={{display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "1.125rem", fontWeight: 600}}>
          <TbScanEye style={{height: "1.5rem", width: "1.5rem", color: "#a855f7"}} />
          Analyze Invoice
        </h2>
        <p style={{marginTop: "0.25rem", fontSize: "0.875rem", color: "#6b7280"}}>
          Configure AI-powered analysis for invoice{" "}
          <code
            style={{
              borderRadius: "0.25rem",
              backgroundColor: "#f3f4f6",
              paddingInline: "0.25rem",
              fontSize: "0.75rem",
            }}>
            a1b2c3d4
          </code>
          ...
        </p>
      </div>

      {/* Analysis Controls (static replica) */}
      <div style={{padding: "1.5rem", display: "flex", flexDirection: "column", gap: "1rem"}}>
        <p style={{fontSize: "0.875rem", fontWeight: 500}}>Analysis Profile</p>
        <div style={{display: "flex", gap: "1.5rem"}}>
          {(
            [
              {id: "fast", icon: <TbShoppingCart />, label: "Fast"},
              {id: "balanced", icon: <TbReceipt />, label: "Balanced"},
              {id: "comprehensive", icon: <TbBrain />, label: "Comprehensive", selected: true},
            ] as const
          ).map((opt) => (
            <label
              key={opt.id}
              style={{display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer"}}>
              <input
                type='radio'
                name='profile'
                defaultChecked={"selected" in opt && opt.selected}
              />
              {opt.label}
            </label>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div
        style={{
          display: "flex",
          justifyContent: "flex-end",
          gap: "0.5rem",
          borderTop: "1px solid #e5e7eb",
          padding: "1rem",
        }}>
        <button
          style={{
            borderRadius: "0.375rem",
            border: "1px solid #e5e7eb",
            paddingInline: "1rem",
            paddingBlock: "0.5rem",
            fontSize: "0.875rem",
          }}>
          Cancel
        </button>
        <button
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            borderRadius: "0.375rem",
            backgroundColor: "#9333ea",
            paddingInline: "1rem",
            paddingBlock: "0.5rem",
            fontSize: "0.875rem",
            color: "#fff",
          }}>
          <TbScanEye style={{height: "1rem", width: "1rem"}} />
          Start Analysis
        </button>
      </div>
    </div>
  ),
};

/** Queued state — shown after a successful 202 submission. */
export const Queued: Story = {
  render: () => (
    <div
      style={{
        borderRadius: "0.75rem",
        border: "1px solid #e5e7eb",
        backgroundColor: "#fff",
        boxShadow: "0 20px 25px -5px rgba(0,0,0,.1),0 8px 10px -6px rgba(0,0,0,.1)",
        maxWidth: "36rem",
        width: "100%",
      }}>
      <div style={{borderBottom: "1px solid #e5e7eb", padding: "1.5rem"}}>
        <h2 style={{display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "1.125rem", fontWeight: 600}}>
          <TbScanEye style={{height: "1.5rem", width: "1.5rem", color: "#a855f7"}} />
          Analyze Invoice
        </h2>
      </div>
      <div style={{padding: "1.5rem", display: "flex", flexDirection: "column", gap: "0.75rem"}}>
        <p style={{fontSize: "0.875rem", fontWeight: 500, color: "#6b7280"}}>⏳ Analysis Queued</p>
        <p style={{fontSize: "0.875rem", color: "#6b7280"}}>Your analysis request has been queued and will be processed shortly.</p>
        <p style={{fontSize: "0.75rem", color: "#9ca3af"}}>
          <strong>Message ID:</strong> <code style={{fontSize: "0.75rem"}}>queue-abc-12345</code>
        </p>
        <button
          style={{
            alignSelf: "flex-start",
            borderRadius: "0.375rem",
            border: "1px solid #e5e7eb",
            paddingInline: "0.75rem",
            paddingBlock: "0.375rem",
            fontSize: "0.875rem",
          }}>
          Refresh
        </button>
      </div>
      <div
        style={{
          display: "flex",
          justifyContent: "flex-end",
          borderTop: "1px solid #e5e7eb",
          padding: "1rem",
        }}>
        <button
          style={{
            borderRadius: "0.375rem",
            border: "1px solid #e5e7eb",
            paddingInline: "1rem",
            paddingBlock: "0.5rem",
            fontSize: "0.875rem",
          }}>
          Close
        </button>
      </div>
    </div>
  ),
};
