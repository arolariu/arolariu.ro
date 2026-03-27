import type {Meta, StoryObj} from "@storybook/react";
import {TbClock, TbDevices, TbKey, TbLock, TbShieldCheck, TbTrash} from "react-icons/tb";

/**
 * Static visual preview of the SettingsSecurity component.
 *
 * The actual component depends on security settings props with
 * trusted devices, so this story renders a faithful HTML replica.
 */
const meta = {
  title: "Pages/Profile/SettingsSecurity",
  parameters: {
    layout: "fullscreen",
  },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

/** Default security settings panel. */
export const Default: Story = {
  render: () => (
    <section style={{display: 'flex', flexDirection: 'column', gap: '1.5rem'}}>
      <div>
        <h2 style={{fontSize: '1.25rem', fontWeight: '700'}}>Security</h2>
        <p style={{fontSize: '0.875rem', color: '#6b7280'}}>Manage your account security and access.</p>
      </div>

      <div style={{display: 'grid', gridTemplateColumns: '1fr', gap: '1rem'}}>
        {/* 2FA */}
        <div style={{borderRadius: '0.75rem', border: '1px solid #e5e7eb', padding: '1.25rem', gridColumn: 'span 2'}}>
          <div style={{display: 'flex', alignItems: 'center', gap: '0.5rem'}}>
            <TbKey style={{height: '1rem', width: '1rem'}} />
            <h3 style={{fontWeight: '600'}}>Two-Factor Authentication</h3>
          </div>
          <p style={{marginTop: '0.25rem', fontSize: '0.75rem', color: '#6b7280'}}>Add an extra layer of security.</p>
          <div style={{marginTop: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between'}}>
            <div>
              <p style={{fontSize: '0.875rem', fontWeight: '500'}}>Enable 2FA</p>
              <p style={{fontSize: '0.75rem', color: '#9ca3af'}}>Require verification code on login</p>
            </div>
            <div style={{height: '1.25rem', width: '2.25rem', borderRadius: '9999px', backgroundColor: '#2563eb'}} />
          </div>
          <div style={{marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.25rem', borderRadius: '0.375rem', backgroundColor: '#f0fdf4', padding: '0.5rem', fontSize: '0.75rem', color: '#15803d'}}>
            <TbShieldCheck style={{height: '0.75rem', width: '0.75rem'}} />
            Two-factor authentication is active.
          </div>
        </div>

        {/* Session Settings */}
        <div style={{borderRadius: '0.75rem', border: '1px solid #e5e7eb', padding: '1.25rem'}}>
          <div style={{display: 'flex', alignItems: 'center', gap: '0.5rem'}}>
            <TbClock style={{height: '1rem', width: '1rem'}} />
            <h3 style={{fontWeight: '600'}}>Session Settings</h3>
          </div>
          <p style={{marginTop: '0.25rem', fontSize: '0.75rem', color: '#6b7280'}}>Configure session behavior.</p>
          <div style={{marginTop: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.75rem'}}>
            <div>
              <p style={{fontSize: '0.875rem', fontWeight: '500'}}>Session Timeout</p>
              <div style={{marginTop: '0.25rem', borderRadius: '0.375rem', border: '1px solid #e5e7eb', paddingLeft: '0.75rem', paddingRight: '0.75rem', paddingTop: '0.5rem', paddingBottom: '0.5rem', fontSize: '0.875rem'}}>30 minutes</div>
            </div>
            <hr style={{borderColor: '#e5e7eb'}} />
            <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between'}}>
              <div>
                <p style={{fontSize: '0.875rem', fontWeight: '500'}}>Login Notifications</p>
                <p style={{fontSize: '0.75rem', color: '#9ca3af'}}>Get notified of new logins</p>
              </div>
              <div style={{height: '1.25rem', width: '2.25rem', borderRadius: '9999px', backgroundColor: '#2563eb'}} />
            </div>
          </div>
        </div>

        {/* Password */}
        <div style={{borderRadius: '0.75rem', border: '1px solid #e5e7eb', padding: '1.25rem'}}>
          <div style={{display: 'flex', alignItems: 'center', gap: '0.5rem'}}>
            <TbLock style={{height: '1rem', width: '1rem'}} />
            <h3 style={{fontWeight: '600'}}>Password &amp; Access</h3>
          </div>
          <p style={{marginTop: '0.25rem', fontSize: '0.75rem', color: '#6b7280'}}>Manage your password.</p>
          <div style={{marginTop: '0.75rem'}}>
            <button style={{width: '100%', borderRadius: '0.375rem', border: '1px solid #e5e7eb', paddingLeft: '0.75rem', paddingRight: '0.75rem', paddingTop: '0.5rem', paddingBottom: '0.5rem', fontSize: '0.875rem', backgroundColor: 'transparent', cursor: 'pointer'}}>Change Password</button>
            <p style={{marginTop: '0.5rem', fontSize: '0.75rem', color: '#9ca3af'}}>Managed via Clerk authentication.</p>
          </div>
        </div>

        {/* Trusted Devices */}
        <div style={{borderRadius: '0.75rem', border: '1px solid #e5e7eb', padding: '1.25rem', gridColumn: 'span 2'}}>
          <div style={{display: 'flex', alignItems: 'center', gap: '0.5rem'}}>
            <TbDevices style={{height: '1rem', width: '1rem'}} />
            <h3 style={{fontWeight: '600'}}>Trusted Devices</h3>
          </div>
          <p style={{marginTop: '0.25rem', fontSize: '0.75rem', color: '#6b7280'}}>Manage devices with saved sessions.</p>
          <div style={{marginTop: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.5rem'}}>
            {[
              {name: "Chrome on Windows", lastUsed: "2025-01-15", isCurrent: true},
              {name: "Firefox on macOS", lastUsed: "2025-01-10", isCurrent: false},
            ].map((d) => (
              <div
                key={d.name}
                style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderRadius: '0.375rem', border: '1px solid #e5e7eb', padding: '0.75rem'}}>
                <div>
                  <p style={{fontSize: '0.875rem', fontWeight: '500'}}>{d.name}</p>
                  <p style={{fontSize: '0.75rem', color: '#9ca3af'}}>Last used: {d.lastUsed}</p>
                </div>
                {d.isCurrent ? (
                  <span style={{borderRadius: '9999px', backgroundColor: '#f3f4f6', paddingLeft: '0.5rem', paddingRight: '0.5rem', paddingTop: '0.125rem', paddingBottom: '0.125rem', fontSize: '0.75rem'}}>Current</span>
                ) : (
                  <button style={{borderRadius: '0.375rem', padding: '0.375rem', backgroundColor: 'transparent', border: 'none', cursor: 'pointer'}}>
                    <TbTrash style={{height: '1rem', width: '1rem', color: '#9ca3af'}} />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  ),
};
