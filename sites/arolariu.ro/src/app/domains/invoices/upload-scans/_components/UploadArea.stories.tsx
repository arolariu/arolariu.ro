import type {Meta, StoryObj} from "@storybook/react";

/**
 * UploadArea provides a drag-and-drop area for uploading receipt scans.
 * Depends on `useScanUpload` context.
 *
 * This story renders static previews of the empty and compact upload area states.
 */
const meta = {
  title: "Invoices/UploadScans/UploadArea",
  parameters: {
    layout: "centered",
  },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

/** Empty state — no files selected yet. */
export const EmptyState: Story = {
  render: () => (
    <div style={{display: "flex", cursor: "pointer", flexDirection: "column", alignItems: "center", gap: "1rem", borderRadius: "1rem", border: "2px dashed #d1d5db", padding: "3rem", textAlign: "center"}}>
      <div style={{display: "flex", height: "4rem", width: "4rem", alignItems: "center", justifyContent: "center", borderRadius: "9999px", backgroundColor: "#dbeafe"}}>
        <span style={{fontSize: "1.5rem"}}>📤</span>
      </div>
      <h3 style={{fontSize: "1.25rem", fontWeight: 600}}>Upload Receipt Scans</h3>
      <p style={{fontSize: "0.875rem", color: "#6b7280"}}>Drag &amp; drop your files here, or click to browse</p>
      <p style={{fontSize: "0.75rem", color: "#9ca3af"}}>Supported: JPG, PNG, PDF • Max 10MB per file</p>
      <p style={{fontSize: "0.75rem", color: "#9ca3af"}}>Files are uploaded to secure Azure storage</p>
      <span style={{borderRadius: "0.375rem", backgroundImage: "linear-gradient(to right, #2563eb, #06b6d4)", paddingInline: "2rem", paddingBlock: "0.75rem", fontSize: "1.125rem", color: "white", boxShadow: "0 10px 15px rgba(0,0,0,0.1)"}}>Choose Files</span>
    </div>
  ),
};

/** Drag active state. */
export const DragActive: Story = {
  render: () => (
    <div style={{display: "flex", cursor: "pointer", flexDirection: "column", alignItems: "center", gap: "1rem", borderRadius: "1rem", border: "2px dashed #3b82f6", backgroundColor: "#eff6ff", padding: "3rem", textAlign: "center"}}>
      <div style={{display: "flex", height: "4rem", width: "4rem", alignItems: "center", justifyContent: "center", borderRadius: "9999px", backgroundColor: "#bfdbfe"}}>
        <span style={{fontSize: "1.5rem"}}>📤</span>
      </div>
      <h3 style={{fontSize: "1.25rem", fontWeight: 600}}>Upload Receipt Scans</h3>
      <p style={{fontSize: "0.875rem", fontWeight: 500, color: "#2563eb"}}>Drop your files here!</p>
    </div>
  ),
};

/** Compact state — files already added. */
export const CompactWithActions: Story = {
  render: () => (
    <div style={{display: "flex", flexDirection: "column", gap: "1rem"}}>
      <div style={{display: "flex", cursor: "pointer", alignItems: "center", gap: "1rem", borderRadius: "0.75rem", border: "2px dashed #d1d5db", padding: "1rem"}}>
        <div style={{display: "flex", height: "2.5rem", width: "2.5rem", alignItems: "center", justifyContent: "center", borderRadius: "9999px", backgroundColor: "#dbeafe"}}>
          <span>📤</span>
        </div>
        <div>
          <p style={{fontSize: "0.875rem", fontWeight: 500}}>Drag &amp; drop more files, or click to browse</p>
          <p style={{fontSize: "0.75rem", color: "#9ca3af"}}>JPG, PNG, PDF • Max 10MB</p>
        </div>
      </div>
      <div style={{display: "flex", justifyContent: "flex-end", gap: "0.5rem"}}>
        <button
          type='button'
          style={{borderRadius: "0.375rem", border: "1px solid #e5e7eb", paddingInline: "1rem", paddingBlock: "0.5rem", fontSize: "0.875rem"}}>
          Clear All
        </button>
        <button
          type='button'
          style={{borderRadius: "0.375rem", backgroundImage: "linear-gradient(to right, #2563eb, #06b6d4)", paddingInline: "1rem", paddingBlock: "0.5rem", fontSize: "0.875rem", color: "white"}}>
          Upload Scans
        </button>
      </div>
    </div>
  ),
};
