import type {Meta, StoryObj} from "@storybook/react";
import {ThemeProvider} from "next-themes";

/**
 * The Header component renders the site-wide navigation bar with logo,
 * navigation links, auth button, and theme toggle.
 *
 * Because `Header` depends on Clerk (`useAuth` in Navigation) and
 * `useWindowSize` from `@arolariu/components`, this story renders
 * the **skeleton / loading state** of the header to avoid provider issues.
 */
const meta = {
  title: "Site/Header",
  decorators: [
    (Story) => (
      <ThemeProvider
        attribute='class'
        defaultTheme='light'
        enableSystem={false}>
        <Story />
      </ThemeProvider>
    ),
  ],
  parameters: {
    layout: "fullscreen",
  },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

/** Header loading skeleton — a pulsing bar matching the header layout. */
export const Skeleton: Story = {
  decorators: [
    (Story) => (
      <div style={{minHeight: "80px", backgroundColor: "#f9fafb"}}>
        <Story />
      </div>
    ),
  ],
  render: () => (
    <header
      style={{
        borderBottom: "1px solid #e5e7eb",
        backgroundColor: "#ffffff",
        paddingLeft: "1rem",
        paddingRight: "1rem",
        paddingTop: "0.75rem",
        paddingBottom: "0.75rem",
      }}>
      <nav
        style={{
          marginLeft: "auto",
          marginRight: "auto",
          display: "flex",
          maxWidth: "80rem",
          alignItems: "center",
          justifyContent: "space-between",
        }}>
        <div style={{display: "flex", alignItems: "center", gap: "0.75rem"}}>
          <div style={{height: "2.5rem", width: "2.5rem", borderRadius: "9999px", backgroundColor: "#e5e7eb"}} />
          <div style={{height: "1.25rem", width: "7rem", borderRadius: "0.25rem", backgroundColor: "#e5e7eb"}} />
        </div>
        <div style={{display: "none", gap: "1.5rem"}}>
          <div style={{height: "1rem", width: "5rem", borderRadius: "0.25rem", backgroundColor: "#e5e7eb"}} />
          <div style={{height: "1rem", width: "4rem", borderRadius: "0.25rem", backgroundColor: "#e5e7eb"}} />
          <div style={{height: "1rem", width: "6rem", borderRadius: "0.25rem", backgroundColor: "#e5e7eb"}} />
        </div>
        <div style={{display: "flex", alignItems: "center", gap: "0.75rem"}}>
          <div style={{height: "2rem", width: "2rem", borderRadius: "9999px", backgroundColor: "#e5e7eb"}} />
          <div style={{height: "2rem", width: "2rem", borderRadius: "9999px", backgroundColor: "#e5e7eb"}} />
        </div>
      </nav>
    </header>
  ),
};

/** Header skeleton in dark mode context. */
export const SkeletonDark: Story = {
  decorators: [
    (Story) => (
      <ThemeProvider
        attribute='class'
        defaultTheme='dark'
        enableSystem={false}>
        <div className='dark'>
          <Story />
        </div>
      </ThemeProvider>
    ),
  ],
  render: () => (
    <header
      style={{
        borderBottom: "1px solid #374151",
        backgroundColor: "#111827",
        paddingLeft: "1rem",
        paddingRight: "1rem",
        paddingTop: "0.75rem",
        paddingBottom: "0.75rem",
      }}>
      <nav
        style={{
          marginLeft: "auto",
          marginRight: "auto",
          display: "flex",
          maxWidth: "80rem",
          alignItems: "center",
          justifyContent: "space-between",
        }}>
        <div style={{display: "flex", alignItems: "center", gap: "0.75rem"}}>
          <div style={{height: "2.5rem", width: "2.5rem", borderRadius: "9999px", backgroundColor: "#374151"}} />
          <div style={{height: "1.25rem", width: "7rem", borderRadius: "0.25rem", backgroundColor: "#374151"}} />
        </div>
        <div style={{display: "none", gap: "1.5rem"}}>
          <div style={{height: "1rem", width: "5rem", borderRadius: "0.25rem", backgroundColor: "#374151"}} />
          <div style={{height: "1rem", width: "4rem", borderRadius: "0.25rem", backgroundColor: "#374151"}} />
          <div style={{height: "1rem", width: "6rem", borderRadius: "0.25rem", backgroundColor: "#374151"}} />
        </div>
        <div style={{display: "flex", alignItems: "center", gap: "0.75rem"}}>
          <div style={{height: "2rem", width: "2rem", borderRadius: "9999px", backgroundColor: "#374151"}} />
          <div style={{height: "2rem", width: "2rem", borderRadius: "9999px", backgroundColor: "#374151"}} />
        </div>
      </nav>
    </header>
  ),
};
/** Header skeleton simulating a scrolled state with shadow and compact height. */
export const WithScrolled: Story = {
  render: () => (
    <header
      style={{
        borderBottom: "1px solid #e5e7eb",
        backgroundColor: "rgba(255, 255, 255, 0.95)",
        paddingLeft: "1rem",
        paddingRight: "1rem",
        paddingTop: "0.5rem",
        paddingBottom: "0.5rem",
        boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
        backdropFilter: "blur(8px)",
      }}>
      <nav
        style={{
          marginLeft: "auto",
          marginRight: "auto",
          display: "flex",
          maxWidth: "80rem",
          alignItems: "center",
          justifyContent: "space-between",
        }}>
        <div style={{display: "flex", alignItems: "center", gap: "0.5rem"}}>
          <div style={{height: "2rem", width: "2rem", borderRadius: "9999px", backgroundColor: "#e5e7eb"}} />
          <div style={{height: "1rem", width: "6rem", borderRadius: "0.25rem", backgroundColor: "#e5e7eb"}} />
        </div>
        <div style={{display: "none", gap: "1rem"}}>
          <div style={{height: "0.75rem", width: "4rem", borderRadius: "0.25rem", backgroundColor: "#e5e7eb"}} />
          <div style={{height: "0.75rem", width: "3.5rem", borderRadius: "0.25rem", backgroundColor: "#e5e7eb"}} />
          <div style={{height: "0.75rem", width: "5rem", borderRadius: "0.25rem", backgroundColor: "#e5e7eb"}} />
        </div>
        <div style={{display: "flex", alignItems: "center", gap: "0.5rem"}}>
          <div style={{height: "1.75rem", width: "1.75rem", borderRadius: "9999px", backgroundColor: "#e5e7eb"}} />
          <div style={{height: "1.75rem", width: "1.75rem", borderRadius: "9999px", backgroundColor: "#e5e7eb"}} />
        </div>
      </nav>
    </header>
  ),
};
