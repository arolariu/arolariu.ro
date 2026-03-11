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

/** Theme button inside a toolbar-like header container. */
export const InToolbar: Story = {
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
          <header className="flex h-16 items-center justify-between border-b bg-white px-6 dark:border-gray-700 dark:bg-gray-900">
            <span className="text-lg font-semibold">arolariu.ro</span>
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-500">Settings</span>
              <Story />
            </div>
          </header>
        </ThemeProvider>
      </NextIntlClientProvider>
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
