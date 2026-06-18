import type {Meta, StoryObj} from "@storybook/react";
import type {Locale} from "next-intl";
import Eula from "./EULA";

/**
 * EULA is the End User License Agreement screen (Terms, Privacy, Cookies). It is a
 * client component that reads/writes consent cookies (mocked in Storybook) and the
 * preferences store. Mounts the real component.
 */
const meta = {
  title: "arolariu.ro/Pages/Home/EULA",
  component: Eula,
  parameters: {layout: "fullscreen"},
  args: {locale: "en" as Locale},
} satisfies Meta<typeof Eula>;

export default meta;
type Story = StoryObj<typeof meta>;

/** EULA in English. */
export const English: Story = {};

/** EULA in Romanian. */
export const Romanian: Story = {args: {locale: "ro" as Locale}};

/** EULA in French. */
export const French: Story = {args: {locale: "fr" as Locale}};
