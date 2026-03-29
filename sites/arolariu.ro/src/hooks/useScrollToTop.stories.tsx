import type {Meta, StoryObj} from "@storybook/react";
import {ScrollToTop} from "./useScrollToTop";

/**
 * The ScrollToTop component displays an animated floating action button (FAB)
 * that scrolls to the top of the page. It appears when the user scrolls past
 * 500px and uses Framer Motion for smooth entrance/exit animations.
 *
 * This story wraps the component with tall content to trigger the scroll threshold.
 */
const meta = {
  title: "Site/ScrollToTop",
  component: ScrollToTop,
  parameters: {
    layout: "fullscreen",
  },
} satisfies Meta<typeof ScrollToTop>;

export default meta;
type Story = StoryObj<typeof meta>;

/** ScrollToTop rendered within tall content — scroll down to see the FAB. */
export const Default: Story = {
  render: () => (
    <div style={{position: "relative"}}>
      <div style={{background: "linear-gradient(to bottom, #eff6ff, #ffffff)", padding: "2rem"}}>
        <h1 style={{marginBottom: "1rem", fontSize: "1.5rem", fontWeight: "700", color: "#111827"}}>Scroll Down to See the Button</h1>
        <p style={{marginBottom: "2rem", color: "#4b5563"}}>The ScrollToTop FAB appears after scrolling 500px. Try scrolling down!</p>
        {Array.from({length: 20}, (_, i) => (
          <div
            key={`section-${String(i)}`}
            style={{
              marginBottom: "1rem",
              borderRadius: "0.5rem",
              border: "1px solid #e5e7eb",
              backgroundColor: "#ffffff",
              padding: "1.5rem",
            }}>
            <h2 style={{marginBottom: "0.5rem", fontWeight: "600", color: "#111827"}}>Section {i + 1}</h2>
            <p style={{fontSize: "0.875rem", color: "#4b5563"}}>
              Lorem ipsum dolor sit amet, consectetur adipiscing elit. Pellentesque in ipsum id orci porta dapibus.
            </p>
          </div>
        ))}
      </div>
      <ScrollToTop />
    </div>
  ),
};

/** Static preview of the FAB button style (always visible). */
export const AlwaysVisible: Story = {
  render: () => (
    <div style={{display: "flex", minHeight: "200px", alignItems: "center", justifyContent: "center"}}>
      <button
        type='button'
        style={{
          display: "flex",
          height: "3rem",
          width: "3rem",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: "9999px",
          backgroundColor: "#2563eb",
          color: "#ffffff",
          boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)",
          border: "none",
          cursor: "pointer",
        }}
        aria-label='Scroll to top'>
        <svg
          style={{height: "1.25rem", width: "1.25rem"}}
          fill='none'
          viewBox='0 0 24 24'
          stroke='currentColor'>
          <path
            strokeLinecap='round'
            strokeLinejoin='round'
            strokeWidth={2}
            d='M5 15l7-7 7 7'
          />
        </svg>
      </button>
    </div>
  ),
};
