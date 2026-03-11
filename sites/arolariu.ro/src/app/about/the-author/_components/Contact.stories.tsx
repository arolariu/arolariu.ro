import type {Meta, StoryObj} from "@storybook/react";
import Contact from "./Contact";

/**
 * Contact section displaying the author's contact information and
 * collaboration interests. Features two cards: one with social links
 * (email, LinkedIn, GitHub, website) with copy/open actions, and another
 * with collaboration discipline cards.
 * Uses the `About.Author.Contact` i18n namespace.
 */
const meta = {
  title: "Pages/About/TheAuthor/Contact",
  component: Contact,
  parameters: {
    layout: "fullscreen",
  },
} satisfies Meta<typeof Contact>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Default contact section with social links and collaboration cards. */
export const Default: Story = {};

/** Dark mode variant. */
export const DarkMode: Story = {
  parameters: {
    themes: {themeOverride: "dark"},
  },
};

/** Mobile viewport variant. */
export const MobileViewport: Story = {
  parameters: {
    viewport: {defaultViewport: "mobile1"},
  },
};
