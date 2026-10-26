import type {Meta, StoryObj} from "@storybook/react";
import {useCallback, useState} from "react";
import {fn} from "storybook/test";
import {getDefaultSettings} from "../_utils/helpers";
import type {AnalyticsSettings} from "../_utils/types";
import {SettingsAnalytics} from "./SettingsAnalytics";

/**
 * The Analytics settings panel lets the user enable/disable tracking,
 * choose a data granularity and export format, toggle individual tracking
 * categories, and opt into advanced (benchmarking / predictive) analytics.
 * It is a fully controlled component driven by `settings` + `onSettingsChange`.
 */
const meta = {
  title: "Pages/Profile/SettingsAnalytics",
  component: SettingsAnalytics,
  args: {
    settings: getDefaultSettings().analytics,
    onSettingsChange: fn(),
  },
  parameters: {
    layout: "fullscreen",
  },
} satisfies Meta<typeof SettingsAnalytics>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Interactive wrapper that keeps `AnalyticsSettings` in local state so every toggle/select reflects real changes. */
function SettingsAnalyticsDemo({initialSettings}: Readonly<{initialSettings: AnalyticsSettings}>): React.JSX.Element {
  const [settings, setSettings] = useState<AnalyticsSettings>(initialSettings);

  const handleSettingsChange = useCallback((partial: Partial<AnalyticsSettings>) => {
    setSettings((previous) => ({...previous, ...partial}));
  }, []);

  return (
    <SettingsAnalytics
      settings={settings}
      onSettingsChange={handleSettingsChange}
    />
  );
}

/** Default analytics settings — tracking enabled with daily granularity. */
export const Default: Story = {
  render: (args) => <SettingsAnalyticsDemo initialSettings={args.settings} />,
};

/** Analytics tracking disabled — all dependent controls become inert. */
export const Disabled: Story = {
  args: {
    settings: {
      enabled: false,
      granularity: "monthly",
      trackSpending: false,
      trackCategories: false,
      trackMerchants: false,
      benchmarking: false,
      predictiveAnalysis: false,
      exportFormat: "csv",
    },
  },
  render: (args) => <SettingsAnalyticsDemo initialSettings={args.settings} />,
};
