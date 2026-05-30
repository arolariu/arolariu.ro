import type {Meta, StoryObj} from "@storybook/react";
import {TbDiscFilled} from "react-icons/tb";

/**
 * Static visual preview of the MetadataDialog component.
 *
 * @remarks Static preview — the real component uses `useDialog` context and
 * renders nothing when the dialog is closed. This story renders a faithful
 * HTML replica of the metadata editing form with sample key-value fields.
 *
 * @see {@link MetadataDialog} for the real component implementation
 * @see {@link VALID_METADATA_KEYS} for the predefined metadata key definitions
 */
const meta = {
  title: "Invoices/EditInvoice/Dialogs/MetadataDialog",
  parameters: {
    layout: "centered",
  },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

const sampleMetadata = [
  {key: "loyaltyPoints", label: "Loyalty Points", value: "1250", readonly: false},
  {key: "storeLocation", label: "Store Location", value: "Str. Victoriei 12, Bucharest", readonly: false},
  {key: "cashier", label: "Cashier", value: "Maria P.", readonly: false},
  {key: "receiptNumber", label: "Receipt Number", value: "RCP-2024-00847", readonly: true},
  {key: "transactionId", label: "Transaction ID", value: "TXN-9f3a2b1c", readonly: true},
  {key: "paymentMethod", label: "Payment Method", value: "Credit Card", readonly: false},
];

/** Static preview of the add-metadata dialog form. */
export const AddMetadata: Story = {
  render: () => (
    <div
      style={{
        width: "100%",
        maxWidth: "28rem",
        borderRadius: "0.75rem",
        border: "1px solid #e5e7eb",
        backgroundColor: "#fff",
        boxShadow: "0 20px 25px -5px rgba(0,0,0,.1),0 8px 10px -6px rgba(0,0,0,.1)",
      }}>
      <div style={{borderBottom: "1px solid #e5e7eb", padding: "1.5rem"}}>
        <h2 style={{fontSize: "1.125rem", fontWeight: 600}}>Add Metadata</h2>
        <p style={{marginTop: "0.25rem", fontSize: "0.875rem", color: "#6b7280"}}>Add a new key-value metadata entry to this invoice.</p>
      </div>

      <div style={{padding: "1.5rem", display: "flex", flexDirection: "column", gap: "1rem"}}>
        <div style={{display: "flex", flexDirection: "column", gap: "0.5rem"}}>
          <label style={{fontSize: "0.875rem", fontWeight: 500}}>Key</label>
          <input
            style={{
              width: "100%",
              borderRadius: "0.375rem",
              border: "1px solid #e5e7eb",
              paddingInline: "0.75rem",
              paddingBlock: "0.5rem",
              fontSize: "0.875rem",
            }}
            placeholder='e.g. loyaltyPoints, discountCode'
            defaultValue=''
            readOnly
          />
        </div>
        <div style={{display: "flex", flexDirection: "column", gap: "0.5rem"}}>
          <label style={{fontSize: "0.875rem", fontWeight: 500}}>Value</label>
          <input
            style={{
              width: "100%",
              borderRadius: "0.375rem",
              border: "1px solid #e5e7eb",
              paddingInline: "0.75rem",
              paddingBlock: "0.5rem",
              fontSize: "0.875rem",
            }}
            placeholder='Enter metadata value...'
            defaultValue=''
            readOnly
          />
        </div>
      </div>

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
            backgroundColor: "#111827",
            paddingInline: "1rem",
            paddingBlock: "0.5rem",
            fontSize: "0.875rem",
            color: "#fff",
          }}>
          <TbDiscFilled style={{height: "1rem", width: "1rem"}} />
          Save
        </button>
      </div>
    </div>
  ),
};

/** Static preview of the edit-metadata dialog with pre-filled values. */
export const EditMetadata: Story = {
  render: () => (
    <div
      style={{
        width: "100%",
        maxWidth: "28rem",
        borderRadius: "0.75rem",
        border: "1px solid #e5e7eb",
        backgroundColor: "#fff",
        boxShadow: "0 20px 25px -5px rgba(0,0,0,.1),0 8px 10px -6px rgba(0,0,0,.1)",
      }}>
      <div style={{borderBottom: "1px solid #e5e7eb", padding: "1.5rem"}}>
        <h2 style={{fontSize: "1.125rem", fontWeight: 600}}>Edit Metadata</h2>
        <p style={{marginTop: "0.25rem", fontSize: "0.875rem", color: "#6b7280"}}>Modify the value for this metadata entry.</p>
      </div>

      <div style={{padding: "1.5rem", display: "flex", flexDirection: "column", gap: "1rem"}}>
        <div style={{display: "flex", flexDirection: "column", gap: "0.5rem"}}>
          <label style={{fontSize: "0.875rem", fontWeight: 500}}>Key</label>
          <input
            style={{
              width: "100%",
              borderRadius: "0.375rem",
              border: "1px solid #e5e7eb",
              backgroundColor: "#f9fafb",
              paddingInline: "0.75rem",
              paddingBlock: "0.5rem",
              fontSize: "0.875rem",
              color: "#6b7280",
            }}
            value='paymentMethod'
            disabled
          />
        </div>
        <div style={{display: "flex", flexDirection: "column", gap: "0.5rem"}}>
          <label style={{fontSize: "0.875rem", fontWeight: 500}}>Value</label>
          <input
            style={{
              width: "100%",
              borderRadius: "0.375rem",
              border: "1px solid #e5e7eb",
              paddingInline: "0.75rem",
              paddingBlock: "0.5rem",
              fontSize: "0.875rem",
            }}
            defaultValue='Credit Card'
            readOnly
          />
        </div>
      </div>

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
            backgroundColor: "#111827",
            paddingInline: "1rem",
            paddingBlock: "0.5rem",
            fontSize: "0.875rem",
            color: "#fff",
          }}>
          <TbDiscFilled style={{height: "1rem", width: "1rem"}} />
          Save
        </button>
      </div>
    </div>
  ),
};

/** Static preview showing all valid metadata keys with their current values. */
export const MetadataOverview: Story = {
  render: () => (
    <div
      style={{
        width: "100%",
        maxWidth: "32rem",
        borderRadius: "0.75rem",
        border: "1px solid #e5e7eb",
        backgroundColor: "#fff",
        boxShadow: "0 20px 25px -5px rgba(0,0,0,.1),0 8px 10px -6px rgba(0,0,0,.1)",
      }}>
      <div style={{borderBottom: "1px solid #e5e7eb", padding: "1.5rem"}}>
        <h2 style={{fontSize: "1.125rem", fontWeight: 600}}>Invoice Metadata</h2>
        <p style={{marginTop: "0.25rem", fontSize: "0.875rem", color: "#6b7280"}}>All metadata entries attached to this invoice.</p>
      </div>

      <div>
        {sampleMetadata.map((entry) => (
          <div
            key={entry.key}
            style={{display: "flex", alignItems: "center", justifyContent: "space-between", paddingBlock: "0.75rem"}}>
            <div>
              <p style={{fontSize: "0.875rem", fontWeight: 500}}>{entry.label}</p>
              <p style={{fontSize: "0.75rem", color: "#6b7280"}}>{entry.key}</p>
            </div>
            <div style={{display: "flex", alignItems: "center", gap: "0.5rem"}}>
              <span style={{fontSize: "0.875rem"}}>{entry.value}</span>
              {entry.readonly && (
                <span
                  style={{
                    borderRadius: "0.25rem",
                    backgroundColor: "#f3f4f6",
                    paddingInline: "0.375rem",
                    paddingBlock: "0.125rem",
                    fontSize: "0.75rem",
                    color: "#6b7280",
                  }}>
                  read-only
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  ),
};
