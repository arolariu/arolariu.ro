import type {Meta, StoryObj} from "@storybook/react";
import {TbAlertTriangle, TbCloud, TbDatabase, TbDownload, TbShieldCheck, TbTrash} from "react-icons/tb";

/**
 * Static visual preview of the SettingsData component.
 *
 * The actual component depends on data settings props and constants,
 * so this story renders a faithful HTML replica of the data management panel.
 */
const meta = {
  title: "Pages/Profile/SettingsData",
  parameters: {
    layout: "fullscreen",
  },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

/** Default data settings panel with all sections. */
export const Default: Story = {
  render: () => (
    <section style={{display: 'flex', flexDirection: 'column', gap: '1.5rem'}}>
      <div>
        <h2 style={{fontSize: '1.25rem', fontWeight: '700'}}>Data Management</h2>
        <p style={{fontSize: '0.875rem', color: '#6b7280'}}>Control your data retention, backups, and privacy.</p>
      </div>

      <div style={{display: 'grid', gridTemplateColumns: '1fr', gap: '1rem'}}>
        {/* Data Retention */}
        <div style={{borderRadius: '0.75rem', border: '1px solid #e5e7eb', padding: '1.25rem'}}>
          <div style={{display: 'flex', alignItems: 'center', gap: '0.5rem'}}>
            <TbDatabase style={{height: '1rem', width: '1rem'}} />
            <h3 style={{fontWeight: '600'}}>Data Retention</h3>
          </div>
          <p style={{marginTop: '0.25rem', fontSize: '0.75rem', color: '#6b7280'}}>How long to keep your data.</p>
          <div style={{marginTop: '0.75rem', borderRadius: '0.375rem', border: '1px solid #e5e7eb', paddingLeft: '0.75rem', paddingRight: '0.75rem', paddingTop: '0.5rem', paddingBottom: '0.5rem', fontSize: '0.875rem'}}>1 Year</div>
          <p style={{marginTop: '0.25rem', fontSize: '0.75rem', color: '#9ca3af'}}>Data older than this period will be automatically deleted.</p>
        </div>

        {/* Auto Backup */}
        <div style={{borderRadius: '0.75rem', border: '1px solid #e5e7eb', padding: '1.25rem'}}>
          <div style={{display: 'flex', alignItems: 'center', gap: '0.5rem'}}>
            <TbCloud style={{height: '1rem', width: '1rem'}} />
            <h3 style={{fontWeight: '600'}}>Auto Backup</h3>
          </div>
          <p style={{marginTop: '0.25rem', fontSize: '0.75rem', color: '#6b7280'}}>Automatic data backup settings.</p>
          <div style={{marginTop: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.75rem'}}>
            <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between'}}>
              <div>
                <p style={{fontSize: '0.875rem', fontWeight: '500'}}>Auto Backup</p>
                <p style={{fontSize: '0.75rem', color: '#9ca3af'}}>Automatically back up your data</p>
              </div>
              <div style={{height: '1.25rem', width: '2.25rem', borderRadius: '9999px', backgroundColor: '#2563eb'}} />
            </div>
            <hr style={{borderColor: '#e5e7eb'}} />
            <div>
              <p style={{fontSize: '0.875rem', fontWeight: '500'}}>Backup Frequency</p>
              <div style={{marginTop: '0.25rem', borderRadius: '0.375rem', border: '1px solid #e5e7eb', paddingLeft: '0.75rem', paddingRight: '0.75rem', paddingTop: '0.5rem', paddingBottom: '0.5rem', fontSize: '0.875rem'}}>Weekly</div>
            </div>
          </div>
        </div>

        {/* Privacy */}
        <div style={{borderRadius: '0.75rem', border: '1px solid #e5e7eb', padding: '1.25rem'}}>
          <div style={{display: 'flex', alignItems: 'center', gap: '0.5rem'}}>
            <TbShieldCheck style={{height: '1rem', width: '1rem'}} />
            <h3 style={{fontWeight: '600'}}>Privacy</h3>
          </div>
          <p style={{marginTop: '0.25rem', fontSize: '0.75rem', color: '#6b7280'}}>Privacy and data sharing preferences.</p>
          <div style={{marginTop: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between'}}>
            <div>
              <p style={{fontSize: '0.875rem', fontWeight: '500'}}>Share Anonymous Data</p>
              <p style={{fontSize: '0.75rem', color: '#9ca3af'}}>Help improve the platform</p>
            </div>
            <div style={{height: '1.25rem', width: '2.25rem', borderRadius: '9999px', backgroundColor: '#e5e7eb'}} />
          </div>
        </div>

        {/* Export Data */}
        <div style={{borderRadius: '0.75rem', border: '1px solid #e5e7eb', padding: '1.25rem'}}>
          <div style={{display: 'flex', alignItems: 'center', gap: '0.5rem'}}>
            <TbDownload style={{height: '1rem', width: '1rem'}} />
            <h3 style={{fontWeight: '600'}}>Export Data</h3>
          </div>
          <p style={{marginTop: '0.25rem', fontSize: '0.75rem', color: '#6b7280'}}>Download a copy of all your data.</p>
          <div style={{marginTop: '0.75rem'}}>
            <button style={{display: 'flex', width: '100%', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', borderRadius: '0.375rem', border: '1px solid #e5e7eb', paddingLeft: '0.75rem', paddingRight: '0.75rem', paddingTop: '0.5rem', paddingBottom: '0.5rem', fontSize: '0.875rem', backgroundColor: 'transparent', cursor: 'pointer'}}>
              <TbDownload style={{height: '1rem', width: '1rem'}} />
              Download All Data
            </button>
            <p style={{marginTop: '0.25rem', fontSize: '0.75rem', color: '#9ca3af'}}>Data exported as a ZIP file.</p>
          </div>
        </div>

        {/* Danger Zone */}
        <div style={{borderRadius: '0.75rem', border: '1px solid #fecaca', padding: '1.25rem', gridColumn: 'span 2'}}>
          <div style={{display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#dc2626'}}>
            <TbAlertTriangle style={{height: '1rem', width: '1rem'}} />
            <h3 style={{fontWeight: '600'}}>Danger Zone</h3>
          </div>
          <p style={{marginTop: '0.25rem', fontSize: '0.75rem', color: '#6b7280'}}>Irreversible and destructive actions.</p>
          <div style={{marginTop: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.75rem'}}>
            <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between'}}>
              <div>
                <p style={{fontSize: '0.875rem', fontWeight: '500'}}>Delete All Data</p>
                <p style={{fontSize: '0.75rem', color: '#9ca3af'}}>Permanently delete all your invoices and scans.</p>
              </div>
              <button style={{display: 'flex', alignItems: 'center', gap: '0.25rem', borderRadius: '0.375rem', backgroundColor: '#dc2626', paddingLeft: '0.75rem', paddingRight: '0.75rem', paddingTop: '0.375rem', paddingBottom: '0.375rem', fontSize: '0.875rem', color: '#ffffff', border: 'none', cursor: 'pointer'}}>
                <TbTrash style={{height: '1rem', width: '1rem'}} />
                Delete
              </button>
            </div>
            <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between'}}>
              <div>
                <p style={{fontSize: '0.875rem', fontWeight: '500'}}>Delete Account</p>
                <p style={{fontSize: '0.75rem', color: '#9ca3af'}}>Remove your account completely.</p>
              </div>
              <button style={{borderRadius: '0.375rem', border: '1px solid #e5e7eb', paddingLeft: '0.75rem', paddingRight: '0.75rem', paddingTop: '0.375rem', paddingBottom: '0.375rem', fontSize: '0.875rem', backgroundColor: 'transparent', cursor: 'pointer'}}>Manage Account</button>
            </div>
          </div>
        </div>
      </div>
    </section>
  ),
};
