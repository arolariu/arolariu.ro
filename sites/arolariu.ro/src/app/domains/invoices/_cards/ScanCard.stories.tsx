import type {Meta, StoryObj} from "@storybook/react";

/**
 * ScanCard displays an individual scan with preview, selection checkbox,
 * file info, and delete action. Depends on `useScansStore` and `deleteScan`.
 *
 * This story renders a static preview of the scan card.
 */
const meta = {
  title: "Invoices/Shared/ScanCard",
  parameters: {
    layout: "centered",
  },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

/** Image scan card with file details. */
export const ImageScan: Story = {
  render: () => (
    <div
      style={{
        overflow: "hidden",
        borderRadius: "0.5rem",
        border: "1px solid #e5e7eb",
        backgroundColor: "white",
        boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
      }}>
      <div style={{position: "relative", aspectRatio: "4/3", backgroundColor: "#f3f4f6"}}>
        <img
          src='https://picsum.photos/seed/scancard/400/300'
          alt='receipt.jpg scan'
          style={{height: "100%", width: "100%", objectFit: "cover"}}
        />
        <div style={{position: "absolute", top: "0.5rem", right: "0.5rem"}}>
          <input
            type='checkbox'
            style={{height: "1.25rem", width: "1.25rem"}}
          />
        </div>
        <div style={{position: "absolute", top: "0.5rem", left: "0.5rem"}}>
          <button
            type='button'
            style={{
              borderRadius: "9999px",
              backgroundColor: "rgba(255,255,255,0.8)",
              padding: "0.25rem",
              fontSize: "0.75rem",
              boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
            }}>
            ⋮
          </button>
        </div>
      </div>
      <div style={{padding: "0.75rem"}}>
        <p style={{overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: "0.875rem", fontWeight: 500}}>
          grocery-receipt-2025-01.jpg
        </p>
        <div style={{display: "flex", justifyContent: "space-between", fontSize: "0.75rem", color: "#6b7280"}}>
          <span>1.2 MB</span>
          <span>Jan 15, 2025</span>
        </div>
      </div>
    </div>
  ),
};

/** PDF scan card. */
export const PdfScan: Story = {
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
          position: "relative",
          display: "flex",
          aspectRatio: "4/3",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#fef2f2",
        }}>
        <span style={{fontSize: "2.25rem", color: "#f87171"}}>📄</span>
        <div style={{position: "absolute", top: "0.5rem", right: "0.5rem"}}>
          <input
            type='checkbox'
            style={{height: "1.25rem", width: "1.25rem"}}
          />
        </div>
      </div>
      <div style={{padding: "0.75rem"}}>
        <p style={{overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: "0.875rem", fontWeight: 500}}>
          invoice-scan.pdf
        </p>
        <div style={{display: "flex", justifyContent: "space-between", fontSize: "0.75rem", color: "#6b7280"}}>
          <span>3.4 MB</span>
          <span>Jan 10, 2025</span>
        </div>
      </div>
    </div>
  ),
};

/** Selected scan card with ring highlight. */
export const Selected: Story = {
  render: () => (
    <div
      style={{
        overflow: "hidden",
        borderRadius: "0.5rem",
        border: "1px solid #e5e7eb",
        backgroundColor: "white",
        boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
        outline: "2px solid #a855f7",
        outlineOffset: "2px",
      }}>
      <div style={{position: "relative", aspectRatio: "4/3", backgroundColor: "#f3f4f6"}}>
        <img
          src='https://picsum.photos/seed/scancard2/400/300'
          alt='selected.jpg scan'
          style={{height: "100%", width: "100%", objectFit: "cover"}}
        />
        <div style={{position: "absolute", top: "0.5rem", right: "0.5rem"}}>
          <input
            type='checkbox'
            checked
            readOnly
            style={{height: "1.25rem", width: "1.25rem", accentColor: "#a855f7"}}
          />
        </div>
      </div>
      <div style={{padding: "0.75rem"}}>
        <p style={{overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: "0.875rem", fontWeight: 500}}>
          selected-scan.jpg
        </p>
        <div style={{display: "flex", justifyContent: "space-between", fontSize: "0.75rem", color: "#6b7280"}}>
          <span>800 KB</span>
          <span>Jan 12, 2025</span>
        </div>
      </div>
    </div>
  ),
};

/** Scan linked to an invoice. */
export const LinkedToInvoice: Story = {
  render: () => (
    <div
      style={{
        overflow: "hidden",
        borderRadius: "0.5rem",
        border: "1px solid #e5e7eb",
        backgroundColor: "white",
        boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
      }}>
      <div style={{position: "relative", aspectRatio: "4/3", backgroundColor: "#f3f4f6"}}>
        <img
          src='https://picsum.photos/seed/scancard3/400/300'
          alt='linked.jpg scan'
          style={{height: "100%", width: "100%", objectFit: "cover"}}
        />
        <div style={{position: "absolute", bottom: "0.5rem", left: "0.5rem"}}>
          <span
            style={{
              borderRadius: "9999px",
              backgroundColor: "#dbeafe",
              paddingInline: "0.5rem",
              paddingBlock: "0.125rem",
              fontSize: "0.75rem",
              color: "#1e40af",
            }}>
            🔗 Linked
          </span>
        </div>
      </div>
      <div style={{padding: "0.75rem"}}>
        <p style={{overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: "0.875rem", fontWeight: 500}}>
          linked-receipt.jpg
        </p>
        <div style={{display: "flex", justifyContent: "space-between", fontSize: "0.75rem", color: "#6b7280"}}>
          <span>950 KB</span>
          <span>Jan 8, 2025</span>
        </div>
      </div>
    </div>
  ),
};
