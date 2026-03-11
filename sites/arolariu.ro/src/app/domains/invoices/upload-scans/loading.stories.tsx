import type {Meta, StoryObj} from "@storybook/react";
import Loading from "./loading";

/**
 * Loading skeleton for the upload-scans page, showing header and
 * upload area placeholders.
 */
const meta = {
  title: "Invoices/UploadScans/Loading",
  component: Loading,
  parameters: {
    layout: "fullscreen",
  },
} satisfies Meta<typeof Loading>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Default loading skeleton for the upload scans page. */
export const Default: Story = {};

/** Upload scans loading skeleton in dark mode. */
export const DarkMode: Story = {
  parameters: {
    themes: {themeOverride: "dark"},
  },
};
