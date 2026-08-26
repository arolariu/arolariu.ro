import type {Meta, StoryObj} from "@storybook/react";
import {ThemeProvider} from "next-themes";
import {userEvent} from "storybook/test";
import {FontContextProvider} from "@/contexts/FontContext";
import Commander from "./Commander";

/**
 * The Commander component renders a global command palette (Ctrl+K / Cmd+K)
 * dialog with navigation, theme, language, accessibility, and fun-easter-egg
 * commands. It has no props of its own — its open state is entirely internal,
 * toggled by the keyboard shortcut — so stories drive that shortcut via a
 * `play` function to reveal the actual rendered dialog content.
 */
const meta = {
  title: "Site/Commander",
  component: Commander,
  decorators: [
    (Story) => (
      <ThemeProvider
        attribute='class'
        defaultTheme='light'
        enableSystem={false}>
        <FontContextProvider>
          <div style={{minHeight: "200px"}}>
            <Story />
          </div>
        </FontContextProvider>
      </ThemeProvider>
    ),
  ],
  parameters: {
    layout: "centered",
  },
} satisfies Meta<typeof Commander>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Closed state — the command palette renders nothing until Ctrl+K/Cmd+K is pressed. */
export const Closed: Story = {};

/** Opened via the real Ctrl+K keyboard shortcut, showing every command group. */
export const Opened: Story = {
  play: async () => {
    await userEvent.keyboard("{Control>}k{/Control}");
  },
};
