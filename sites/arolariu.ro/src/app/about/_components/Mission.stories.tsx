import type {Meta, StoryObj} from "@storybook/react";
import {NextIntlClientProvider} from "next-intl";
import messages from "../../../../messages/en.json";
import Mission from "./Mission";

/**
 * Mission section displaying the platform's purpose and core pillars.
 * Renders three pillar cards (Innovation, Quality, Openness) with
 * animated entrance effects. Uses the `About.Hub.mission` i18n namespace.
 */
const meta = {
  title: "Pages/About/Mission",
  component: Mission,
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
} satisfies Meta<typeof Mission>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Default mission section with three core pillars. */
export const Default: Story = {};
