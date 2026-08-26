import type {Meta, StoryObj} from "@storybook/react";
import {useCallback, useState} from "react";
import {fn} from "storybook/test";
import {getDefaultSettings} from "../_utils/helpers";
import type {DataSettings} from "../_utils/types";
import {SettingsData} from "./SettingsData";

/**
 * The Data Management settings panel lets the user configure retention
 * period, automatic backups + frequency, anonymous-data sharing, data
 * export, and destructive account/data actions. It is a fully controlled
 * component driven by `settings` + `onSettingsChange`.
 */
const meta = {
  title: "Pages/Profile/SettingsData",
  component: SettingsData,
  args: {
    settings: getDefaultSettings().data,
    onSettingsChange: fn(),
  },
  parameters: {
    layout: "fullscreen",
  },
} satisfies Meta<typeof SettingsData>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Interactive wrapper that keeps `DataSettings` in local state so every toggle/select reflects real changes. */
function SettingsDataDemo({initialSettings}: Readonly<{initialSettings: DataSettings}>): React.JSX.Element {
  const [settings, setSettings] = useState<DataSettings>(initialSettings);

  const handleSettingsChange = useCallback((partial: Partial<DataSettings>) => {
    setSettings((previous) => ({...previous, ...partial}));
  }, []);

  return (
    <SettingsData
      settings={settings}
      onSettingsChange={handleSettingsChange}
    />
  );
}

/** Default data settings — 1-year retention with weekly auto-backup. */
export const Default: Story = {
  render: (args) => <SettingsDataDemo initialSettings={args.settings} />,
};

/** Auto backup disabled and anonymous data sharing enabled. */
export const AutoBackupDisabled: Story = {
  args: {
    settings: {
      retention: "90d",
      autoBackup: false,
      backupFrequency: "never",
      shareAnonymousData: true,
    },
  },
  render: (args) => <SettingsDataDemo initialSettings={args.settings} />,
};
