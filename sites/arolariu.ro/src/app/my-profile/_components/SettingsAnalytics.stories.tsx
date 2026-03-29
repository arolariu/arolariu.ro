import type {Meta, StoryObj} from "@storybook/react";
import {TbChartBar, TbChartPie, TbClock, TbDatabase, TbDownload, TbTrendingUp} from "react-icons/tb";

/**
 * Static visual preview of the SettingsAnalytics component.
 *
 * The actual component depends on analytics settings props and constants,
 * so this story renders a faithful HTML replica of the analytics settings panel.
 */
const meta = {
  title: "Pages/Profile/SettingsAnalytics",
  parameters: {
    layout: "fullscreen",
  },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

/** Default analytics settings panel with all sections. */
export const Default: Story = {
  render: () => (
    <section style={{display: "flex", flexDirection: "column", gap: "1.5rem"}}>
      <div>
        <h2 style={{fontSize: "1.25rem", fontWeight: "700"}}>Analytics</h2>
        <p style={{fontSize: "0.875rem", color: "#6b7280"}}>Manage your analytics and tracking preferences.</p>
      </div>

      <div style={{display: "grid", gridTemplateColumns: "1fr", gap: "1rem"}}>
        {/* Master Toggle */}
        <div style={{borderRadius: "0.75rem", border: "1px solid #e5e7eb", padding: "1.25rem", gridColumn: "span 2"}}>
          <div style={{display: "flex", alignItems: "center", gap: "0.5rem"}}>
            <TbChartBar style={{height: "1rem", width: "1rem"}} />
            <h3 style={{fontWeight: "600"}}>Analytics Tracking</h3>
          </div>
          <p style={{marginTop: "0.25rem", fontSize: "0.75rem", color: "#6b7280"}}>Enable or disable all analytics features.</p>
          <div style={{marginTop: "0.75rem", display: "flex", alignItems: "center", justifyContent: "space-between"}}>
            <div>
              <p style={{fontSize: "0.875rem", fontWeight: "500"}}>Enable Analytics</p>
              <p style={{fontSize: "0.75rem", color: "#9ca3af"}}>Track spending patterns and trends</p>
            </div>
            <div style={{height: "1.25rem", width: "2.25rem", borderRadius: "9999px", backgroundColor: "#2563eb"}} />
          </div>
        </div>

        {/* Granularity */}
        <div style={{borderRadius: "0.75rem", border: "1px solid #e5e7eb", padding: "1.25rem"}}>
          <div style={{display: "flex", alignItems: "center", gap: "0.5rem"}}>
            <TbClock style={{height: "1rem", width: "1rem"}} />
            <h3 style={{fontWeight: "600"}}>Granularity</h3>
          </div>
          <p style={{marginTop: "0.25rem", fontSize: "0.75rem", color: "#6b7280"}}>Choose data aggregation period.</p>
          <div
            style={{
              marginTop: "0.75rem",
              borderRadius: "0.375rem",
              border: "1px solid #e5e7eb",
              paddingLeft: "0.75rem",
              paddingRight: "0.75rem",
              paddingTop: "0.5rem",
              paddingBottom: "0.5rem",
              fontSize: "0.875rem",
            }}>
            Daily
          </div>
        </div>

        {/* Export Format */}
        <div style={{borderRadius: "0.75rem", border: "1px solid #e5e7eb", padding: "1.25rem"}}>
          <div style={{display: "flex", alignItems: "center", gap: "0.5rem"}}>
            <TbDownload style={{height: "1rem", width: "1rem"}} />
            <h3 style={{fontWeight: "600"}}>Export Format</h3>
          </div>
          <p style={{marginTop: "0.25rem", fontSize: "0.75rem", color: "#6b7280"}}>Default format for data exports.</p>
          <div
            style={{
              marginTop: "0.75rem",
              borderRadius: "0.375rem",
              border: "1px solid #e5e7eb",
              paddingLeft: "0.75rem",
              paddingRight: "0.75rem",
              paddingTop: "0.5rem",
              paddingBottom: "0.5rem",
              fontSize: "0.875rem",
            }}>
            JSON
          </div>
        </div>

        {/* Tracking Options */}
        <div style={{borderRadius: "0.75rem", border: "1px solid #e5e7eb", padding: "1.25rem"}}>
          <div style={{display: "flex", alignItems: "center", gap: "0.5rem"}}>
            <TbChartPie style={{height: "1rem", width: "1rem"}} />
            <h3 style={{fontWeight: "600"}}>Tracking</h3>
          </div>
          <p style={{marginTop: "0.25rem", fontSize: "0.75rem", color: "#6b7280"}}>Choose what to track.</p>
          <div style={{marginTop: "0.75rem", display: "flex", flexDirection: "column", gap: "0.75rem"}}>
            {[
              {label: "Spending", enabled: true},
              {label: "Categories", enabled: true},
              {label: "Merchants", enabled: false},
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

        {/* Advanced */}
        <div style={{borderRadius: "0.75rem", border: "1px solid #e5e7eb", padding: "1.25rem"}}>
          <div style={{display: "flex", alignItems: "center", gap: "0.5rem"}}>
            <TbTrendingUp style={{height: "1rem", width: "1rem"}} />
            <h3 style={{fontWeight: "600"}}>Advanced Analytics</h3>
          </div>
          <p style={{marginTop: "0.25rem", fontSize: "0.75rem", color: "#6b7280"}}>Enable advanced features.</p>
          <div style={{marginTop: "0.75rem", display: "flex", flexDirection: "column", gap: "0.75rem"}}>
            {[
              {label: "Benchmarking", enabled: false},
              {label: "Predictive Analysis", enabled: false},
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

        {/* Data Usage */}
        <div style={{borderRadius: "0.75rem", border: "1px solid #e5e7eb", padding: "1.25rem", gridColumn: "span 2"}}>
          <div style={{display: "flex", alignItems: "center", gap: "0.5rem"}}>
            <TbDatabase style={{height: "1rem", width: "1rem"}} />
            <h3 style={{fontWeight: "600"}}>Data Usage</h3>
          </div>
          <div
            style={{marginTop: "0.75rem", borderRadius: "0.375rem", backgroundColor: "#eff6ff", padding: "0.75rem", fontSize: "0.875rem"}}>
            <p style={{color: "#4b5563"}}>Analytics data is processed locally and never shared with third parties without your consent.</p>
          </div>
        </div>
      </div>
    </section>
  ),
};
