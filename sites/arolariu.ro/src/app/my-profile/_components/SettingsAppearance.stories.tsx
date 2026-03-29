import type {Meta, StoryObj} from "@storybook/react";
import {TbBrush, TbGlobe, TbMoon, TbPalette, TbSettings, TbSun, TbTypography} from "react-icons/tb";

/**
 * Static visual preview of the SettingsAppearance component.
 *
 * The actual component depends on `useFontContext`, `usePreferencesStore`,
 * `useTheme`, and various Zustand store actions, so this story renders
 * a faithful HTML replica of the appearance settings panel.
 */
const meta = {
  title: "Pages/Profile/SettingsAppearance",
  parameters: {
    layout: "fullscreen",
  },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

/** Default appearance settings with theme, font, locale, and advanced options. */
export const Default: Story = {
  render: () => (
    <section style={{display: "flex", flexDirection: "column", gap: "1.5rem"}}>
      <div>
        <h2 style={{fontSize: "1.25rem", fontWeight: "700"}}>Appearance</h2>
        <p style={{fontSize: "0.875rem", color: "#6b7280"}}>Customize the look and feel of your experience.</p>
      </div>

      <div style={{display: "grid", gridTemplateColumns: "1fr", gap: "1rem"}}>
        {/* Theme Card */}
        <div style={{borderRadius: "0.75rem", border: "1px solid #e5e7eb", padding: "1.25rem"}}>
          <div style={{display: "flex", alignItems: "center", gap: "0.5rem"}}>
            <TbBrush style={{height: "1rem", width: "1rem"}} />
            <h3 style={{fontWeight: "600"}}>Theme</h3>
          </div>
          <p style={{marginTop: "0.25rem", fontSize: "0.75rem", color: "#6b7280"}}>Choose your preferred color scheme.</p>
          <div style={{marginTop: "0.75rem", display: "flex", gap: "0.5rem"}}>
            {[
              {icon: <TbSun style={{marginRight: "0.375rem", height: "1rem", width: "1rem"}} />, label: "Light", active: true},
              {icon: <TbMoon style={{marginRight: "0.375rem", height: "1rem", width: "1rem"}} />, label: "Dark", active: false},
              {icon: <TbSettings style={{marginRight: "0.375rem", height: "1rem", width: "1rem"}} />, label: "System", active: false},
            ].map((t) => (
              <button
                key={t.label}
                style={{
                  display: "flex",
                  flex: "1",
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: "0.375rem",
                  paddingLeft: "0.75rem",
                  paddingRight: "0.75rem",
                  paddingTop: "0.375rem",
                  paddingBottom: "0.375rem",
                  fontSize: "0.875rem",
                  ...(t.active ? {backgroundColor: "#111827", color: "#ffffff"} : {border: "1px solid #e5e7eb"}),
                }}>
                {t.icon}
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Font Card */}
        <div style={{borderRadius: "0.75rem", border: "1px solid #e5e7eb", padding: "1.25rem"}}>
          <div style={{display: "flex", alignItems: "center", gap: "0.5rem"}}>
            <TbTypography style={{height: "1rem", width: "1rem"}} />
            <h3 style={{fontWeight: "600"}}>Font</h3>
          </div>
          <p style={{marginTop: "0.25rem", fontSize: "0.75rem", color: "#6b7280"}}>Choose a font that works best for you.</p>
          <div style={{marginTop: "0.75rem", display: "flex", gap: "0.5rem"}}>
            <button
              style={{
                flex: "1",
                borderRadius: "0.375rem",
                backgroundColor: "#111827",
                paddingLeft: "0.75rem",
                paddingRight: "0.75rem",
                paddingTop: "0.375rem",
                paddingBottom: "0.375rem",
                fontSize: "0.875rem",
                color: "#ffffff",
              }}>
              Normal
            </button>
            <button
              style={{
                flex: "1",
                borderRadius: "0.375rem",
                border: "1px solid #e5e7eb",
                paddingLeft: "0.75rem",
                paddingRight: "0.75rem",
                paddingTop: "0.375rem",
                paddingBottom: "0.375rem",
                fontSize: "0.875rem",
              }}>
              Dyslexic
            </button>
          </div>
          <p style={{marginTop: "0.5rem", fontSize: "0.75rem", color: "#9ca3af"}}>OpenDyslexic font improves readability.</p>
        </div>

        {/* Theme Presets Card */}
        <div style={{borderRadius: "0.75rem", border: "1px solid #e5e7eb", padding: "1.25rem", gridColumn: "span 2"}}>
          <div style={{display: "flex", alignItems: "center", gap: "0.5rem"}}>
            <TbPalette style={{height: "1rem", width: "1rem"}} />
            <h3 style={{fontWeight: "600"}}>Theme Presets</h3>
          </div>
          <p style={{marginTop: "0.25rem", fontSize: "0.75rem", color: "#6b7280"}}>Quick-apply a curated color palette.</p>
          <div style={{marginTop: "0.75rem", display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "0.5rem"}}>
            {[
              {name: "Ocean", colors: ["#0ea5e9", "#06b6d4", "#3b82f6"]},
              {name: "Sunset", colors: ["#f97316", "#ef4444", "#eab308"]},
              {name: "Forest", colors: ["#22c55e", "#14b8a6", "#10b981"]},
              {name: "Custom", colors: ["#8b5cf6", "#ec4899", "#6366f1"]},
            ].map((p) => (
              <button
                key={p.name}
                style={{borderRadius: "0.5rem", border: "1px solid #e5e7eb", padding: "0.75rem", textAlign: "center", fontSize: "0.75rem"}}>
                <div style={{marginBottom: "0.5rem", display: "flex", justifyContent: "center", gap: "0.25rem"}}>
                  {p.colors.map((c) => (
                    <span
                      key={c}
                      style={{height: "1rem", width: "1rem", borderRadius: "9999px", backgroundColor: c}}
                    />
                  ))}
                </div>
                <span style={{fontWeight: "500"}}>{p.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Language Card */}
        <div style={{borderRadius: "0.75rem", border: "1px solid #e5e7eb", padding: "1.25rem"}}>
          <div style={{display: "flex", alignItems: "center", gap: "0.5rem"}}>
            <TbGlobe style={{height: "1rem", width: "1rem"}} />
            <h3 style={{fontWeight: "600"}}>Language</h3>
          </div>
          <p style={{marginTop: "0.25rem", fontSize: "0.75rem", color: "#6b7280"}}>Choose your display language.</p>
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
            English (EN)
          </div>
        </div>

        {/* Advanced Options Card */}
        <div style={{borderRadius: "0.75rem", border: "1px solid #e5e7eb", padding: "1.25rem"}}>
          <div style={{display: "flex", alignItems: "center", gap: "0.5rem"}}>
            <TbSettings style={{height: "1rem", width: "1rem"}} />
            <h3 style={{fontWeight: "600"}}>Advanced</h3>
          </div>
          <p style={{marginTop: "0.25rem", fontSize: "0.75rem", color: "#6b7280"}}>Fine-tune your experience.</p>
          <div style={{marginTop: "0.75rem", display: "flex", flexDirection: "column", gap: "0.75rem"}}>
            <div style={{display: "flex", alignItems: "center", justifyContent: "space-between"}}>
              <div>
                <p style={{fontSize: "0.875rem", fontWeight: "500"}}>Compact Mode</p>
                <p style={{fontSize: "0.75rem", color: "#9ca3af"}}>Reduce spacing for denser layouts.</p>
              </div>
              <div style={{height: "1.25rem", width: "2.25rem", borderRadius: "9999px", backgroundColor: "#e5e7eb"}} />
            </div>
            <hr style={{borderColor: "#e5e7eb"}} />
            <div style={{display: "flex", alignItems: "center", justifyContent: "space-between"}}>
              <div>
                <p style={{fontSize: "0.875rem", fontWeight: "500"}}>Animations</p>
                <p style={{fontSize: "0.75rem", color: "#9ca3af"}}>Enable smooth transitions.</p>
              </div>
              <div style={{height: "1.25rem", width: "2.25rem", borderRadius: "9999px", backgroundColor: "#2563eb"}} />
            </div>
          </div>
        </div>
      </div>
    </section>
  ),
};
