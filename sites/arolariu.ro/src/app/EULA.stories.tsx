import type {Meta, StoryObj} from "@storybook/react";
import Eula from "./EULA";

/**
 * EULA component renders the End User License Agreement consent card.
 * Accepts a `{locale: Locale}` prop. Uses `useTranslations`, `usePreferencesStore`,
 * and server actions (`getCookie`/`setCookie`) which may throw in Storybook,
 * but the component handles errors gracefully.
 */
const meta = {
  title: "App/EULA",
  component: Eula,
  parameters: {
    layout: "centered",
  },
  decorators: [
    (Story) => (
      <div className='max-w-xl p-4'>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof Eula>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Default EULA consent card with English locale. */
export const Default: Story = {
  args: {
    locale: "en",
  },
};

/** Dark mode variant. */
export const DarkMode: Story = {
  args: {
    locale: "en",
  },
  parameters: {
    themes: {themeOverride: "dark"},
  },
};
