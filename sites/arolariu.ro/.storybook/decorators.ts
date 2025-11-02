import type {Decorator} from "@storybook/react";
import {NextIntlClientProvider} from "next-intl";
import {ThemeProvider} from "next-themes";
import {InvoiceCreatorProvider} from "../src/app/domains/invoices/create-invoice/_context/InvoiceCreatorContext";

/**
 * Combined decorator that includes both InvoiceCreatorProvider and container layout.
 * This is the recommended decorator for most invoice display components.
 * 
 * Includes:
 * - InvoiceCreatorProvider for invoice scan state and actions
 * - Container div with max-width and padding for consistent layout
 * 
 * @example
 * ```tsx
 * import {withInvoiceCreatorContext} from "@/.storybook/decorators";
 * 
 * const meta: Meta<typeof MyComponent> = {
 *   title: "Invoices/MyComponent",
 *   component: MyComponent,
 *   decorators: [withInvoiceCreatorContext],
 * };
 * ```
 */
export const withInvoiceCreatorContext: Decorator = (Story) => {
  return (
    <InvoiceCreatorProvider>
      <div className="max-w-7xl mx-auto p-4">
        <Story />
      </div>
    </InvoiceCreatorProvider>
  );
};

/**
 * Decorator that provides next-intl internationalization support for stories.
 * Wraps stories with NextIntlClientProvider and mock translations.
 * 
 * Features:
 * - Supports 'en' and 'ro' locales
 * - Provides mock translation messages for common keys
 * - Enables testing of i18n features in components
 * 
 * @example
 * ```tsx
 * import {withNextIntl} from "@/.storybook/decorators";
 * 
 * const meta: Meta<typeof MyComponent> = {
 *   title: "Components/MyComponent",
 *   component: MyComponent,
 *   decorators: [withNextIntl],
 * };
 * ```
 */
export const withNextIntl: Decorator = (Story, context) => {
  const locale = context.globals.locale || "en";
  
  // Mock translations for common keys
  const messages = {
    common: {
      loading: "Loading...",
      error: "Error",
      success: "Success",
      cancel: "Cancel",
      save: "Save",
      delete: "Delete",
      edit: "Edit",
      close: "Close",
    },
    invoices: {
      title: "Invoices",
      uploadTitle: "Upload Invoice Scans",
      uploadDescription: "Drag and drop your files here, or click to browse",
      processing: "Processing...",
      noScans: "No scans uploaded yet",
      scanCount: "{count} scan(s) uploaded",
    },
  };

  return (
    <NextIntlClientProvider locale={locale} messages={messages} timeZone="UTC">
      <Story />
    </NextIntlClientProvider>
  );
};

/**
 * Decorator that provides next-themes dark/light mode support for stories.
 * Wraps stories with ThemeProvider for theme switching functionality.
 * 
 * Features:
 * - Supports dark and light themes
 * - Enables theme switching via Storybook toolbar
 * - Provides system theme detection
 * 
 * @example
 * ```tsx
 * import {withTheme} from "@/.storybook/decorators";
 * 
 * const meta: Meta<typeof MyComponent> = {
 *   title: "Components/MyComponent",
 *   component: MyComponent,
 *   decorators: [withTheme],
 * };
 * ```
 */
export const withTheme: Decorator = (Story) => {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <Story />
    </ThemeProvider>
  );
};
