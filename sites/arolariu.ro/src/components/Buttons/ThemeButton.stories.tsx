import type {Meta, StoryObj} from "@storybook/react";
import {ThemeProvider} from "next-themes";
import ThemeButton from "./ThemeButton";

/**
 * The ThemeButton toggles between light and dark themes using `next-themes`.
 *
 * It renders a moon icon in light mode and a sun icon in dark mode,
 * animated via `motion/react`. The button waits until mount before rendering
 * to avoid SSR hydration mismatches.
 */
const meta = {
  title: "Site/Buttons/ThemeButton",
  component: ThemeButton,
  decorators: [
    (Story) => (
      <ThemeProvider
        attribute='class'
        defaultTheme='light'
        enableSystem={false}>
        <div style={{display: 'flex', minHeight: '100px', alignItems: 'center', justifyContent: 'center'}}>
          <Story />
        </div>
      </ThemeProvider>
    ),
  ],
  parameters: {
    layout: "centered",
  },
} satisfies Meta<typeof ThemeButton>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Default theme toggle button rendered in light mode. */
export const Default: Story = {};
/** Theme button inside a toolbar-like header container. */
export const InToolbar: Story = {
  decorators: [
    (Story) => (
      <ThemeProvider
        attribute='class'
        defaultTheme='light'
        enableSystem={false}>
        <header style={{display: 'flex', height: '4rem', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #e5e7eb', backgroundColor: '#ffffff', paddingLeft: '1.5rem', paddingRight: '1.5rem'}}>
          <span style={{fontSize: '1.125rem', fontWeight: '600'}}>arolariu.ro</span>
          <div style={{display: 'flex', alignItems: 'center', gap: '1rem'}}>
            <span style={{fontSize: '0.875rem', color: '#6b7280'}}>Settings</span>
            <Story />
          </div>
        </header>
      </ThemeProvider>
    ),
  ],
};

/** Theme button with animation description for visual testing. */
export const Animated: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "The ThemeButton uses `motion/react` for a smooth rotation and scale animation on toggle. Click the button to observe the icon transition between sun and moon with spring physics.",
      },
    },
  },
};
