import type {Meta, StoryObj} from "@storybook/react";
import {useCallback, useState} from "react";
import {fn} from "storybook/test";
import {getDefaultSettings} from "../_utils/helpers";
import type {NotificationSettings} from "../_utils/types";
import {SettingsNotifications} from "./SettingsNotifications";

/**
 * The Notifications settings panel lets the user manage email delivery,
 * report frequency, financial and product-update alerts, and (always-on)
 * security notifications. It is a fully controlled component driven by
 * `settings` + `onSettingsChange`.
 */
const meta = {
  title: "Pages/Profile/SettingsNotifications",
  component: SettingsNotifications,
  args: {
    settings: getDefaultSettings().notifications,
    onSettingsChange: fn(),
  },
  parameters: {
    layout: "fullscreen",
  },
} satisfies Meta<typeof SettingsNotifications>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Interactive wrapper that keeps `NotificationSettings` in local state so every toggle/select reflects real changes. */
function SettingsNotificationsDemo({initialSettings}: Readonly<{initialSettings: NotificationSettings}>): React.JSX.Element {
  const [settings, setSettings] = useState<NotificationSettings>(initialSettings);

  const handleSettingsChange = useCallback((partial: Partial<NotificationSettings>) => {
    setSettings((previous) => ({...previous, ...partial}));
  }, []);

  return (
    <SettingsNotifications
      settings={settings}
      onSettingsChange={handleSettingsChange}
    />
  );
}

/** Default notification settings — email enabled with weekly reports. */
export const Default: Story = {
  render: (args) => <SettingsNotificationsDemo initialSettings={args.settings} />,
};

/** Email notifications disabled — dependent alerts become inert; security alerts stay on. */
export const EmailDisabled: Story = {
  args: {
    settings: {
      emailEnabled: false,
      reportFrequency: "never",
      weeklyDigest: false,
      monthlyReport: false,
      spendingAlerts: false,
      budgetAlerts: false,
      newFeatures: false,
      marketingEmails: false,
      securityAlerts: true,
    },
  },
  render: (args) => <SettingsNotificationsDemo initialSettings={args.settings} />,
};
