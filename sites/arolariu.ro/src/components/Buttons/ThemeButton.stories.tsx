import type {Meta, StoryObj} from "@storybook/react";
import {NextIntlClientProvider} from "next-intl";
import {ThemeProvider} from "next-themes";
import messages from "../../../messages/en.json";
import ThemeButton from "./ThemeButton";

/**
 * The ThemeButton toggles between light and dark themes using `next-themes`.
 *
 * It renders a moon icon in light mode and a sun icon in dark mode,
 * animated via `motion/react`. The button waits until mount before rendering
 * to avoid SSR hydration mismatches.
 */
const meta = {
  title: "Components/Buttons/ThemeButton",
  component: ThemeButton,
  tags: ["autodocs"],
  decorators: [
    (Story) => (
      <NextIntlClientProvider
        locale="en"
        messages={messages}
        timeZone="Europe/Bucharest">
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem={false}>
          <div className="flex min-h-[100px] items-center justify-center">
            <Story />
          </div>
        </ThemeProvider>
      </NextIntlClientProvider>
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

/** Theme toggle button starting in dark mode. */
export const DarkMode: Story = {
  decorators: [
    (Story) => (
      <NextIntlClientProvider
        locale="en"
        messages={messages}
        timeZone="Europe/Bucharest">
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem={false}>
          <div className="flex min-h-[100px] items-center justify-center dark">
            <Story />
          </div>
        </ThemeProvider>
      </NextIntlClientProvider>
    ),
  ],
};
