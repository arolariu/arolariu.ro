import type {Meta, StoryObj} from "@storybook/react";
import Eula from "./EULA";

/**
 * `Eula` renders the End User License Agreement consent card with locale
 * selection, Terms of Service / Privacy Policy dialogs, and a cookie
 * preferences accordion.
 *
 * @remarks
 * On mount it reads the `eula-accepted` cookie via the `getCookie` Server
 * Action (`@/lib/actions/cookies`) and briefly renders `EulaShimmer` while
 * that resolves — exactly as it does in production. This story exercises
 * that real flow against Storybook's Next.js framework boundary
 * (`@storybook/nextjs-vite`'s `next/headers` shim resolves `cookies()` to an
 * empty, in-memory jar), so no cookie is present and the full consent card
 * renders once resolution completes. No repository action is mocked here.
 */
const meta = {
  title: "Pages/Home/EULA",
  component: Eula,
  parameters: {
    layout: "fullscreen",
  },
} satisfies Meta<typeof Eula>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Default EULA consent card, English locale pre-selected. */
export const English: Story = {
  args: {
    locale: "en",
  },
};

/** EULA consent card with the Romanian locale pre-selected. */
export const Romanian: Story = {
  args: {
    locale: "ro",
  },
};
