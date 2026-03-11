import type {Meta, StoryObj} from "@storybook/react";
import {NextIntlClientProvider} from "next-intl";
import messages from "../../../../../messages/en.json";
import TechStack from "./TechStack";

/**
 * TechStack section displaying technologies used in the platform.
 * Features tabbed navigation (Frontend, Backend, Cloud, Tooling) with
 * animated technology cards and merged platform statistics with animated
 * counters. Uses the `About.Platform.techStack` and
 * `About.Platform.statistics` i18n namespaces.
 */
const meta = {
  title: "Pages/About/ThePlatform/TechStack",
  component: TechStack,
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
} satisfies Meta<typeof TechStack>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Default tech stack with tabbed categories and platform statistics. */
export const Default: Story = {};

/** Tech stack in dark mode. */
export const DarkMode: Story = {
  parameters: {
    themes: {themeOverride: "dark"},
  },
};

/** Tech stack on a mobile viewport. */
export const MobileViewport: Story = {
  parameters: {
    viewport: {defaultViewport: "mobile1"},
  },
};
