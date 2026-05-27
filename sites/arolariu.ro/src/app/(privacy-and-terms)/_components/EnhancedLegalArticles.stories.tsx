import type {Meta, StoryObj} from "@storybook/react";
import EnhancedLegalArticles from "./EnhancedLegalArticles";

/**
 * EnhancedLegalArticles renders a list of legal articles for a given
 * page type. It uses the RichText component internally to render
 * internationalised titles and content for each article section.
 *
 * Supports two page types: `sections.legal.privacyPolicy` and `sections.legal.termsOfService`.
 */
const meta = {
  title: "Pages/Legal/EnhancedLegalArticles",
  component: EnhancedLegalArticles,
  parameters: {
    layout: "padded",
  },
} satisfies Meta<typeof EnhancedLegalArticles>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Privacy Policy articles — 19 sections covering data handling. */
export const PrivacyPolicy: Story = {
  args: {
    pageType: "sections.legal.privacyPolicy",
  },
};

/** Terms of Service articles — 23 sections covering usage terms. */
export const TermsOfService: Story = {
  args: {
    pageType: "sections.legal.termsOfService",
  },
};

/** Privacy Policy — dark mode. */
export const PrivacyPolicyDark: Story = {
  args: {
    pageType: "sections.legal.privacyPolicy",
  },
  parameters: {
    themes: {themeOverride: "dark"},
  },
};

/** Terms of Service — dark mode. */
export const TermsOfServiceDark: Story = {
  args: {
    pageType: "sections.legal.termsOfService",
  },
  parameters: {
    themes: {themeOverride: "dark"},
  },
};
