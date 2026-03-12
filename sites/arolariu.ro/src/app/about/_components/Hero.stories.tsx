import type {Meta, StoryObj} from "@storybook/react";
import Hero from "./Hero";

/**
 * Hero section for the About hub page.
 * Features animated background orbs, a gradient-text title, subtitle,
 * and CTA buttons linking to the platform and author sub-pages.
 * All text is internationalised via the `About.Hub.hero` i18n namespace.
 */
const meta = {
  title: "Pages/About/Hero",
  component: Hero,
  parameters: {
    layout: "fullscreen",
  },
} satisfies Meta<typeof Hero>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Default hero section with animated background and CTA buttons. */
export const Default: Story = {};
