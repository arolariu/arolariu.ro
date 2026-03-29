import type {Meta, StoryObj} from "@storybook/react";
import {TbHelpCircle, TbMessage, TbSettings} from "react-icons/tb";

/**
 * Static visual preview of the GenerativeView (AI chat) component.
 *
 * @remarks Static preview — component uses complex state, MessageList sub-component,
 * and invoice data that cannot be easily mocked in Storybook. This story renders a
 * faithful HTML replica of the chat UI including tabs and settings panel.
 */
const meta = {
  title: "Invoices/ViewInvoices/Views/GenerativeView",
  parameters: {
    layout: "fullscreen",
  },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

/** Default generative view with chat tab and welcome message. */
export const Default: Story = {
  render: () => (
    <div style={{display: "flex", flexDirection: "column", gap: "1rem"}}>
      {/* Header */}
      <div style={{display: "flex", alignItems: "flex-start", justifyContent: "space-between"}}>
        <div>
          <h2 style={{fontSize: "1.25rem", fontWeight: 700}}>AI Invoice Analyst</h2>
          <p style={{fontSize: "0.875rem", color: "#6b7280"}}>Chat with AI to analyze your invoices and get spending insights.</p>
        </div>
        <button
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.25rem",
            borderRadius: "0.375rem",
            border: "1px solid #e5e7eb",
            padding: "0.375rem 0.75rem",
            fontSize: "0.875rem",
          }}>
          <TbHelpCircle style={{height: "1rem", width: "1rem"}} />
          <span>Help</span>
        </button>
      </div>

      {/* Tabs */}
      <div style={{display: "flex", gap: "0.25rem", borderRadius: "0.5rem", backgroundColor: "#f3f4f6", padding: "0.25rem"}}>
        <button
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            borderRadius: "0.375rem",
            backgroundColor: "#ffffff",
            padding: "0.375rem 1rem",
            fontSize: "0.875rem",
            fontWeight: 500,
            boxShadow: "0 1px 2px 0 rgba(0,0,0,0.05)",
          }}>
          <TbMessage style={{height: "1rem", width: "1rem"}} />
          <span>Chat</span>
        </button>
        <button
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            borderRadius: "0.375rem",
            padding: "0.375rem 1rem",
            fontSize: "0.875rem",
            color: "#6b7280",
          }}>
          <TbSettings style={{height: "1rem", width: "1rem"}} />
          <span>Settings</span>
        </button>
      </div>

      {/* Chat Card */}
      <div style={{borderRadius: "0.75rem", border: "1px solid #e5e7eb"}}>
        <div style={{borderBottom: "1px solid #e5e7eb", padding: "1rem"}}>
          <h3 style={{fontWeight: 600}}>AI Invoice Analyst</h3>
          <p style={{fontSize: "0.875rem", color: "#6b7280"}}>Ask questions about your invoices, spending patterns, and more.</p>
        </div>
        <div style={{padding: "1rem"}}>
          <div style={{display: "flex", flexDirection: "column", gap: "1rem"}}>
            {/* Welcome message */}
            <div style={{display: "flex", gap: "0.75rem"}}>
              <div
                style={{
                  display: "flex",
                  height: "2rem",
                  width: "2rem",
                  flexShrink: 0,
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: "9999px",
                  backgroundColor: "#f3e8ff",
                  fontSize: "0.875rem",
                }}>
                🤖
              </div>
              <div style={{maxWidth: "80%", borderRadius: "0.5rem", backgroundColor: "#f3f4f6", padding: "0.75rem", fontSize: "0.875rem"}}>
                Hello! I&apos;m your AI Invoice Analyst. I can help you understand your spending patterns, compare prices, and provide
                insights about your purchases. What would you like to know?
              </div>
            </div>
          </div>
          {/* Input area placeholder */}
          <div style={{marginTop: "1rem", borderRadius: "0.375rem", border: "1px solid #e5e7eb", padding: "0.5rem"}}>
            <input
              type='text'
              placeholder='Ask about your invoices...'
              style={{width: "100%", backgroundColor: "transparent", fontSize: "0.875rem", outline: "none"}}
              readOnly
            />
          </div>
        </div>
      </div>
    </div>
  ),
};
