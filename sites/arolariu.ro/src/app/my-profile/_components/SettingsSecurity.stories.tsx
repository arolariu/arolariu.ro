import type {Meta, StoryObj} from "@storybook/react";
import {useCallback, useState} from "react";
import {fn} from "storybook/test";
import type {SecuritySettings} from "../_utils/types";
import {SettingsSecurity} from "./SettingsSecurity";

/**
 * The Security settings panel lets the user toggle two-factor authentication,
 * configure session timeout and login notifications, jump to Clerk's password
 * management, and review/revoke trusted devices. It is a fully controlled
 * component driven by `settings` + `onSettingsChange`.
 */
const meta = {
  title: "Pages/Profile/SettingsSecurity",
  component: SettingsSecurity,
  args: {
    settings: {
      twoFactorEnabled: true,
      sessionTimeout: 30,
      loginNotifications: true,
      trustedDevices: [
        {id: "device-1", name: "Chrome on Windows", lastUsed: "2026-01-15T09:00:00.000Z", isCurrent: true},
        {id: "device-2", name: "Firefox on macOS", lastUsed: "2026-01-10T18:30:00.000Z", isCurrent: false},
      ],
    },
    onSettingsChange: fn(),
  },
  parameters: {
    layout: "fullscreen",
  },
} satisfies Meta<typeof SettingsSecurity>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Interactive wrapper that keeps `SecuritySettings` in local state so every toggle/select/removal reflects real changes. */
function SettingsSecurityDemo({initialSettings}: Readonly<{initialSettings: SecuritySettings}>): React.JSX.Element {
  const [settings, setSettings] = useState<SecuritySettings>(initialSettings);

  const handleSettingsChange = useCallback((partial: Partial<SecuritySettings>) => {
    setSettings((previous) => ({...previous, ...partial}));
  }, []);

  return (
    <SettingsSecurity
      settings={settings}
      onSettingsChange={handleSettingsChange}
    />
  );
}

/** Default security settings — 2FA enabled with two trusted devices. */
export const Default: Story = {
  render: (args) => <SettingsSecurityDemo initialSettings={args.settings} />,
};

/** No two-factor authentication and no trusted devices yet — empty state. */
export const NoTrustedDevices: Story = {
  args: {
    settings: {
      twoFactorEnabled: false,
      sessionTimeout: 15,
      loginNotifications: false,
      trustedDevices: [],
    },
  },
  render: (args) => <SettingsSecurityDemo initialSettings={args.settings} />,
};
