import type {Meta, StoryObj} from "@storybook/react";
import {ThemeProvider} from "next-themes";
import Footer from "./Footer";

/**
 * The Footer component renders the site-wide footer with navigation links,
 * social media icons, build metadata, and branding. It uses `useTranslations`
 * from `next-intl` and requires a `NextIntlClientProvider` wrapper.
 */
const meta = {
  title: "Site/Footer",
  component: Footer,
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
} satisfies Meta<typeof Footer>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Default footer rendered in light mode. */
export const Default: Story = {};
/** Footer optimised for print media — minimal decoration. */
export const PrintMedia: Story = {
  parameters: {
    backgrounds: {default: "white"},
  },
  decorators: [
    (Story) => (
      <ThemeProvider
        attribute='class'
        defaultTheme='light'
        enableSystem={false}>
        <div>
          <Story />
        </div>
      </ThemeProvider>
    ),
  ],
};
