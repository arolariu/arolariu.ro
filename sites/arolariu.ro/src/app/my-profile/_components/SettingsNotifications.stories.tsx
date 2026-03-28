import type {Meta, StoryObj} from "@storybook/react";
import {TbBell, TbMail, TbReport, TbShield, TbSparkles, TbWallet} from "react-icons/tb";

/**
 * Static visual preview of the SettingsNotifications component.
 *
 * The actual component depends on notification settings props,
 * so this story renders a faithful HTML replica of the notification settings panel.
 */
const meta = {
  title: "Pages/Profile/SettingsNotifications",
  parameters: {
    layout: "fullscreen",
  },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

/** Default notification settings panel. */
export const Default: Story = {
  render: () => (
    <section style={{display: "flex", flexDirection: "column", gap: "1.5rem"}}>
      <div>
        <h2 style={{fontSize: "1.25rem", fontWeight: "700"}}>Notifications</h2>
        <p style={{fontSize: "0.875rem", color: "#6b7280"}}>Manage your email and alert preferences.</p>
      </div>

      <div style={{display: "grid", gridTemplateColumns: "1fr", gap: "1rem"}}>
        {/* Email Master Toggle */}
        <div style={{borderRadius: "0.75rem", border: "1px solid #e5e7eb", padding: "1.25rem", gridColumn: "span 2"}}>
          <div style={{display: "flex", alignItems: "center", gap: "0.5rem"}}>
            <TbMail style={{height: "1rem", width: "1rem"}} />
            <h3 style={{fontWeight: "600"}}>Email Notifications</h3>
          </div>
          <p style={{marginTop: "0.25rem", fontSize: "0.75rem", color: "#6b7280"}}>Control all email communications.</p>
          <div style={{marginTop: "0.75rem", display: "flex", alignItems: "center", justifyContent: "space-between"}}>
            <div>
              <p style={{fontSize: "0.875rem", fontWeight: "500"}}>Enable Email</p>
              <p style={{fontSize: "0.75rem", color: "#9ca3af"}}>Receive notifications by email</p>
            </div>
            <div style={{height: "1.25rem", width: "2.25rem", borderRadius: "9999px", backgroundColor: "#2563eb"}} />
          </div>
        </div>

        {/* Reports */}
        <div style={{borderRadius: "0.75rem", border: "1px solid #e5e7eb", padding: "1.25rem"}}>
          <div style={{display: "flex", alignItems: "center", gap: "0.5rem"}}>
            <TbReport style={{height: "1rem", width: "1rem"}} />
            <h3 style={{fontWeight: "600"}}>Reports</h3>
          </div>
          <p style={{marginTop: "0.25rem", fontSize: "0.75rem", color: "#6b7280"}}>Scheduled report delivery.</p>
          <div style={{marginTop: "0.75rem", display: "flex", flexDirection: "column", gap: "0.75rem"}}>
            <div
              style={{
                borderRadius: "0.375rem",
                border: "1px solid #e5e7eb",
                paddingLeft: "0.75rem",
                paddingRight: "0.75rem",
                paddingTop: "0.5rem",
                paddingBottom: "0.5rem",
                fontSize: "0.875rem",
              }}>
              Weekly
            </div>
            {[
              {label: "Weekly Digest", enabled: true},
              {label: "Monthly Report", enabled: true},
            ].map((t) => (
              <div
                key={t.label}
                style={{display: "flex", alignItems: "center", justifyContent: "space-between"}}>
                <p style={{fontSize: "0.875rem"}}>{t.label}</p>
                <div style={{height: "1.25rem", width: "2.25rem", borderRadius: "9999px", backgroundColor: "#2563eb"}} />
              </div>
            ))}
          </div>
        </div>

        {/* Financial Alerts */}
        <div style={{borderRadius: "0.75rem", border: "1px solid #e5e7eb", padding: "1.25rem"}}>
          <div style={{display: "flex", alignItems: "center", gap: "0.5rem"}}>
            <TbWallet style={{height: "1rem", width: "1rem"}} />
            <h3 style={{fontWeight: "600"}}>Financial Alerts</h3>
          </div>
          <p style={{marginTop: "0.25rem", fontSize: "0.75rem", color: "#6b7280"}}>Spending and budget notifications.</p>
          <div style={{marginTop: "0.75rem", display: "flex", flexDirection: "column", gap: "0.75rem"}}>
            {[
              {label: "Spending Alerts", enabled: true},
              {label: "Budget Alerts", enabled: false},
            ].map((t) => (
              <div
                key={t.label}
                style={{display: "flex", alignItems: "center", justifyContent: "space-between"}}>
                <p style={{fontSize: "0.875rem"}}>{t.label}</p>
                <div
                  style={{height: "1.25rem", width: "2.25rem", borderRadius: "9999px", backgroundColor: t.enabled ? "#2563eb" : "#e5e7eb"}}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Product Updates */}
        <div style={{borderRadius: "0.75rem", border: "1px solid #e5e7eb", padding: "1.25rem"}}>
          <div style={{display: "flex", alignItems: "center", gap: "0.5rem"}}>
            <TbSparkles style={{height: "1rem", width: "1rem"}} />
            <h3 style={{fontWeight: "600"}}>Product Updates</h3>
          </div>
          <p style={{marginTop: "0.25rem", fontSize: "0.75rem", color: "#6b7280"}}>Feature and marketing notifications.</p>
          <div style={{marginTop: "0.75rem", display: "flex", flexDirection: "column", gap: "0.75rem"}}>
            {[
              {label: "New Features", enabled: true},
              {label: "Marketing Emails", enabled: false},
            ].map((t) => (
              <div
                key={t.label}
                style={{display: "flex", alignItems: "center", justifyContent: "space-between"}}>
                <p style={{fontSize: "0.875rem"}}>{t.label}</p>
                <div
                  style={{height: "1.25rem", width: "2.25rem", borderRadius: "9999px", backgroundColor: t.enabled ? "#2563eb" : "#e5e7eb"}}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Security Notifications */}
        <div style={{borderRadius: "0.75rem", border: "1px solid #e5e7eb", padding: "1.25rem"}}>
          <div style={{display: "flex", alignItems: "center", gap: "0.5rem"}}>
            <TbShield style={{height: "1rem", width: "1rem"}} />
            <h3 style={{fontWeight: "600"}}>Security</h3>
          </div>
          <p style={{marginTop: "0.25rem", fontSize: "0.75rem", color: "#6b7280"}}>Security-related alerts.</p>
          <div style={{marginTop: "0.75rem", display: "flex", alignItems: "center", justifyContent: "space-between"}}>
            <p style={{fontSize: "0.875rem"}}>Security Alerts</p>
            <div style={{height: "1.25rem", width: "2.25rem", borderRadius: "9999px", backgroundColor: "#2563eb"}} />
          </div>
          <div style={{marginTop: "0.5rem", display: "flex", alignItems: "center", gap: "0.25rem", fontSize: "0.75rem", color: "#9ca3af"}}>
            <TbBell style={{height: "0.75rem", width: "0.75rem"}} />
            Security alerts are always enabled for your protection.
          </div>
        </div>
      </div>
    </section>
  ),
};
