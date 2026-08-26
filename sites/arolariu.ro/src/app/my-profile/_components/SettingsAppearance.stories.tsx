import type {Meta, StoryObj} from "@storybook/react";
import {ThemeProvider} from "next-themes";
import {useCallback, useState} from "react";
import {fn} from "storybook/test";
import {FontContextProvider} from "@/contexts/FontContext";
import {getDefaultSettings} from "../_utils/helpers";
import type {AppearanceSettings} from "../_utils/types";
import {SettingsAppearance} from "./SettingsAppearance";

/**
 * The Appearance settings panel lets the user pick a theme, font, curated
 * theme preset, locale, and compact/animation preferences. It is a fully
 * controlled component driven by `settings` + `onSettingsChange`, and also
 * synchronizes `next-themes`, `FontContext`, and the `usePreferencesStore`
 * Zustand store — persisting color changes via the `setCookie` Server Action
 * (`@/lib/actions/cookies`).
 *
 * @remarks
 * This story exercises the real component against Storybook's Next.js
 * framework boundary (`@storybook/nextjs-vite`'s `next/headers` shim), so
 * `setCookie` resolves against an in-memory cookie jar instead of a live
 * request — no repository action is mocked. Color-picker interactions are
 * left to manual exploration in Canvas since they persist through that
 * cookie jar.
 */
const meta = {
  title: "Pages/Profile/SettingsAppearance",
  component: SettingsAppearance,
  args: {
    settings: getDefaultSettings().appearance,
    onSettingsChange: fn(),
  },
  decorators: [
    (Story) => (
      <ThemeProvider
        attribute='class'
        defaultTheme='system'
        enableSystem>
        <FontContextProvider>
          <Story />
        </FontContextProvider>
      </ThemeProvider>
    ),
  ],
  parameters: {
    layout: "fullscreen",
  },
} satisfies Meta<typeof SettingsAppearance>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Interactive wrapper that keeps `AppearanceSettings` in local state so select/switch controls reflect real changes. */
function SettingsAppearanceDemo({initialSettings}: Readonly<{initialSettings: AppearanceSettings}>): React.JSX.Element {
  const [settings, setSettings] = useState<AppearanceSettings>(initialSettings);

  const handleSettingsChange = useCallback((partial: Partial<AppearanceSettings>) => {
    setSettings((previous) => ({...previous, ...partial}));
  }, []);

  return (
    <SettingsAppearance
      settings={settings}
      onSettingsChange={handleSettingsChange}
    />
  );
}

/** Default appearance settings — system theme, normal font, English locale. */
export const Default: Story = {
  render: (args) => <SettingsAppearanceDemo initialSettings={args.settings} />,
};

/** Dark theme with the dyslexic-friendly font and compact mode enabled. */
export const DarkCompact: Story = {
  args: {
    settings: {
      theme: "dark",
      primaryColor: "#3b82f6",
      secondaryColor: "#8b5cf6",
      tertiaryColor: "#1e3a8a",
      fontType: "dyslexic",
      locale: "en",
      compactMode: true,
      animationsEnabled: false,
    },
  },
  render: (args) => <SettingsAppearanceDemo initialSettings={args.settings} />,
};
