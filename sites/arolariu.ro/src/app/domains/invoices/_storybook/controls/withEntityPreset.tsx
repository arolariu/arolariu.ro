import type {Decorator} from "@storybook/react";
import {useArgs} from "storybook/preview-api";

const lastPresetById = new Map<string, string>();

/**
 * Keeps an `object` control (objectKey) in sync with a `preset` select (presetKey):
 * when the preset changes, the object arg is replaced with the matching fixture,
 * so users can switch presets and then fine-tune the resulting object.
 *
 * @param presetKey - The arg name of the preset select.
 * @param objectKey - The arg name of the entity object control.
 * @param presets - Map of preset name to fixture object.
 * @returns A Storybook decorator.
 */
export function withEntityPreset(
  presetKey: string,
  objectKey: string,
  presets: Readonly<Record<string, unknown>>,
): Decorator {
  return function PresetSync(Story, context) {
    const [, updateArgs] = useArgs();
    const preset = context.args[presetKey] as string | undefined;

    if (typeof preset === "string" && lastPresetById.get(context.id) !== preset) {
      lastPresetById.set(context.id, preset);
      const next = presets[preset];
      if (next !== undefined && context.args[objectKey] !== next) {
        updateArgs({[objectKey]: next});
      }
    }

    return <Story />;
  };
}
