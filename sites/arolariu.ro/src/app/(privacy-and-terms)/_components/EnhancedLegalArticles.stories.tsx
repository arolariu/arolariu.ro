import type {Meta, StoryObj} from "@storybook/react";
import {NextIntlClientProvider} from "next-intl";
import messages from "../../../../messages/en.json";
import EnhancedLegalArticles from "./EnhancedLegalArticles";

/**
 * EnhancedLegalArticles renders a list of legal articles for a given
 * page type. It uses the RichText component internally to render
 * internationalised titles and content for each article section.
 *
 * Supports two page types: `Legal.PrivacyPolicy` and `Legal.TermsOfService`.
 */
const meta = {
  title: "Pages/Legal/EnhancedLegalArticles",
  component: EnhancedLegalArticles,
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
    layout: "padded",
  },
} satisfies Meta<typeof EnhancedLegalArticles>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Privacy Policy articles — 19 sections covering data handling. */
export const PrivacyPolicy: Story = {
  args: {
    pageType: "Legal.PrivacyPolicy",
  },
};

/** Terms of Service articles — 23 sections covering usage terms. */
export const TermsOfService: Story = {
  args: {
    pageType: "Legal.TermsOfService",
  },
};
