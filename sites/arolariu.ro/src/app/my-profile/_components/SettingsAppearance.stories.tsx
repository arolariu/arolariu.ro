import {resetPreferencesStore, seedPreferencesStore} from "@/app/domains/invoices/_storybook";
import {FontContextProvider} from "@/contexts/FontContext";
import type {Meta, StoryObj} from "@storybook/react";
import {getDefaultSettings} from "../_utils/helpers";
import {SettingsAppearance} from "./SettingsAppearance";

const defaults = getDefaultSettings();
const noop = (next: unknown): void => void next;

/**
 * SettingsAppearance is a controlled panel for theme/appearance preferences that
 * also reads `usePreferencesStore`, `useTheme`, and `useFontContext`. Mounts the
 * real component with a seeded preferences store and the real FontContextProvider.
 */
const meta = {
  title: "arolariu.ro/Pages/Profile/SettingsAppearance",
  component: SettingsAppearance,
  parameters: {layout: "fullscreen"},
  args: {settings: defaults.appearance, onSettingsChange: noop},
  decorators: [
    (Story) => {
      resetPreferencesStore();
      return (
        <FontContextProvider>
          <Story />
        </FontContextProvider>
      );
    },
  ],
} satisfies Meta<typeof SettingsAppearance>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Default appearance with the default preset. */
export const Default: Story = {};

/** Dark, compact, animations off, with the midnight preset seeded. */
export const DarkCompact: Story = {
  args: {settings: {...defaults.appearance, theme: "dark", compactMode: true, animationsEnabled: false}},
  decorators: [
    (Story) => {
      seedPreferencesStore({theme: "dark", compactMode: true, animationsEnabled: false, themePreset: "midnight"});
      return <Story />;
    },
  ],
};
