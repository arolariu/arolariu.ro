import type {Meta, StoryObj} from "@storybook/react";
import {
  TbBolt,
  TbBrain,
  TbBuildingStore,
  TbChartBar,
  TbCheck,
  TbClock,
  TbReceipt,
  TbScanEye,
  TbShoppingCart,
  TbSparkles,
} from "react-icons/tb";

/**
 * Static visual preview of the AnalyzeDialog component.
 *
 * The actual component depends on `useDialog` context and server actions,
 * so this story renders a faithful HTML replica of the dialog content
 * including analysis options, enhancements, and summary.
 */
const meta = {
  title: "Invoices/EditInvoice/Dialogs/AnalyzeDialog",
  parameters: {
    layout: "centered",
  },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

/** Default dialog content with analysis options. */
export const Default: Story = {
  render: () => (
    <div
      style={{
        borderRadius: "0.75rem",
        border: "1px solid #e5e7eb",
        backgroundColor: "#fff",
        boxShadow: "0 20px 25px -5px rgba(0,0,0,.1),0 8px 10px -6px rgba(0,0,0,.1)",
      }}>
      {/* Header */}
      <div style={{borderBottom: "1px solid #e5e7eb", padding: "1.5rem"}}>
        <h2 style={{display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "1.125rem", fontWeight: 600}}>
          <TbScanEye style={{height: "1.5rem", width: "1.5rem", color: "#a855f7"}} />
          Analyze Invoice
        </h2>
        <p style={{marginTop: "0.25rem", fontSize: "0.875rem", color: "#6b7280"}}>
          Choose analysis type for invoice{" "}
          <code style={{borderRadius: "0.25rem", backgroundColor: "#f3f4f6", paddingInline: "0.25rem", fontSize: "0.75rem"}}>a1b2c3d4</code>
          ...
        </p>
      </div>

      {/* Options Grid */}
      <div style={{padding: "1.5rem", display: "flex", flexDirection: "column", gap: "1rem"}}>
        <p style={{fontSize: "0.875rem", fontWeight: 500}}>Analysis Type</p>
        <div style={{display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: "0.75rem"}}>
          {[
            {
              icon: <TbBrain style={{height: "1.5rem", width: "1.5rem"}} />,
              title: "Complete Analysis",
              time: "~30 sec",
              recommended: true,
              selected: true,
            },
            {
              icon: <TbReceipt style={{height: "1.5rem", width: "1.5rem"}} />,
              title: "Invoice Only",
              time: "~10 sec",
              recommended: false,
              selected: false,
            },
            {
              icon: <TbShoppingCart style={{height: "1.5rem", width: "1.5rem"}} />,
              title: "Items Only",
              time: "~15 sec",
              recommended: false,
              selected: false,
            },
            {
              icon: <TbBuildingStore style={{height: "1.5rem", width: "1.5rem"}} />,
              title: "Merchant Only",
              time: "~8 sec",
              recommended: false,
              selected: false,
            },
          ].map((opt) => (
            <div
              key={opt.title}
              style={{
                cursor: "pointer",
                borderRadius: "0.5rem",
                border: "2px solid",
                padding: "1rem",
                transition: "all 150ms",
                ...(opt.selected ? {borderColor: "#a855f7"} : {borderColor: "#e5e7eb"}),
              }}>
              <div style={{display: "flex", alignItems: "flex-start", justifyContent: "space-between"}}>
                <div style={{...(opt.selected ? {color: "#9333ea"} : {color: "#9ca3af"})}}>{opt.icon}</div>
                <div style={{display: "flex", alignItems: "center", gap: "0.25rem"}}>
                  {opt.recommended && (
                    <span
                      style={{
                        borderRadius: "9999px",
                        backgroundColor: "#f3e8ff",
                        paddingInline: "0.5rem",
                        paddingBlock: "0.125rem",
                        fontSize: "0.75rem",
                        color: "#7e22ce",
                      }}>
                      Recommended
                    </span>
                  )}
                  {opt.selected && <TbCheck style={{height: "1.25rem", width: "1.25rem", color: "#a855f7"}} />}
                </div>
              </div>
              <h4 style={{marginTop: "0.5rem", fontWeight: 600}}>{opt.title}</h4>
              <div
                style={{
                  marginTop: "0.25rem",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.25rem",
                  fontSize: "0.75rem",
                  color: "#6b7280",
                }}>
                <TbClock style={{height: "0.75rem", width: "0.75rem"}} />
                <span>{opt.time}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Features */}
        <div>
          <p style={{marginBottom: "0.5rem", fontSize: "0.875rem", fontWeight: 500}}>Included Features</p>
          <div style={{display: "flex", flexWrap: "wrap", gap: "0.5rem"}}>
            {["OCR Extraction", "Item Categorization", "Merchant ID", "Price Analysis", "Receipt Validation"].map((f) => (
              <span
                key={f}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.25rem",
                  borderRadius: "9999px",
                  border: "1px solid #e5e7eb",
                  paddingInline: "0.625rem",
                  paddingBlock: "0.25rem",
                  fontSize: "0.75rem",
                }}>
                <TbCheck style={{height: "0.75rem", width: "0.75rem", color: "#22c55e"}} />
                {f}
              </span>
            ))}
          </div>
        </div>

        <hr />

        {/* Enhancements */}
        <div>
          <p style={{marginBottom: "0.5rem", fontSize: "0.875rem", fontWeight: 500}}>Enhancements (Optional)</p>
          <div style={{display: "flex", flexDirection: "column", gap: "0.5rem"}}>
            {[
              {
                icon: <TbChartBar style={{height: "1rem", width: "1rem"}} />,
                label: "Price Comparison",
                desc: "Compare prices across merchants",
              },
              {
                icon: <TbSparkles style={{height: "1rem", width: "1rem"}} />,
                label: "Savings Tips",
                desc: "Get personalized saving recommendations",
              },
              {icon: <TbBolt style={{height: "1rem", width: "1rem"}} />, label: "Quick Extract", desc: "Prioritize speed over detail"},
            ].map((e) => (
              <div
                key={e.label}
                style={{display: "flex", alignItems: "center", gap: "0.75rem"}}>
                <input
                  type='checkbox'
                  style={{height: "1rem", width: "1rem", borderRadius: "0.25rem", border: "1px solid #e5e7eb"}}
                  readOnly
                />
                <div style={{display: "flex", alignItems: "center", gap: "0.5rem"}}>
                  {e.icon}
                  <div>
                    <p style={{fontSize: "0.875rem", fontWeight: 500}}>{e.label}</p>
                    <p style={{fontSize: "0.75rem", color: "#6b7280"}}>{e.desc}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div style={{display: "flex", justifyContent: "flex-end", gap: "0.5rem", borderTop: "1px solid #e5e7eb", padding: "1rem"}}>
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
