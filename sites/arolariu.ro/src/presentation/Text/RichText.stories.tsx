import type {Meta, StoryObj} from "@storybook/react";
import type {AbstractIntlMessages} from "next-intl";
import {NextIntlClientProvider} from "next-intl";
import {RichText} from "./RichText";

/**
 * RichText renders internationalised text with inline formatting support.
 *
 * It wraps `next-intl`'s `t.rich()` API and maps common HTML tags
 * (`<strong>`, `<em>`, `<br>`, `<code>`, `<ul>`, `<li>`, `<span>`) to
 * React elements. The `sectionKey` selects the i18n namespace and
 * `textKey` identifies the message within it.
 */

/** Inline i18n messages used exclusively by these stories. */
const storyMessages: AbstractIntlMessages = {
  StoryDemo: {
    boldText: "This text has <strong>bold formatting</strong> applied.",
    italicText: "This text has <em>italic formatting</em> applied.",
    codeText: "Use the <code>console.log()</code> function to debug.",
    listText: "Key features: <ul><li>Server Components</li><li>TypeScript strict mode</li><li>Tailwind CSS</li></ul>",
    combinedText:
      "The platform uses <strong>Next.js</strong> with <em>React Server Components</em>. <br></br> Run <code>npm run dev</code> to start. <ul><li>Fast builds</li><li>Type safety</li></ul>",
  },
};

const meta = {
  title: "Presentation/Text/RichText",
  component: RichText,
  decorators: [
    (Story) => (
      <NextIntlClientProvider
        locale='en'
        messages={storyMessages}
        timeZone='Europe/Bucharest'>
        <div className='mx-auto max-w-2xl p-8'>
          <Story />
        </div>
      </NextIntlClientProvider>
    ),
  ],
  parameters: {
    layout: "centered",
  },
} satisfies Meta<typeof RichText>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Text with `<strong>` bold formatting. */
export const Bold: Story = {
  args: {
    sectionKey: "StoryDemo",
    textKey: "boldText",
  },
};

/** Text with `<em>` italic formatting. */
export const Italic: Story = {
  args: {
    sectionKey: "StoryDemo",
    textKey: "italicText",
  },
};

/** Text with inline `<code>` formatting. */
export const Code: Story = {
  args: {
    sectionKey: "StoryDemo",
    textKey: "codeText",
  },
};

/** Text with a `<ul>/<li>` list. */
export const List: Story = {
  args: {
    sectionKey: "StoryDemo",
    textKey: "listText",
  },
};

/** Combines bold, italic, code, line-break, and list formatting. */
export const Combined: Story = {
  args: {
    sectionKey: "StoryDemo",
    textKey: "combinedText",
  },
};

/** Applies a custom CSS class via the `className` prop. */
export const WithCustomClass: Story = {
  args: {
    sectionKey: "StoryDemo",
    textKey: "boldText",
    className: "text-lg text-blue-600 dark:text-blue-400",
  },
};
