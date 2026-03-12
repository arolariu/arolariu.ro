import type {Meta, StoryObj} from "@storybook/react";
import RenderForbiddenScreen from "./ForbiddenScreen";

/**
 * The ForbiddenScreen presents a localized HTTP 403 "Forbidden" state.
 *
 * It shows a decorative illustration, a heading, descriptive text, and a
 * call-to-action link pointing users toward authentication. All user-facing
 * strings come from the `Common.states.forbidden` i18n namespace.
 */
const meta = {
  title: "Site/ForbiddenScreen",
  component: RenderForbiddenScreen,
  parameters: {
    layout: "fullscreen",
  },
} satisfies Meta<typeof RenderForbiddenScreen>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Default 403 forbidden screen with English locale. */
export const Default: Story = {};
