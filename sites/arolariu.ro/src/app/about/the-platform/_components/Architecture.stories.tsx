import type {Meta, StoryObj} from "@storybook/react";
import {NextIntlClientProvider} from "next-intl";
import messages from "../../../../../messages/en.json";
import Architecture from "./Architecture";

/**
 * Architecture section displaying the platform's technical architecture.
 * Features an interactive layered diagram with eight architecture layers
 * (Client, CDN, API, Services, Auth, Data, AI, Infra), each showing
 * technologies as badges.
 * Uses the `About.Platform.architecture` i18n namespace.
 */
const meta = {
  title: "Pages/About/ThePlatform/Architecture",
  component: Architecture,
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
} satisfies Meta<typeof Architecture>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Default architecture diagram with eight interactive layer cards. */
export const Default: Story = {};

/** Architecture diagram on a mobile viewport. */
export const MobileViewport: Story = {
  parameters: {
    viewport: {defaultViewport: "mobile1"},
  },
};
