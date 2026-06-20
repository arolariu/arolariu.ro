import type {Meta, StoryObj} from "@storybook/react";
import {getDefaultSettings} from "../_utils/helpers";
import {SettingsData} from "./SettingsData";

const defaults = getDefaultSettings();
const noop = (next: unknown): void => void next;

/**
 * SettingsData is a controlled panel for data retention/backup preferences.
 * Mounts the real component with a `settings` object and `onSettingsChange` callback.
 */
const meta = {
  title: "arolariu.ro/Pages/Profile/SettingsData",
  component: SettingsData,
  parameters: {layout: "fullscreen"},
  args: {settings: defaults.data, onSettingsChange: noop},
} satisfies Meta<typeof SettingsData>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Default data settings. */
export const Default: Story = {};

/** Auto-backup off and anonymous data sharing on. */
export const NoBackupShareData: Story = {
  args: {settings: {...defaults.data, autoBackup: false, shareAnonymousData: true}},
};
