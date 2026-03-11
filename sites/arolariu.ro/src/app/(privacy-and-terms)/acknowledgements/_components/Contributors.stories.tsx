import type {Meta, StoryObj} from "@storybook/react";
import {NextIntlClientProvider} from "next-intl";
import messages from "../../../../../messages/en.json";
import Contributors from "./Contributors";

/**
 * Contributors section showing major package authors/contributors.
 * Each contributor is displayed in a card with avatar initials, name,
 * package count, and description.
 */
const meta = {
  title: "Acknowledgements/Contributors",
  component: Contributors,
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
} satisfies Meta<typeof Contributors>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Default contributors grid with animated entrance. */
export const Default: Story = {};
