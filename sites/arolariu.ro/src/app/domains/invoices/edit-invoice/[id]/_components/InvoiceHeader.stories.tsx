import type {Meta, StoryObj} from "@storybook/react";

/**
 * InvoiceHeader (edit) renders the editable invoice header with inline name
 * editing, save, discard, print, and delete controls. Depends on
 * `useEditInvoiceContext` and `useDialog`.
 *
 * This story renders a static preview of the header layout.
 */
const meta = {
  title: "Invoices/EditInvoice/InvoiceHeader",
  parameters: {
    layout: "fullscreen",
  },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

/** Preview with no pending changes. */
export const NoChanges: Story = {
  render: () => (
    <div style={{display: 'flex', flexDirection: 'column', gap: '0.75rem', borderBottom: '1px solid #e5e7eb', backgroundColor: '#ffffff', paddingLeft: '1.5rem', paddingRight: '1.5rem', paddingTop: '1rem', paddingBottom: '1rem'}}>
      <div>
        <input
          type='text'
          defaultValue='Weekly Grocery Shopping'
          style={{width: '100%', border: 'none', backgroundColor: 'transparent', fontSize: '1.875rem', fontWeight: '700', letterSpacing: '-0.025em'}}
          readOnly
        />
      </div>
      <div style={{display: 'flex', gap: '0.5rem'}}>
        <button
          type='button'
          style={{borderRadius: '0.375rem', border: '1px solid #e5e7eb', paddingLeft: '0.75rem', paddingRight: '0.75rem', paddingTop: '0.375rem', paddingBottom: '0.375rem', fontSize: '0.875rem'}}>
          🖨 Print
        </button>
        <button
          type='button'
          style={{borderRadius: '0.375rem', backgroundColor: '#dc2626', paddingLeft: '0.75rem', paddingRight: '0.75rem', paddingTop: '0.375rem', paddingBottom: '0.375rem', fontSize: '0.875rem', color: '#ffffff'}}>
          🗑 Delete
        </button>
      </div>
    </div>
  ),
};

/** Preview with pending changes (save/discard buttons visible). */
export const WithPendingChanges: Story = {
  render: () => (
    <div style={{display: 'flex', flexDirection: 'column', gap: '0.75rem', borderBottom: '1px solid #e5e7eb', backgroundColor: '#ffffff', paddingLeft: '1.5rem', paddingRight: '1.5rem', paddingTop: '1rem', paddingBottom: '1rem'}}>
      <div>
        <input
          type='text'
          defaultValue='Weekly Grocery Shopping (edited)'
          style={{width: '100%', border: 'none', backgroundColor: 'transparent', fontSize: '1.875rem', fontWeight: '700', letterSpacing: '-0.025em'}}
          readOnly
        />
      </div>
      <div style={{display: 'flex', gap: '0.5rem'}}>
        <button
          type='button'
          style={{borderRadius: '0.375rem', backgroundColor: '#2563eb', paddingLeft: '0.75rem', paddingRight: '0.75rem', paddingTop: '0.375rem', paddingBottom: '0.375rem', fontSize: '0.875rem', color: '#ffffff'}}>
          💾 Save
        </button>
        <button
          type='button'
          style={{borderRadius: '0.375rem', border: '1px solid #e5e7eb', paddingLeft: '0.75rem', paddingRight: '0.75rem', paddingTop: '0.375rem', paddingBottom: '0.375rem', fontSize: '0.875rem'}}>
          ✕ Discard
        </button>
        <button
          type='button'
          style={{borderRadius: '0.375rem', border: '1px solid #e5e7eb', paddingLeft: '0.75rem', paddingRight: '0.75rem', paddingTop: '0.375rem', paddingBottom: '0.375rem', fontSize: '0.875rem'}}>
          🖨 Print
        </button>
        <button
          type='button'
          style={{borderRadius: '0.375rem', backgroundColor: '#dc2626', paddingLeft: '0.75rem', paddingRight: '0.75rem', paddingTop: '0.375rem', paddingBottom: '0.375rem', fontSize: '0.875rem', color: '#ffffff'}}>
          🗑 Delete
        </button>
      </div>
    </div>
  ),
};
