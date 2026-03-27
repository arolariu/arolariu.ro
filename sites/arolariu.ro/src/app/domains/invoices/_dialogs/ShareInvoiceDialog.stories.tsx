import type {Meta, StoryObj} from "@storybook/react";
import {TbAlertTriangle, TbGlobe, TbLock} from "react-icons/tb";

/**
 * Static visual preview of the ShareInvoiceDialog component.
 *
 * @remarks Static preview — component imports "use server" action (patchInvoice
 * from `@/lib/actions/invoices/patchInvoice`) that cannot be bundled by Storybook's
 * Vite/Rollup. Also depends on `useDialog` context and clipboard APIs. This story
 * renders a faithful HTML replica of the initial sharing mode selection screen.
 */
const meta = {
  title: "Invoices/Dialogs/ShareInvoiceDialog",
  parameters: {
    layout: "centered",
  },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

/** Default selection mode showing public vs private sharing options. */
export const Default: Story = {
  render: () => (
    <div style={{borderRadius: '0.75rem', border: '1px solid #e5e7eb', backgroundColor: '#ffffff', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'}}>
      {/* Header */}
      <div style={{borderBottom: '1px solid #e5e7eb', padding: '1.5rem'}}>
        <h2 style={{fontSize: '1.125rem', fontWeight: '600'}}>Share Invoice</h2>
        <p style={{marginTop: '0.25rem', fontSize: '0.875rem', color: '#6b7280'}}>Choose how to share &ldquo;Weekly Groceries&rdquo;</p>
      </div>

      <div style={{display: 'flex', flexDirection: 'column', gap: '1rem', padding: '1.5rem'}}>
        <p style={{fontSize: '0.875rem', color: '#4b5563'}}>Choose how you&apos;d like to share this invoice:</p>

        {/* Options Grid */}
        <div style={{display: 'grid', gap: '0.75rem'}}>
          <div style={{cursor: 'pointer', borderRadius: '0.5rem', border: '1px solid #e5e7eb', padding: '1rem'}}>
            <div style={{display: 'flex', alignItems: 'flex-start', gap: '0.75rem'}}>
              <div style={{display: 'flex', height: '2.5rem', width: '2.5rem', alignItems: 'center', justifyContent: 'center', borderRadius: '9999px', backgroundColor: '#ffedd5'}}>
                <TbGlobe style={{height: '1.25rem', width: '1.25rem', color: '#ea580c'}} />
              </div>
              <div>
                <h4 style={{fontSize: '1rem', fontWeight: '600'}}>Public Sharing</h4>
                <p style={{fontSize: '0.875rem', color: '#6b7280'}}>
                  Generate a <strong>shareable link or QR code</strong> accessible by anyone.
                </p>
              </div>
            </div>
          </div>

          <div style={{cursor: 'pointer', borderRadius: '0.5rem', border: '1px solid #e5e7eb', padding: '1rem'}}>
            <div style={{display: 'flex', alignItems: 'flex-start', gap: '0.75rem'}}>
              <div style={{display: 'flex', height: '2.5rem', width: '2.5rem', alignItems: 'center', justifyContent: 'center', borderRadius: '9999px', backgroundColor: '#dcfce7'}}>
                <TbLock style={{height: '1.25rem', width: '1.25rem', color: '#15803d'}} />
              </div>
              <div>
                <h4 style={{fontSize: '1rem', fontWeight: '600'}}>Private Sharing</h4>
                <p style={{fontSize: '0.875rem', color: '#6b7280'}}>
                  Send an <strong>email invitation</strong> to a specific recipient.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Privacy Notice */}
        <div style={{marginTop: '1rem', borderRadius: '0.5rem', border: '1px solid #e5e7eb', backgroundColor: '#f9fafb', padding: '0.75rem'}}>
          <div style={{display: 'flex', alignItems: 'center', gap: '0.5rem'}}>
            <TbAlertTriangle style={{height: '1rem', width: '1rem', color: '#ca8a04'}} />
            <h4 style={{fontSize: '0.875rem', fontWeight: '600'}}>Privacy Notice</h4>
          </div>
          <p style={{marginTop: '0.25rem', fontSize: '0.75rem', color: '#4b5563'}}>
            Public links allow anyone with the URL to view this invoice. Private sharing sends a secure invitation via email.
          </p>
        </div>
      </div>
    </div>
  ),
};
