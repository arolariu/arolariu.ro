import type {Meta, StoryObj} from "@storybook/react";
import HeroSection from "./Hero";

/**
 * The Hero section is the primary landing area of the homepage.
 *
 * It renders an animated title, a rich-text subtitle, a call-to-action
 * button linking to `/domains`, and a decorative 3D TechSphere (Three.js).
 * All text is internationalised via the `Home` i18n namespace.
 */
const meta = {
  title: "Pages/Home/Hero",
  component: HeroSection,
  parameters: {
    layout: "fullscreen",
  },
} satisfies Meta<typeof HeroSection>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Default hero section with title, subtitle, CTA, and 3D sphere. */
export const Default: Story = {};
