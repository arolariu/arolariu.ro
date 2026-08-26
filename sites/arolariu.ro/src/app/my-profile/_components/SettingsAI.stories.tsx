import type {Meta, StoryObj} from "@storybook/react";
import {useCallback, useState} from "react";
import {fn} from "storybook/test";
import {getDefaultSettings} from "../_utils/helpers";
import type {AISettings} from "../_utils/types";
import {SettingsAI} from "./SettingsAI";

/**
 * The AI Assistant settings panel lets the user pick a model, a behavior
 * preset, tune temperature/max-tokens sliders, and toggle AI features
 * (auto-suggest, context awareness, memory, voice input). It is a fully
 * controlled component driven by the `settings` + `onSettingsChange` props.
 */
const meta = {
  title: "Pages/Profile/SettingsAI",
  component: SettingsAI,
  args: {
    settings: getDefaultSettings().ai,
    onSettingsChange: fn(),
  },
  parameters: {
    layout: "fullscreen",
  },
} satisfies Meta<typeof SettingsAI>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Interactive wrapper that keeps `AISettings` in local state so every control (select, slider, switch) reflects real changes. */
function SettingsAIDemo({initialSettings}: Readonly<{initialSettings: AISettings}>): React.JSX.Element {
  const [settings, setSettings] = useState<AISettings>(initialSettings);

  const handleSettingsChange = useCallback((partial: Partial<AISettings>) => {
    setSettings((previous) => ({...previous, ...partial}));
  }, []);

  return (
    <SettingsAI
      settings={settings}
      onSettingsChange={handleSettingsChange}
    />
  );
}

/** Default AI settings — the standard, out-of-the-box configuration. */
export const Default: Story = {
  render: (args) => <SettingsAIDemo initialSettings={args.settings} />,
};

/** Premium model selected with a creative temperature and voice input enabled. */
export const PremiumConfiguration: Story = {
  args: {
    settings: {
      model: "claude-sonnet",
      behaviorPreset: "friendly",
      temperature: 0.9,
      maxTokens: 4096,
      autoSuggestEnabled: true,
      contextAwareness: true,
      memoryEnabled: true,
      voiceEnabled: true,
    },
  },
  render: (args) => <SettingsAIDemo initialSettings={args.settings} />,
};
