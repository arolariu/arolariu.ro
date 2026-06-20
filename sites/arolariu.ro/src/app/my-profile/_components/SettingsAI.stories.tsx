import type {Meta, StoryObj} from "@storybook/react";
import {getDefaultSettings} from "../_utils/helpers";
import {SettingsAI} from "./SettingsAI";

const defaults = getDefaultSettings();
const noop = (next: unknown): void => void next;

/**
 * SettingsAI is a controlled panel for AI assistant preferences. It takes a
 * `settings` object and an `onSettingsChange` callback. Mounts the real component.
 */
const meta = {
  title: "arolariu.ro/Pages/Profile/SettingsAI",
  component: SettingsAI,
  parameters: {layout: "fullscreen"},
  args: {settings: defaults.ai, onSettingsChange: noop},
} satisfies Meta<typeof SettingsAI>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Default AI settings. */
export const Default: Story = {};

/** All AI features enabled with a higher temperature/token budget. */
export const AllFeaturesEnabled: Story = {
  args: {
    settings: {
      ...defaults.ai,
      temperature: 1,
      maxTokens: 4096,
      autoSuggestEnabled: true,
      contextAwareness: true,
      memoryEnabled: true,
      voiceEnabled: true,
    },
  },
};
