import type {Meta, StoryObj} from "@storybook/react";
import {NextIntlClientProvider} from "next-intl";
import messages from "../../../../messages/en.json";
import CallToAction from "./CallToAction";

/**
 * Call-to-action section at the bottom of the About hub page.
 * Features animated background orbs, a gradient title, CTA buttons
 * for GitHub and contact, and a footer message.
 * Uses the `About.Hub.cta` i18n namespace.
 */
const meta = {
  title: "Pages/About/CallToAction",
  component: CallToAction,
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
} satisfies Meta<typeof CallToAction>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Default CTA section with GitHub and contact links. */
export const Default: Story = {};
