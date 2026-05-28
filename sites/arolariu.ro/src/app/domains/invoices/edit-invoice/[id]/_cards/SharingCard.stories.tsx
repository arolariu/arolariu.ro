import type {Meta, StoryObj} from "@storybook/react";

/**
 * SharingCard displays invoice sharing status and provides controls for
 * managing shared access. Depends on `useDialog`, `useUserInformation`,
 * and `patchInvoice` server action.
 *
 * This story renders a static preview of the sharing card layout.
 */
const meta = {
  title: "Invoices/EditInvoice/Cards/SharingCard",
  parameters: {
    layout: "centered",
  },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

/** Private invoice — no shared users. */
export const PrivateInvoice: Story = {
  render: () => (
    <div style={{borderRadius: "0.5rem", border: "1px solid #e5e7eb", backgroundColor: "white", boxShadow: "0 1px 2px rgba(0,0,0,0.05)"}}>
      <div style={{borderBottom: "1px solid #e5e7eb", padding: "1rem"}}>
        <h3 style={{fontSize: "1.125rem", fontWeight: 600}}>Sharing &amp; Access</h3>
      </div>
      <div style={{display: "flex", flexDirection: "column", gap: "1rem", padding: "1rem"}}>
        <div style={{display: "flex", alignItems: "center", gap: "0.75rem"}}>
          <div
            style={{
              display: "flex",
              height: "2.5rem",
              width: "2.5rem",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: "9999px",
              backgroundColor: "#e5e7eb",
            }}>
            👤
          </div>
          <div>
            <p style={{fontSize: "0.875rem", fontWeight: 500}}>Owner</p>
            <p style={{fontSize: "0.75rem", color: "#6b7280"}}>john.doe</p>
          </div>
          <button
            type='button'
            style={{
              marginLeft: "auto",
              borderRadius: "0.375rem",
              border: "1px solid #e5e7eb",
              padding: "0.375rem 0.75rem",
              fontSize: "0.875rem",
            }}>
            🔒 Manage Sharing
          </button>
        </div>
        <hr />
        <div>
          <h4 style={{marginBottom: "0.5rem", fontSize: "0.875rem", fontWeight: 600}}>Shared With</h4>
          <p style={{fontSize: "0.875rem", color: "#6b7280"}}>This invoice is private and not shared with anyone.</p>
        </div>
      </div>
      <div style={{borderTop: "1px solid #e5e7eb", padding: "1rem"}}>
        <button
          type='button'
          style={{width: "100%", borderRadius: "0.375rem", border: "1px solid #e5e7eb", padding: "0.5rem 1rem", fontSize: "0.875rem"}}>
          🔗 Share Invoice →
        </button>
      </div>
    </div>
  ),
};

/** Public invoice with shared users. */
export const PublicInvoice: Story = {
  render: () => (
    <div style={{borderRadius: "0.5rem", border: "1px solid #e5e7eb", backgroundColor: "white", boxShadow: "0 1px 2px rgba(0,0,0,0.05)"}}>
      <div style={{borderBottom: "1px solid #e5e7eb", padding: "1rem"}}>
        <h3 style={{fontSize: "1.125rem", fontWeight: 600}}>Sharing &amp; Access</h3>
      </div>
      <div style={{display: "flex", flexDirection: "column", gap: "1rem", padding: "1rem"}}>
        <div style={{display: "flex", alignItems: "center", gap: "0.75rem"}}>
          <div
            style={{
              display: "flex",
              height: "2.5rem",
              width: "2.5rem",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: "9999px",
              backgroundColor: "#e5e7eb",
            }}>
            👤
          </div>
          <div>
            <p style={{fontSize: "0.875rem", fontWeight: 500}}>Owner</p>
            <p style={{fontSize: "0.75rem", color: "#6b7280"}}>john.doe</p>
          </div>
        </div>
        <hr />
        <div
          style={{
            borderRadius: "0.375rem",
            border: "1px solid #fdba74",
            backgroundColor: "#fff7ed",
            padding: "0.75rem",
            fontSize: "0.875rem",
            color: "#9a3412",
          }}>
          🌐 <strong>Public Invoice</strong> — Anyone with the link can view this invoice.
        </div>
        <div>
          <h4 style={{marginBottom: "0.5rem", fontSize: "0.875rem", fontWeight: 600}}>Shared With</h4>
          <div style={{display: "flex", flexDirection: "column", gap: "0.5rem"}}>
            <div style={{display: "flex", alignItems: "center", gap: "0.5rem", borderRadius: "0.375rem", padding: "0.5rem"}}>
              <div
                style={{
                  display: "flex",
                  height: "2rem",
                  width: "2rem",
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: "9999px",
                  backgroundColor: "#e5e7eb",
                }}>
                👤
              </div>
              <span style={{fontSize: "0.875rem"}}>user-abc-123</span>
            </div>
          </div>
        </div>
      </div>
      <div style={{display: "flex", flexDirection: "column", gap: "0.5rem", borderTop: "1px solid #e5e7eb", padding: "1rem"}}>
        <button
          type='button'
          style={{width: "100%", borderRadius: "0.375rem", border: "1px solid #e5e7eb", padding: "0.5rem 1rem", fontSize: "0.875rem"}}>
          🔗 Share Invoice →
        </button>
        <button
          type='button'
          style={{
            width: "100%",
            borderRadius: "0.375rem",
            backgroundColor: "#dc2626",
            padding: "0.5rem 1rem",
            fontSize: "0.875rem",
            color: "white",
          }}>
          Mark as Private 🔒
        </button>
      </div>
    </div>
  ),
};
