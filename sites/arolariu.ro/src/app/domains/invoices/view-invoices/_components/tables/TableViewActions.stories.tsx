import type {Meta, StoryObj} from "@storybook/react";

/**
 * TableViewActions renders a dropdown menu with edit, share, and
 * delete actions for individual invoice rows. Depends on
 * `useDialog` context and `useTranslations`.
 *
 * This story renders a static preview of the actions dropdown.
 */
const meta = {
  title: "Invoices/ViewInvoices/Views/TableViewActions",
  decorators: [
    (Story) => (
      <div style={{display: 'flex', minHeight: '200px', alignItems: 'flex-start', justifyContent: 'center', paddingTop: '2rem'}}>
        <Story />
      </div>
    ),
  ],
  parameters: {
    layout: "centered",
  },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

/** Preview of the actions dropdown menu (expanded). */
export const Preview: Story = {
  render: () => (
    <div style={{width: '10rem', borderRadius: '0.5rem', border: '1px solid #e5e7eb', backgroundColor: '#ffffff', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)'}}>
      <div style={{padding: '0.25rem'}}>
        <button
          type='button'
          style={{display: 'flex', width: '100%', alignItems: 'center', gap: '0.5rem', borderRadius: '0.375rem', padding: '0.5rem 0.75rem', fontSize: '0.875rem'}}>
          ✏️ Edit
        </button>
        <button
          type='button'
          style={{display: 'flex', width: '100%', alignItems: 'center', gap: '0.5rem', borderRadius: '0.375rem', padding: '0.5rem 0.75rem', fontSize: '0.875rem'}}>
          🔗 Share
        </button>
        <hr style={{margin: '0.25rem 0', borderColor: '#e5e7eb'}} />
        <button
          type='button'
          style={{display: 'flex', width: '100%', alignItems: 'center', gap: '0.5rem', borderRadius: '0.375rem', padding: '0.5rem 0.75rem', fontSize: '0.875rem', color: '#ef4444'}}>
          🗑 Delete
        </button>
      </div>
    </div>
  ),
};

/** Collapsed state — just the trigger button. */
export const Collapsed: Story = {
  render: () => (
    <button
      type='button'
      style={{borderRadius: '0.375rem', border: '1px solid #e5e7eb', backgroundColor: '#ffffff', padding: '0.5rem', boxShadow: '0 1px 2px 0 rgba(0,0,0,0.05)'}}>
      <span style={{color: '#6b7280'}}>☰</span>
    </button>
  ),
};
