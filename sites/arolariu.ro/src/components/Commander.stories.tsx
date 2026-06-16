import {FontContextProvider} from "@/contexts/FontContext";
import type {Meta, StoryObj} from "@storybook/react";
import {expect, userEvent, waitFor, within} from "storybook/test";
import Commander from "./Commander";

/**
 * The Commander is the global command palette (Ctrl/Cmd+K) used across the site
 * for quick navigation, theme/locale/font switching, and fun visual effects.
 *
 * @remarks
 * The real component depends on `useFontContext`, `usePreferencesStore`,
 * `useTheme`, `useRouter`, and `useTranslations`. The Storybook preview already
 * provides intl, theme, and the Next.js router globally; this story adds the
 * `FontContextProvider` that the global decorators do not.
 *
 * The palette renders a `CommandDialog` that stays closed until toggled with
 * Ctrl/Cmd+K, so the stories open it from a `play` function to make the real UI
 * visible.
 */
const meta = {
  title: "arolariu.ro/Site/Commander",
  component: Commander,
  decorators: [
    (Story) => (
      <FontContextProvider>
        <Story />
      </FontContextProvider>
    ),
  ],
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
} satisfies Meta<typeof Commander>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Opens the command palette via Ctrl+K and shows the real list of commands
 * (navigation, theme, language, font, and effects).
 */
export const Open: Story = {
  play: async ({step}) => {
    // The dialog renders in a portal at the document body, not inside the canvas.
    const body = within(document.body);

    await step("opens the command palette via Ctrl+K", async () => {
      await userEvent.keyboard("{Control>}k{/Control}");
      await expect(await body.findByRole("dialog")).toBeInTheDocument();
      await expect(await body.findByPlaceholderText(/command/i)).toBeInTheDocument();
      await expect(await body.findByText(/homepage/i)).toBeInTheDocument();
    });
  },
};

/**
 * Opens the palette and types a query that matches no command, showing the
 * empty state.
 */
export const NoResults: Story = {
  play: async ({step}) => {
    const body = within(document.body);

    await step("opens the palette and types a non-matching query", async () => {
      await userEvent.keyboard("{Control>}k{/Control}");
      const input = await body.findByPlaceholderText(/command/i);
      await userEvent.type(input, "nonexistent command xyz");
      await waitFor(async () => {
        await expect(await body.findByText(/no results/i)).toBeInTheDocument();
      });
    });
  },
};
