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
