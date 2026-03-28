import type {Meta, StoryObj} from "@storybook/react";
import {TbBrain, TbMicrophone, TbRobot, TbSettings, TbSparkles, TbTemperature} from "react-icons/tb";

/**
 * Static visual preview of the SettingsAI component.
 *
 * The actual component depends on `usePreferencesStore` and AI model/behavior
 * constants, so this story renders a faithful HTML replica of the AI settings panel.
 */
const meta = {
  title: "Pages/Profile/SettingsAI",
  parameters: {
    layout: "fullscreen",
  },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

/** Default AI settings panel. */
export const Default: Story = {
  render: () => (
    <section style={{display: "flex", flexDirection: "column", gap: "1.5rem"}}>
      <div>
        <h2 style={{fontSize: "1.25rem", fontWeight: "700"}}>AI Assistant</h2>
        <p style={{fontSize: "0.875rem", color: "#6b7280"}}>Configure your AI assistant preferences.</p>
      </div>

      <div style={{display: "grid", gridTemplateColumns: "1fr", gap: "1rem"}}>
        {/* Model Selection */}
        <div style={{borderRadius: "0.75rem", border: "1px solid #e5e7eb", padding: "1.25rem", gridColumn: "span 2"}}>
          <div style={{display: "flex", alignItems: "center", gap: "0.5rem"}}>
            <TbRobot style={{height: "1rem", width: "1rem"}} />
            <h3 style={{fontWeight: "600"}}>AI Model</h3>
          </div>
          <p style={{marginTop: "0.25rem", fontSize: "0.75rem", color: "#6b7280"}}>Choose the AI model for analysis.</p>
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
            GPT-4o
          </div>
          <div style={{marginTop: "0.5rem", borderRadius: "0.375rem", backgroundColor: "#eff6ff", padding: "0.75rem"}}>
            <p style={{fontSize: "0.875rem", fontWeight: "500"}}>GPT-4o</p>
            <p style={{fontSize: "0.75rem", color: "#6b7280"}}>Most capable model with vision and reasoning</p>
          </div>
        </div>

        {/* Behavior */}
        <div style={{borderRadius: "0.75rem", border: "1px solid #e5e7eb", padding: "1.25rem"}}>
          <div style={{display: "flex", alignItems: "center", gap: "0.5rem"}}>
            <TbSparkles style={{height: "1rem", width: "1rem"}} />
            <h3 style={{fontWeight: "600"}}>Behavior</h3>
          </div>
          <p style={{marginTop: "0.25rem", fontSize: "0.75rem", color: "#6b7280"}}>Set the AI communication style.</p>
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
            Detailed
          </div>
          <p style={{marginTop: "0.25rem", fontSize: "0.75rem", color: "#9ca3af"}}>Thorough explanations and analysis</p>
        </div>

        {/* Temperature */}
        <div style={{borderRadius: "0.75rem", border: "1px solid #e5e7eb", padding: "1.25rem"}}>
          <div style={{display: "flex", alignItems: "center", gap: "0.5rem"}}>
            <TbTemperature style={{height: "1rem", width: "1rem"}} />
            <h3 style={{fontWeight: "600"}}>Temperature</h3>
          </div>
          <p style={{marginTop: "0.25rem", fontSize: "0.75rem", color: "#6b7280"}}>Balance between precision and creativity.</p>
          <div style={{marginTop: "0.75rem"}}>
            <div style={{display: "flex", justifyContent: "space-between", fontSize: "0.75rem", color: "#6b7280"}}>
              <span>Precise</span>
              <span>0.7</span>
              <span>Creative</span>
            </div>
            <div style={{marginTop: "0.25rem", height: "0.5rem", borderRadius: "9999px", backgroundColor: "#e5e7eb"}}>
              <div style={{height: "100%", width: "70%", borderRadius: "9999px", backgroundColor: "#2563eb"}} />
            </div>
          </div>
        </div>

        {/* Max Tokens */}
        <div style={{borderRadius: "0.75rem", border: "1px solid #e5e7eb", padding: "1.25rem"}}>
          <div style={{display: "flex", alignItems: "center", gap: "0.5rem"}}>
            <TbSettings style={{height: "1rem", width: "1rem"}} />
            <h3 style={{fontWeight: "600"}}>Max Tokens</h3>
          </div>
          <p style={{marginTop: "0.25rem", fontSize: "0.75rem", color: "#6b7280"}}>Control response length.</p>
          <div style={{marginTop: "0.75rem"}}>
            <div style={{display: "flex", justifyContent: "space-between", fontSize: "0.75rem", color: "#6b7280"}}>
              <span>512</span>
              <span>2048</span>
              <span>4096</span>
            </div>
            <div style={{marginTop: "0.25rem", height: "0.5rem", borderRadius: "9999px", backgroundColor: "#e5e7eb"}}>
              <div style={{height: "100%", width: "50%", borderRadius: "9999px", backgroundColor: "#2563eb"}} />
            </div>
          </div>
        </div>

        {/* Features */}
        <div style={{borderRadius: "0.75rem", border: "1px solid #e5e7eb", padding: "1.25rem"}}>
          <div style={{display: "flex", alignItems: "center", gap: "0.5rem"}}>
            <TbBrain style={{height: "1rem", width: "1rem"}} />
            <h3 style={{fontWeight: "600"}}>Features</h3>
          </div>
          <p style={{marginTop: "0.25rem", fontSize: "0.75rem", color: "#6b7280"}}>Enable AI capabilities.</p>
          <div style={{marginTop: "0.75rem", display: "flex", flexDirection: "column", gap: "0.75rem"}}>
            {[
              {label: "Auto Suggest", hint: "Get suggestions as you type", enabled: true},
              {label: "Context Awareness", hint: "Use invoice data for better answers", enabled: true},
              {label: "Memory", hint: "Remember conversation history", enabled: false},
            ].map((f) => (
              <div
                key={f.label}
                style={{display: "flex", alignItems: "center", justifyContent: "space-between"}}>
                <div>
                  <p style={{fontSize: "0.875rem", fontWeight: "500"}}>{f.label}</p>
                  <p style={{fontSize: "0.75rem", color: "#9ca3af"}}>{f.hint}</p>
                </div>
                <div
                  style={{height: "1.25rem", width: "2.25rem", borderRadius: "9999px", backgroundColor: f.enabled ? "#2563eb" : "#e5e7eb"}}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Voice */}
        <div style={{borderRadius: "0.75rem", border: "1px solid #e5e7eb", padding: "1.25rem"}}>
          <div style={{display: "flex", alignItems: "center", gap: "0.5rem"}}>
            <TbMicrophone style={{height: "1rem", width: "1rem"}} />
            <h3 style={{fontWeight: "600"}}>Voice</h3>
          </div>
          <p style={{marginTop: "0.25rem", fontSize: "0.75rem", color: "#6b7280"}}>Voice input settings.</p>
          <div style={{marginTop: "0.75rem", display: "flex", alignItems: "center", justifyContent: "space-between"}}>
            <div>
              <p style={{fontSize: "0.875rem", fontWeight: "500"}}>Voice Input</p>
              <p style={{fontSize: "0.75rem", color: "#9ca3af"}}>Use microphone for queries</p>
            </div>
            <div style={{height: "1.25rem", width: "2.25rem", borderRadius: "9999px", backgroundColor: "#e5e7eb"}} />
          </div>
        </div>
      </div>
    </section>
  ),
};
