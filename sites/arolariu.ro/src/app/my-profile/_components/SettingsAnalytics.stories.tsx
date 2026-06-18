import type {Meta, StoryObj} from "@storybook/react";
import {getDefaultSettings} from "../_utils/helpers";
import {SettingsAnalytics} from "./SettingsAnalytics";

const defaults = getDefaultSettings();
const noop = (next: unknown): void => void next;

/**
 * SettingsAnalytics is a controlled panel for analytics preferences. Mounts the
 * real component with a `settings` object and `onSettingsChange` callback.
 */
const meta = {
  title: "arolariu.ro/Pages/Profile/SettingsAnalytics",
  component: SettingsAnalytics,
  parameters: {layout: "fullscreen"},
  args: {settings: defaults.analytics, onSettingsChange: noop},
} satisfies Meta<typeof SettingsAnalytics>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Default analytics settings. */
export const Default: Story = {};

/** Analytics disabled — dependent toggles read as off. */
export const Disabled: Story = {
  args: {settings: {...defaults.analytics, enabled: false}},
};

/** Everything tracked, predictive analysis on, exporting to Excel. */
export const FullTracking: Story = {
  args: {
    settings: {
      ...defaults.analytics,
      benchmarking: true,
      predictiveAnalysis: true,
      exportFormat: "excel",
    },
  },
};
