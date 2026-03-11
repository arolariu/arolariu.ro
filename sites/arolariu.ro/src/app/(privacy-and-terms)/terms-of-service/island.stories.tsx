import type {Meta, StoryObj} from "@storybook/react";
import {NextIntlClientProvider} from "next-intl";
import messages from "../../../../messages/en.json";
import RenderTermsOfServiceScreen from "./island";

/**
 * Client island for the Terms of Service page.
 * Delegates rendering to `EnhancedLegalArticles` configured with
 * `pageType="Legal.TermsOfService"`. Renders 23 legal article sections
 * covering license, restrictions, cookies, liability, and arbitration.
 */
const meta = {
  title: "Pages/Legal/TermsOfService",
  component: RenderTermsOfServiceScreen,
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
} satisfies Meta<typeof RenderTermsOfServiceScreen>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Full terms of service content. */
export const Default: Story = {};
