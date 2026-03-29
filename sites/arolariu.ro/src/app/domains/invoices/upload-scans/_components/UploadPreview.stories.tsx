import type {Meta, StoryObj} from "@storybook/react";

/**
 * UploadPreview displays a grid of pending file uploads with status indicators,
 * progress bars, and remove buttons. Depends on `useScanUpload`.
 *
 * This story renders static previews of various upload states.
 */
const meta = {
  title: "Invoices/UploadScans/UploadPreview",
  parameters: {
    layout: "centered",
  },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

/** Mixed upload states — pending, uploading, completed, failed. */
export const MixedStates: Story = {
  render: () => (
    <div>
      <div style={{marginBottom: "1rem"}}>
        <h2 style={{fontSize: "1.125rem", fontWeight: 600}}>Pending Uploads (4)</h2>
      </div>
      <div style={{display: "grid", gap: "1rem", gridTemplateColumns: "repeat(4, 1fr)"}}>
        {/* Pending */}
        <div style={{overflow: "hidden", borderRadius: "0.5rem", border: "1px solid #e5e7eb", backgroundColor: "white"}}>
          <div style={{position: "relative", aspectRatio: "4/3", backgroundColor: "#f3f4f6"}}>
            <img
              src='https://picsum.photos/seed/upload1/400/300'
              alt='Pending upload'
              style={{height: "100%", width: "100%", objectFit: "cover"}}
            />
            <div style={{position: "absolute", top: "0.5rem", right: "0.5rem"}}>
              <span
                style={{
                  borderRadius: "9999px",
                  backgroundColor: "rgba(107,114,128,0.8)",
                  paddingInline: "0.5rem",
                  paddingBlock: "0.125rem",
                  fontSize: "0.75rem",
                  color: "white",
                }}>
                Pending
              </span>
            </div>
            <button
              type='button'
              style={{
                position: "absolute",
                top: "0.5rem",
                left: "0.5rem",
                borderRadius: "9999px",
                backgroundColor: "rgba(0,0,0,0.5)",
                padding: "0.25rem",
                color: "white",
              }}>
              🗑
            </button>
          </div>
          <div style={{padding: "0.5rem"}}>
            <p style={{overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: "0.875rem", fontWeight: 500}}>
              receipt-01.jpg
            </p>
            <p style={{fontSize: "0.75rem", color: "#6b7280"}}>1.2 MB</p>
          </div>
        </div>

        {/* Uploading */}
        <div style={{overflow: "hidden", borderRadius: "0.5rem", border: "1px solid #e5e7eb", backgroundColor: "white"}}>
          <div style={{position: "relative", aspectRatio: "4/3", backgroundColor: "#f3f4f6"}}>
            <img
              src='https://picsum.photos/seed/upload2/400/300'
              alt='Uploading scan'
              style={{height: "100%", width: "100%", objectFit: "cover"}}
            />
            <div
              style={{
                position: "absolute",
                inset: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: "rgba(59,130,246,0.3)",
              }}>
              <span style={{fontSize: "1.5rem"}}>⏳</span>
            </div>
            <div style={{position: "absolute", top: "0.5rem", right: "0.5rem"}}>
              <span
                style={{
                  borderRadius: "9999px",
                  backgroundColor: "rgba(59,130,246,0.8)",
                  paddingInline: "0.5rem",
                  paddingBlock: "0.125rem",
                  fontSize: "0.75rem",
                  color: "white",
                }}>
                Uploading
              </span>
            </div>
          </div>
          <div style={{padding: "0.5rem"}}>
            <p style={{overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: "0.875rem", fontWeight: 500}}>
              receipt-02.png
            </p>
            <p style={{fontSize: "0.75rem", color: "#6b7280"}}>2.5 MB</p>
            <div
              style={{
                marginTop: "0.25rem",
                height: "0.375rem",
                width: "100%",
                overflow: "hidden",
                borderRadius: "0.25rem",
                backgroundColor: "#e5e7eb",
              }}>
              <div style={{height: "100%", backgroundColor: "#3b82f6", width: "65%"}} />
            </div>
            <p style={{fontSize: "0.75rem", color: "#6b7280"}}>65%</p>
          </div>
        </div>

        {/* Completed */}
        <div style={{overflow: "hidden", borderRadius: "0.5rem", border: "1px solid #e5e7eb", backgroundColor: "white"}}>
          <div style={{position: "relative", aspectRatio: "4/3", backgroundColor: "#f3f4f6"}}>
            <img
              src='https://picsum.photos/seed/upload3/400/300'
              alt='Completed upload'
              style={{height: "100%", width: "100%", objectFit: "cover"}}
            />
            <div
              style={{
                position: "absolute",
                inset: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: "rgba(34,197,94,0.3)",
              }}>
              <span style={{fontSize: "1.5rem"}}>✅</span>
            </div>
            <div style={{position: "absolute", top: "0.5rem", right: "0.5rem"}}>
              <span
                style={{
                  borderRadius: "9999px",
                  backgroundColor: "rgba(34,197,94,0.8)",
                  paddingInline: "0.5rem",
                  paddingBlock: "0.125rem",
                  fontSize: "0.75rem",
                  color: "white",
                }}>
                Completed
              </span>
            </div>
          </div>
          <div style={{padding: "0.5rem"}}>
            <p style={{overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: "0.875rem", fontWeight: 500}}>
              receipt-03.jpg
            </p>
            <p style={{fontSize: "0.75rem", color: "#6b7280"}}>800 KB</p>
          </div>
        </div>

        {/* Failed */}
        <div style={{overflow: "hidden", borderRadius: "0.5rem", border: "1px solid #e5e7eb", backgroundColor: "white"}}>
          <div style={{position: "relative", aspectRatio: "4/3", backgroundColor: "#f3f4f6"}}>
            <img
              src='https://picsum.photos/seed/upload4/400/300'
              alt='Failed upload'
              style={{height: "100%", width: "100%", objectFit: "cover"}}
            />
            <div
              style={{
                position: "absolute",
                inset: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: "rgba(239,68,68,0.3)",
              }}>
              <span style={{fontSize: "1.5rem"}}>❌</span>
            </div>
            <div style={{position: "absolute", top: "0.5rem", right: "0.5rem"}}>
              <span
                style={{
                  borderRadius: "9999px",
                  backgroundColor: "rgba(239,68,68,0.8)",
                  paddingInline: "0.5rem",
                  paddingBlock: "0.125rem",
                  fontSize: "0.75rem",
                  color: "white",
                }}>
                Failed
              </span>
            </div>
            <button
              type='button'
              style={{
                position: "absolute",
                top: "0.5rem",
                left: "0.5rem",
                borderRadius: "9999px",
                backgroundColor: "rgba(0,0,0,0.5)",
                padding: "0.25rem",
                color: "white",
              }}>
              🗑
            </button>
          </div>
          <div style={{padding: "0.5rem"}}>
            <p style={{overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: "0.875rem", fontWeight: 500}}>
              invoice.pdf
            </p>
            <p style={{fontSize: "0.75rem", color: "#6b7280"}}>5.1 MB</p>
            <p style={{fontSize: "0.75rem", color: "#ef4444"}}>Upload failed. Please try again.</p>
          </div>
        </div>
      </div>
    </div>
  ),
};
