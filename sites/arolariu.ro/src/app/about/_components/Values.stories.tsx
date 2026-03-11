import type {Meta, StoryObj} from "@storybook/react";
import {NextIntlClientProvider} from "next-intl";
import messages from "../../../../messages/en.json";
import Values from "./Values";

/**
 * Values section displaying six core values that guide development:
 * Engineering, Learning, Community, Privacy, Performance, and Accessibility.
 * Each value is rendered as an animated card with an icon.
 * Uses the `About.Hub.values` i18n namespace.
 */
const meta = {
  title: "Pages/About/Values",
  component: Values,
  tags: ["autodocs"],
  decorators: [
    (Story) => (
      <NextIntlClientProvider
        locale="en"
        messages={messages}
        timeZone="Europe/Bucharest">
        <Story />
      </NextIntlClientProvider>
    ),
  ],
  parameters: {
    layout: "fullscreen",
  },
} satisfies Meta<typeof Values>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Default values grid with six core value cards. */
export const Default: Story = {};

/** Values grid on a mobile viewport. */
export const MobileViewport: Story = {
  parameters: {
    viewport: {defaultViewport: "mobile1"},
  },
};
