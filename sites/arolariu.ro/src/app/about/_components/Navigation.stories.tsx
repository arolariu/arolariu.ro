import type {Meta, StoryObj} from "@storybook/react";
import {NextIntlClientProvider} from "next-intl";
import messages from "../../../../messages/en.json";
import Navigation from "./Navigation";

/**
 * Navigation section with preview cards linking to the Platform and Author
 * sub-pages. Each card shows an image, title, feature list with check badges,
 * and a CTA button. Uses the `About.Hub.navigation` i18n namespace.
 */
const meta = {
  title: "Pages/About/Navigation",
  component: Navigation,
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
} satisfies Meta<typeof Navigation>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Default navigation cards for Platform and Author sub-pages. */
export const Default: Story = {};
