import type {Meta, StoryObj} from "@storybook/react";
import {ClerkProvider} from "@clerk/nextjs";
import {ThemeProvider} from "next-themes";
import {NotFoundContent} from "./_components/GlobalNotFoundContent";

/**
 * `NotFoundContent` renders the real 404 page content — `Header`, hero, QR
 * diagnostics section, and recovery actions, plus `Footer` — without the
 * `<html>`/`<body>` document shell Next.js requires from the default-exported,
 * `async` `NotFound` Server Component (which cannot be mounted inside
 * Storybook's Canvas root, since it resolves `headers()`, `getLocale()`,
 * `getMessages()`, `fetchAaaSUserFromAuthService()`, and `getCookie()`). This
 * story supplies the same already-resolved QR payload and localized copy
 * `NotFound` would normally compute server-side, as plain typed fixture
 * props. It nests the real `Header` (Clerk + theme aware) and `Footer`, so
 * this story provides the same `ClerkProvider` + `next-themes` context the
 * app provides via `ContextProviders`.
 */
const meta = {
  title: "Pages/Home/GlobalNotFound",
  component: NotFoundContent,
  args: {
    qrCodeData: JSON.stringify({userId: "user_storybook_0000", userAgent: "Storybook/Canvas", referrer: "https://arolariu.ro/"}),
    copy: {
      title: "404",
      subtitle: "Page not found",
      additionalInfo: "Additional Information",
      falsePositive: "Think this is an error?",
      submitErrorButton: "Submit Error Report",
      returnButton: "Return to Homepage",
    },
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
} satisfies Meta<typeof NotFoundContent>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Default 404 page content with English copy and a deterministic diagnostics QR payload. */
export const Default: Story = {};

/** 404 page content with Romanian copy, demonstrating the same content with different localized fixture strings. */
export const Romanian: Story = {
  args: {
    copy: {
      title: "404",
      subtitle: "Pagina nu a fost găsită",
      additionalInfo: "Informații suplimentare",
      falsePositive: "Crezi că este o eroare?",
      submitErrorButton: "Trimite un raport de eroare",
      returnButton: "Înapoi la pagina principală",
    },
  },
};
