import type {Meta, StoryObj} from "@storybook/react";
import RenderPrivacyPolicyScreen from "./island";

/**
 * Client island for the Privacy Policy page.
 * Delegates rendering to `EnhancedLegalArticles` configured with
 * `pageType="sections.legal.privacyPolicy"`. Renders 19 legal article sections
 * covering data collection, processing, cookies, children's privacy,
 * and user rights.
 */
const meta = {
  title: "arolariu.ro/Pages/Legal/PrivacyPolicy",
  component: RenderPrivacyPolicyScreen,
  parameters: {
    layout: "padded",
  },
} satisfies Meta<typeof RenderPrivacyPolicyScreen>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Full privacy policy content. */
export const Default: Story = {};
