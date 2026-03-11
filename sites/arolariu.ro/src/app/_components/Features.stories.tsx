import type {Meta, StoryObj} from "@storybook/react";
import {NextIntlClientProvider} from "next-intl";
import messages from "../../../messages/en.json";
import FeaturesSection from "./Features";

/**
 * The Features section showcases the platform's key technology highlights.
 *
 * It renders a typewriter-animated heading, a description, and a grid of
 * six feature cards (Next.js, Azure, C#, Svelte, OpenTelemetry, GitHub
 * Actions) — each with an icon, title, and description. A "learn more"
 * link directs users to `/about`.
 */
const meta = {
  title: "Homepage/Features",
  component: FeaturesSection,
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
} satisfies Meta<typeof FeaturesSection>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Default features grid with six technology cards. */
export const Default: Story = {};
