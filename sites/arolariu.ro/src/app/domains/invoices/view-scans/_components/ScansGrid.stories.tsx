import type {Meta, StoryObj} from "@storybook/react";
import {TbArrowRight, TbFileInvoice, TbPhoto, TbUpload} from "react-icons/tb";

/**
 * @remarks Static preview — component requires `useScans` Zustand store hook
 * which depends on server-side scan upload infrastructure and `CachedScan` state
 * unavailable in Storybook. The store requires pre-populated scan blobs from
 * Azure Blob Storage, making a real render infeasible without a mock store provider.
 */
const meta = {
  title: "Invoices/ViewScans/ScansGrid",
  parameters: {
    layout: "fullscreen",
  },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

/** Grid with scan cards. */
export const Default: Story = {
  render: () => (
    <div style={{display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: "1rem"}}>
      {["Receipt-001.jpg", "Receipt-002.png", "Receipt-003.jpg", "Receipt-004.png"].map((name) => (
        <div
          key={name}
          style={{position: "relative", cursor: "pointer", borderRadius: "0.75rem", border: "1px solid #e5e7eb"}}>
          <div style={{position: "relative", aspectRatio: "3/4", overflow: "hidden", borderTopLeftRadius: "0.75rem", borderTopRightRadius: "0.75rem", backgroundColor: "#f3f4f6"}}>
            <div style={{display: "flex", height: "100%", alignItems: "center", justifyContent: "center"}}>
              <TbPhoto style={{height: "3rem", width: "3rem", color: "#d1d5db"}} />
            </div>
          </div>
          <div style={{padding: "0.75rem"}}>
            <p style={{fontSize: "0.875rem", fontWeight: 500}}>{name}</p>
            <p style={{fontSize: "0.75rem", color: "#6b7280"}}>Uploaded 2 hours ago</p>
          </div>
        </div>
      ))}
    </div>
  ),
};

/** Loading skeleton state. */
export const Loading: Story = {
  render: () => (
    <div style={{minHeight: "400px", padding: "1rem"}}>
      <div style={{display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: "1rem"}}>
        {Array.from({length: 6}, (_, i) => (
          <div
            key={`skeleton-${String(i + 1)}`}
            style={{height: "16rem", borderRadius: "0.75rem", backgroundColor: "#e5e7eb"}}
          />
        ))}
      </div>
    </div>
  ),
};

/** Empty state with upload CTA. */
export const EmptyState: Story = {
  render: () => (
    <div style={{display: "flex", alignItems: "center", justifyContent: "center", paddingBlock: "3rem"}}>
      <div style={{marginInline: "auto", maxWidth: "42rem", borderRadius: "0.75rem", border: "1px solid #e5e7eb", padding: "2rem", textAlign: "center"}}>
        <div style={{marginInline: "auto", marginBottom: "1rem", display: "flex", height: "4rem", width: "4rem", alignItems: "center", justifyContent: "center", borderRadius: "9999px", backgroundColor: "#f3f4f6"}}>
          <TbPhoto style={{height: "2rem", width: "2rem", color: "#9ca3af"}} />
        </div>
        <h3 style={{fontSize: "1.125rem", fontWeight: 600}}>No scans yet</h3>
        <p style={{marginTop: "0.25rem", fontSize: "0.875rem", color: "#6b7280"}}>Upload receipt photos to get started with invoice processing.</p>

        <div style={{marginTop: "1.5rem", display: "flex", flexDirection: "column", gap: "0.75rem"}}>
          {[
            {step: 1, icon: <TbUpload style={{height: "1rem", width: "1rem", color: "#3b82f6"}} />, title: "Upload Scans", desc: "Take a photo or upload an image"},
            {step: 2, icon: <TbPhoto style={{height: "1rem", width: "1rem", color: "#a855f7"}} />, title: "Review", desc: "Check extracted data"},
            {
              step: 3,
              icon: <TbFileInvoice style={{height: "1rem", width: "1rem", color: "#22c55e"}} />,
              title: "Create Invoice",
              desc: "Generate invoice from scan",
            },
          ].map((s) => (
            <div
              key={s.step}
              style={{display: "flex", alignItems: "center", gap: "0.75rem", textAlign: "left"}}>
              <span style={{display: "flex", height: "1.5rem", width: "1.5rem", alignItems: "center", justifyContent: "center", borderRadius: "9999px", backgroundColor: "#dbeafe", fontSize: "0.75rem", fontWeight: 500, color: "#2563eb"}}>
                {s.step}
              </span>
              <div style={{display: "flex", alignItems: "center", gap: "0.5rem"}}>
                {s.icon}
                <div>
                  <p style={{fontSize: "0.875rem", fontWeight: 500}}>{s.title}</p>
                  <p style={{fontSize: "0.75rem", color: "#6b7280"}}>{s.desc}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div style={{marginTop: "1.5rem", display: "flex", justifyContent: "center", gap: "0.75rem"}}>
          <button style={{display: "flex", alignItems: "center", gap: "0.5rem", borderRadius: "0.375rem", backgroundColor: "#2563eb", paddingInline: "1rem", paddingBlock: "0.5rem", fontSize: "0.875rem", color: "#ffffff"}}>
            <TbUpload style={{height: "1rem", width: "1rem"}} />
            Upload Scans
          </button>
          <button style={{display: "flex", alignItems: "center", gap: "0.5rem", borderRadius: "0.375rem", border: "1px solid #e5e7eb", paddingInline: "1rem", paddingBlock: "0.5rem", fontSize: "0.875rem"}}>
            Learn More
            <TbArrowRight style={{height: "1rem", width: "1rem"}} />
          </button>
        </div>
      </div>
    </div>
  ),
};
