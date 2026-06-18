import type {Meta, StoryObj} from "@storybook/react";
import {getDefaultSettings} from "../_utils/helpers";
import {SettingsNotifications} from "./SettingsNotifications";

const defaults = getDefaultSettings();
const noop = (next: unknown): void => void next;

/**
 * SettingsNotifications is a controlled panel for notification preferences.
 * Mounts the real component with a `settings` object and `onSettingsChange` callback.
 */
const meta = {
  title: "arolariu.ro/Pages/Profile/SettingsNotifications",
  component: SettingsNotifications,
  parameters: {layout: "fullscreen"},
  args: {settings: defaults.notifications, onSettingsChange: noop},
} satisfies Meta<typeof SettingsNotifications>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Default notification settings. */
export const Default: Story = {};

/** Email notifications disabled — dependent toggles read as off. */
export const EmailDisabled: Story = {
  args: {settings: {...defaults.notifications, emailEnabled: false}},
};

/** Everything enabled including marketing emails and monthly reports. */
export const AllEnabled: Story = {
  args: {
    settings: {
      ...defaults.notifications,
      budgetAlerts: true,
      marketingEmails: true,
      reportFrequency: "monthly",
    },
  },
};
