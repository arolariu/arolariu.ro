import type {Meta, StoryObj} from "@storybook/react";
import {getDefaultSettings} from "../_utils/helpers";
import {SettingsSecurity} from "./SettingsSecurity";

const defaults = getDefaultSettings();
const noop = (next: unknown): void => void next;

/**
 * SettingsSecurity is a controlled panel for security preferences (2FA, session
 * timeout, trusted devices). Mounts the real component with a `settings` object
 * and `onSettingsChange` callback.
 */
const meta = {
  title: "arolariu.ro/Pages/Profile/SettingsSecurity",
  component: SettingsSecurity,
  parameters: {layout: "fullscreen"},
  args: {settings: defaults.security, onSettingsChange: noop},
} satisfies Meta<typeof SettingsSecurity>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Default security settings — 2FA off, no trusted devices. */
export const Default: Story = {};

/** Hardened — 2FA on, short timeout, with trusted devices listed. */
export const Hardened: Story = {
  args: {
    settings: {
      ...defaults.security,
      twoFactorEnabled: true,
      sessionTimeout: 15,
      trustedDevices: [
        {id: "dev-1", name: 'MacBook Pro 16"', lastUsed: "2024-03-15T10:00:00.000Z", isCurrent: true},
        {id: "dev-2", name: "iPhone 15 Pro", lastUsed: "2024-03-14T18:30:00.000Z", isCurrent: false},
      ],
    },
  },
};
