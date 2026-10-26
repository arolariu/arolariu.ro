import type {Meta, StoryObj} from "@storybook/react";
import {ClerkProvider} from "@clerk/nextjs";
import {ThemeProvider} from "next-themes";
import {fn} from "storybook/test";
import {GlobalErrorContent} from "./_components/GlobalErrorContent";

/**
 * `GlobalErrorContent` renders the real error hero, details card, diagnostics
 * QR code, and recovery actions used by the `GlobalError` boundary — minus the
 * `<html>`/`<body>` document shell Next.js requires from the default export
 * (which cannot be mounted inside Storybook's Canvas root). It nests the real
 * `Header` (Clerk + theme aware) and `Footer`, so this story provides the same
 * `ClerkProvider` + `next-themes` context the app provides via `ContextProviders`.
 */
const meta = {
  title: "Pages/Home/GlobalError",
  component: GlobalErrorContent,
  args: {
    error: Object.assign(new Error("Cannot read properties of undefined (reading 'map')"), {digest: "ERR_A1B2C3D4"}),
    reset: fn(),
  },
  decorators: [
    (Story) => (
      <ClerkProvider>
        <ThemeProvider
          attribute='class'
          defaultTheme='light'
          enableSystem={false}>
          <Story />
        </ThemeProvider>
      </ClerkProvider>
    ),
  ],
  parameters: {
    layout: "fullscreen",
  },
} satisfies Meta<typeof GlobalErrorContent>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Default global error content with a digest identifier and a captured stack trace. */
export const Default: Story = {};

/** Error content when no Next.js digest was assigned — the copy-error-id action is hidden. */
export const WithoutDigest: Story = {
  args: {
    error: new Error("Unexpected client-side exception."),
  },
};
