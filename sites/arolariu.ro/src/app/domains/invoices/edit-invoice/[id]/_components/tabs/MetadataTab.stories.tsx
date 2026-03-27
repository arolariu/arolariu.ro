import type {Meta, StoryObj} from "@storybook/react";

/**
 * MetadataTab displays key-value metadata pairs for an invoice with
 * add, edit, and delete capabilities. Depends on `useDialog`.
 *
 * This story renders a static preview of the metadata tab layout.
 */
const meta = {
  title: "Invoices/EditInvoice/Tabs/MetadataTab",
  parameters: {
    layout: "centered",
  },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

/** Preview of metadata tab with sample key-value pairs. */
export const WithMetadata: Story = {
  render: () => (
    <div style={{borderRadius: '0.5rem', border: '1px solid #e5e7eb', backgroundColor: '#ffffff'}}>
      <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #e5e7eb', padding: '1rem'}}>
        <div>
          <h3 style={{fontSize: '1.125rem', fontWeight: '600'}}>Custom Metadata</h3>
          <p style={{fontSize: '0.875rem', color: '#6b7280'}}>Additional key-value pairs for this invoice</p>
        </div>
        <button
          type='button'
          style={{borderRadius: '0.375rem', border: '1px solid #e5e7eb', paddingLeft: '0.75rem', paddingRight: '0.75rem', paddingTop: '0.375rem', paddingBottom: '0.375rem', fontSize: '0.875rem'}}>
          ➕ Add
        </button>
      </div>
      <div>
        {[
          {key: "store_id", value: "KFL-2024-BUC"},
          {key: "receipt_number", value: "INV-2024-001234"},
          {key: "cashier", value: "Station 3"},
        ].map((item) => (
          <div
            key={item.key}
            style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingLeft: '1rem', paddingRight: '1rem', paddingTop: '0.75rem', paddingBottom: '0.75rem'}}>
            <div>
              <span style={{borderRadius: '0.375rem', backgroundColor: '#f3f4f6', paddingLeft: '0.5rem', paddingRight: '0.5rem', paddingTop: '0.125rem', paddingBottom: '0.125rem', fontFamily: 'monospace', fontSize: '0.75rem'}}>{item.key}</span>
              <span style={{marginLeft: '0.75rem', fontSize: '0.875rem'}}>{item.value}</span>
            </div>
            <div style={{display: 'flex', gap: '0.25rem'}}>
              <button
                type='button'
                style={{borderRadius: '0.25rem', padding: '0.25rem', color: '#9ca3af'}}>
                ✏️
              </button>
              <button
                type='button'
                style={{borderRadius: '0.25rem', padding: '0.25rem', color: '#9ca3af'}}>
                🗑
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  ),
};

/** Empty metadata tab. */
export const Empty: Story = {
  render: () => (
    <div style={{borderRadius: '0.5rem', border: '1px solid #e5e7eb', backgroundColor: '#ffffff'}}>
      <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #e5e7eb', padding: '1rem'}}>
        <div>
          <h3 style={{fontSize: '1.125rem', fontWeight: '600'}}>Custom Metadata</h3>
          <p style={{fontSize: '0.875rem', color: '#6b7280'}}>No custom metadata has been added yet</p>
        </div>
        <button
          type='button'
          style={{borderRadius: '0.375rem', border: '1px solid #e5e7eb', paddingLeft: '0.75rem', paddingRight: '0.75rem', paddingTop: '0.375rem', paddingBottom: '0.375rem', fontSize: '0.875rem'}}>
          ➕ Add
        </button>
      </div>
      <div style={{padding: '2rem', textAlign: 'center', fontSize: '0.875rem', color: '#6b7280'}}>No metadata entries.</div>
    </div>
  ),
};
