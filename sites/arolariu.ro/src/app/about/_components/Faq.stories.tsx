import type {Meta, StoryObj} from "@storybook/react";
import Faq from "./Faq";

/**
 * FAQ section with accordion-style questions and answers.
 * Displays four common questions in an expandable accordion with
 * animated entrance effects. Uses the `About.Hub.faq` i18n namespace.
 */
const meta = {
  title: "Pages/About/Faq",
  component: Faq,
  parameters: {
    layout: "fullscreen",
  },
} satisfies Meta<typeof Faq>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Default FAQ section with four collapsible questions. */
export const Default: Story = {};
