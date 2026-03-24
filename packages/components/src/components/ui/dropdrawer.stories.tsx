import type {Meta, StoryObj} from "storybook-react-rsbuild";
import {Button} from "./button";

const meta = {
  title: "Components/Navigation/DropDrawer",
  component: () => null,
  tags: ["autodocs"],
  parameters: {
    layout: "centered",
  },
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * DropDrawer is a responsive component that renders as a dropdown menu on desktop
 * and a drawer on mobile devices. It combines the functionality of both Drawer
 * and DropdownMenu components with automatic responsive switching based on viewport size.
 *
 * The component uses the `useIsMobile` hook to detect the device type and renders
 * the appropriate UI pattern. This ensures optimal user experience across all devices.
 */
export const Overview: Story = {
  render: () => (
    <div style={{padding: "2rem", textAlign: "center"}}>
      <h2 style={{fontSize: "1.5rem", fontWeight: "bold", marginBottom: "1rem"}}>DropDrawer Component</h2>
      <p style={{marginBottom: "1rem", color: "#6b7280"}}>A responsive navigation component that adapts to screen size.</p>
      <div style={{padding: "1.5rem", background: "#f9fafb", borderRadius: "8px", textAlign: "left"}}>
        <h3 style={{fontSize: "1.125rem", fontWeight: "600", marginBottom: "0.75rem"}}>Features:</h3>
        <ul style={{listStyleType: "disc", paddingLeft: "1.5rem", color: "#4b5563"}}>
          <li>Desktop: Dropdown menu with hover/click interactions</li>
          <li>Mobile: Bottom drawer with swipe gestures</li>
          <li>Automatic device detection</li>
          <li>Submenu support with navigation</li>
          <li>Full keyboard accessibility</li>
        </ul>
      </div>
      <p style={{marginTop: "1.5rem", fontSize: "0.875rem", color: "#9ca3af"}}>
        This component is best viewed in the application context. Resize your browser to see responsive behavior.
      </p>
    </div>
  ),
};

/**
 * Desktop view shows a dropdown menu pattern with positioning.
 */
export const DesktopView: Story = {
  render: () => (
    <div style={{padding: "2rem"}}>
      <div style={{padding: "1.5rem", background: "#f3f4f6", borderRadius: "8px"}}>
        <h3 style={{fontSize: "1.125rem", fontWeight: "600", marginBottom: "1rem"}}>Desktop Behavior</h3>
        <p style={{marginBottom: "0.75rem", color: "#4b5563"}}>
          On desktop (viewport width ≥ 768px), DropDrawer renders as a dropdown menu:
        </p>
        <ul style={{listStyleType: "disc", paddingLeft: "1.5rem", color: "#6b7280", fontSize: "0.875rem"}}>
          <li>Opens below the trigger button</li>
          <li>Supports hover interactions</li>
          <li>Nested submenus slide in from the side</li>
          <li>Click outside to close</li>
        </ul>
      </div>
    </div>
  ),
};

/**
 * Mobile view shows a drawer pattern sliding from the bottom.
 */
export const MobileView: Story = {
  render: () => (
    <div style={{padding: "2rem"}}>
      <div style={{padding: "1.5rem", background: "#f3f4f6", borderRadius: "8px"}}>
        <h3 style={{fontSize: "1.125rem", fontWeight: "600", marginBottom: "1rem"}}>Mobile Behavior</h3>
        <p style={{marginBottom: "0.75rem", color: "#4b5563"}}>On mobile (viewport width &lt; 768px), DropDrawer renders as a drawer:</p>
        <ul style={{listStyleType: "disc", paddingLeft: "1.5rem", color: "#6b7280", fontSize: "0.875rem"}}>
          <li>Slides up from the bottom of the screen</li>
          <li>Includes a drag handle for swipe gestures</li>
          <li>Nested submenus show with back navigation</li>
          <li>Overlay backdrop dims the background</li>
        </ul>
      </div>
    </div>
  ),
};

/**
 * DropDrawer with checkbox items for multi-selection.
 */
export const WithCheckboxItems: Story = {
  render: () => (
    <div style={{padding: "2rem"}}>
      <div style={{padding: "1.5rem", background: "#f9fafb", borderRadius: "8px"}}>
        <h3 style={{fontSize: "1.125rem", fontWeight: "600", marginBottom: "1rem"}}>Multi-Select Menu</h3>
        <p style={{marginBottom: "1rem", color: "#4b5563"}}>DropDrawer can contain checkbox items for multi-selection scenarios:</p>
        <div
          style={{
            padding: "1rem",
            background: "#fff",
            border: "1px solid #e5e7eb",
            borderRadius: "6px",
          }}>
          {[
            {label: "Show notifications", checked: true},
            {label: "Enable sound", checked: false},
            {label: "Auto-save", checked: true},
            {label: "Dark mode", checked: false},
          ].map((item, idx) => (
            <div
              key={idx}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                padding: "8px",
                borderBottom: idx < 3 ? "1px solid #f3f4f6" : "none",
              }}>
              <input
                type='checkbox'
                defaultChecked={item.checked}
                style={{width: "16px", height: "16px"}}
              />
              <span style={{fontSize: "14px"}}>{item.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  ),
};

/**
 * DropDrawer with a destructive action (delete, remove).
 */
export const Destructive: Story = {
  render: () => (
    <div style={{padding: "2rem"}}>
      <div style={{padding: "1.5rem", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: "8px"}}>
        <h3 style={{fontSize: "1.125rem", fontWeight: "600", marginBottom: "1rem", color: "#dc2626"}}>Destructive Actions</h3>
        <p style={{marginBottom: "1rem", color: "#991b1b"}}>DropDrawer can include destructive actions with appropriate styling:</p>
        <div
          style={{
            padding: "1rem",
            background: "#fff",
            border: "1px solid #e5e7eb",
            borderRadius: "6px",
          }}>
          <Button
            variant='ghost'
            style={{width: "100%", justifyContent: "flex-start", marginBottom: "4px"}}>
            Edit
          </Button>
          <Button
            variant='ghost'
            style={{width: "100%", justifyContent: "flex-start", marginBottom: "4px"}}>
            Duplicate
          </Button>
          <Button
            variant='ghost'
            style={{width: "100%", justifyContent: "flex-start", marginBottom: "4px"}}>
            Archive
          </Button>
          <div style={{borderTop: "1px solid #e5e7eb", marginTop: "8px", paddingTop: "8px"}}>
            <Button
              variant='ghost'
              style={{
                width: "100%",
                justifyContent: "flex-start",
                color: "#dc2626",
              }}>
              <svg
                style={{width: "16px", height: "16px", marginRight: "8px"}}
                fill='none'
                viewBox='0 0 24 24'
                stroke='currentColor'>
                <path
                  strokeLinecap='round'
                  strokeLinejoin='round'
                  strokeWidth={2}
                  d='M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16'
                />
              </svg>
              Delete
            </Button>
          </div>
        </div>
      </div>
    </div>
  ),
};

/**
 * DropDrawer organized into labeled sections.
 */
export const WithSections: Story = {
  render: () => (
    <div style={{padding: "2rem"}}>
      <div style={{padding: "1.5rem", background: "#f9fafb", borderRadius: "8px"}}>
        <h3 style={{fontSize: "1.125rem", fontWeight: "600", marginBottom: "1rem"}}>Sectioned Menu</h3>
        <p style={{marginBottom: "1rem", color: "#4b5563"}}>DropDrawer can be organized into multiple sections with labels:</p>
        <div
          style={{
            padding: "1rem",
            background: "#fff",
            border: "1px solid #e5e7eb",
            borderRadius: "6px",
          }}>
          <div style={{marginBottom: "12px"}}>
            <div
              style={{
                fontSize: "12px",
                fontWeight: 600,
                color: "#6b7280",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                marginBottom: "8px",
                paddingLeft: "8px",
              }}>
              Account
            </div>
            <Button
              variant='ghost'
              style={{width: "100%", justifyContent: "flex-start", marginBottom: "2px"}}>
              Profile
            </Button>
            <Button
              variant='ghost'
              style={{width: "100%", justifyContent: "flex-start", marginBottom: "2px"}}>
              Settings
            </Button>
          </div>
          <div style={{borderTop: "1px solid #e5e7eb", paddingTop: "12px", marginBottom: "12px"}}>
            <div
              style={{
                fontSize: "12px",
                fontWeight: 600,
                color: "#6b7280",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                marginBottom: "8px",
                paddingLeft: "8px",
              }}>
              Help
            </div>
            <Button
              variant='ghost'
              style={{width: "100%", justifyContent: "flex-start", marginBottom: "2px"}}>
              Documentation
            </Button>
            <Button
              variant='ghost'
              style={{width: "100%", justifyContent: "flex-start", marginBottom: "2px"}}>
              Support
            </Button>
          </div>
          <div style={{borderTop: "1px solid #e5e7eb", paddingTop: "12px"}}>
            <Button
              variant='ghost'
              style={{width: "100%", justifyContent: "flex-start"}}>
              Sign Out
            </Button>
          </div>
        </div>
      </div>
    </div>
  ),
};
