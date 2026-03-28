import type {Meta, StoryObj} from "@storybook/react";
import {TbAlertTriangle, TbClipboard, TbHome, TbRefresh} from "react-icons/tb";

/**
 * Static visual preview of the GlobalError component.
 *
 * The actual component renders a full HTML shell (html/body) with error
 * boundary recovery, QR diagnostics, and context providers. This story
 * renders a faithful HTML replica of the error UI content without the
 * full document shell.
 */
const meta = {
  title: "Pages/Home/GlobalError",
  parameters: {
    layout: "fullscreen",
  },
  decorators: [
    (Story) => (
      <div style={{minHeight: "100vh", backgroundColor: "#f9fafb", padding: "1rem"}}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

/** Default global error page with error details card. */
export const Default: Story = {
  render: () => (
    <div
      style={{
        marginLeft: "auto",
        marginRight: "auto",
        maxWidth: "42rem",
        display: "flex",
        flexDirection: "column",
        gap: "2rem",
        paddingTop: "3rem",
        paddingBottom: "3rem",
      }}>
      {/* Hero Section */}
      <section style={{textAlign: "center"}}>
        <div
          style={{
            marginLeft: "auto",
            marginRight: "auto",
            display: "flex",
            height: "5rem",
            width: "5rem",
            alignItems: "center",
            justifyContent: "center",
            borderRadius: "9999px",
            backgroundColor: "#fee2e2",
          }}>
          <TbAlertTriangle style={{height: "2.5rem", width: "2.5rem", color: "#dc2626"}} />
        </div>
        <h1 style={{marginTop: "1rem", fontSize: "1.875rem", fontWeight: "700"}}>Something went wrong</h1>
        <p style={{marginTop: "0.5rem", color: "#6b7280"}}>An unexpected error occurred. We&apos;re sorry for the inconvenience.</p>
      </section>

      {/* Error Details Card */}
      <div
        style={{
          borderRadius: "0.75rem",
          border: "1px solid #e5e7eb",
          backgroundColor: "#ffffff",
          boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)",
        }}>
        <div style={{borderBottom: "1px solid #e5e7eb", padding: "1.5rem"}}>
          <h2 style={{display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "1.125rem", fontWeight: "600"}}>
            <TbAlertTriangle style={{height: "1.25rem", width: "1.25rem", color: "#ef4444"}} />
            Error Details
          </h2>
          <p style={{marginTop: "0.25rem", fontSize: "0.875rem", color: "#6b7280"}}>
            Error ID:{" "}
            <code
              style={{
                borderRadius: "0.25rem",
                backgroundColor: "#f3f4f6",
                paddingLeft: "0.375rem",
                paddingRight: "0.375rem",
                paddingTop: "0.125rem",
                paddingBottom: "0.125rem",
                fontSize: "0.75rem",
              }}>
              ERR_A1B2C3D4
            </code>
          </p>
        </div>

        <div style={{display: "flex", flexDirection: "column", gap: "1rem", padding: "1.5rem"}}>
          {/* Error Alert */}
          <div style={{borderRadius: "0.5rem", border: "1px solid #fecaca", backgroundColor: "#fef2f2", padding: "1rem"}}>
            <h4 style={{display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.875rem", fontWeight: "600", color: "#991b1b"}}>
              <TbAlertTriangle style={{height: "1rem", width: "1rem"}} />
              What happened?
            </h4>
            <p style={{marginTop: "0.25rem", fontSize: "0.875rem", color: "#b91c1c"}}>
              TypeError: Cannot read properties of undefined (reading &apos;map&apos;)
            </p>
          </div>

          {/* What to do */}
          <div style={{borderRadius: "0.5rem", border: "1px solid #e5e7eb", backgroundColor: "#f9fafb", padding: "1rem"}}>
            <h3 style={{fontSize: "0.875rem", fontWeight: "600"}}>What can you do?</h3>
            <ul
              style={{
                marginTop: "0.5rem",
                display: "flex",
                flexDirection: "column",
                gap: "0.25rem",
                fontSize: "0.875rem",
                color: "#4b5563",
              }}>
              <li>• Try refreshing the page</li>
              <li>• Clear your browser cache and try again</li>
              <li>• If the problem persists, contact support</li>
            </ul>
          </div>

          {/* QR Code placeholder */}
          <div style={{textAlign: "center"}}>
            <p style={{fontSize: "0.75rem", color: "#6b7280"}}>Scan to share diagnostics</p>
            <div
              style={{
                marginLeft: "auto",
                marginRight: "auto",
                marginTop: "0.5rem",
                display: "flex",
                height: "8rem",
                width: "8rem",
                alignItems: "center",
                justifyContent: "center",
                borderRadius: "0.5rem",
                border: "1px solid #e5e7eb",
                backgroundColor: "#ffffff",
              }}>
              <span style={{fontSize: "0.75rem", color: "#d1d5db"}}>QR Code</span>
            </div>
          </div>

          {/* Technical details */}
          <details style={{borderRadius: "0.5rem", border: "1px solid #e5e7eb"}}>
            <summary
              style={{
                cursor: "pointer",
                paddingLeft: "1rem",
                paddingRight: "1rem",
                paddingTop: "0.5rem",
                paddingBottom: "0.5rem",
                fontSize: "0.875rem",
                fontWeight: "500",
              }}>
              Technical Details
            </summary>
            <div style={{borderTop: "1px solid #e5e7eb", padding: "1rem"}}>
              <pre style={{overflowX: "auto", borderRadius: "0.5rem", backgroundColor: "#f3f4f6", padding: "0.75rem", fontSize: "0.75rem"}}>
                <code>
                  {JSON.stringify(
                    {
                      errorId: "ERR_A1B2C3D4",
                      errorMessage: "Cannot read properties of undefined",
                      timestamp: "2025-01-15T10:30:00.000Z",
                      url: "https://arolariu.ro/domains/invoices",
                    },
                    null,
                    2,
                  )}
                </code>
              </pre>
            </div>
          </details>
        </div>

        <div style={{display: "flex", flexWrap: "wrap", gap: "0.5rem", borderTop: "1px solid #e5e7eb", padding: "1rem"}}>
          <button
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              borderRadius: "0.375rem",
              backgroundColor: "#111827",
              paddingLeft: "1rem",
              paddingRight: "1rem",
              paddingTop: "0.5rem",
              paddingBottom: "0.5rem",
              fontSize: "0.875rem",
              color: "#ffffff",
              border: "none",
              cursor: "pointer",
            }}>
            <TbRefresh style={{height: "1rem", width: "1rem"}} />
            Try Again
          </button>
          <button
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              borderRadius: "0.375rem",
              border: "1px solid #e5e7eb",
              paddingLeft: "1rem",
              paddingRight: "1rem",
              paddingTop: "0.5rem",
              paddingBottom: "0.5rem",
              fontSize: "0.875rem",
              backgroundColor: "transparent",
              cursor: "pointer",
            }}>
            <TbHome style={{height: "1rem", width: "1rem"}} />
            Return Home
          </button>
          <button
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              borderRadius: "0.375rem",
              paddingLeft: "1rem",
              paddingRight: "1rem",
              paddingTop: "0.5rem",
              paddingBottom: "0.5rem",
              fontSize: "0.875rem",
              color: "#6b7280",
              backgroundColor: "transparent",
              border: "none",
              cursor: "pointer",
            }}>
            <TbClipboard style={{height: "1rem", width: "1rem"}} />
            Copy Error ID
          </button>
        </div>
      </div>

      {/* Support Section */}
      <section style={{textAlign: "center"}}>
        <p style={{fontSize: "0.875rem", color: "#6b7280"}}>
          Need help? Contact <span style={{color: "#9333ea", textDecoration: "underline"}}>admin@arolariu.ro</span> with error ID{" "}
          <code
            style={{
              borderRadius: "0.25rem",
              backgroundColor: "#f3f4f6",
              paddingLeft: "0.25rem",
              paddingRight: "0.25rem",
              fontSize: "0.75rem",
            }}>
            ERR_A1B2C3D4
          </code>
        </p>
      </section>
    </div>
  ),
};
