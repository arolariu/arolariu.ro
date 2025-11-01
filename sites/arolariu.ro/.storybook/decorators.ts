import type {Decorator} from "@storybook/react";
import {InvoiceCreatorProvider} from "../src/app/domains/invoices/create-invoice/_context/InvoiceCreatorContext";

/**
 * Decorator that wraps stories with the InvoiceCreatorProvider context.
 * This is useful for stories that need access to invoice scan state and actions.
 * 
 * @example
 * ```tsx
 * import {withInvoiceCreatorProvider} from "@/.storybook/decorators";
 * 
 * const meta: Meta<typeof MyComponent> = {
 *   title: "Invoices/MyComponent",
 *   component: MyComponent,
 *   decorators: [withInvoiceCreatorProvider],
 * };
 * ```
 */
export const withInvoiceCreatorProvider: Decorator = (Story) => {
  return (
    <InvoiceCreatorProvider>
      <Story />
    </InvoiceCreatorProvider>
  );
};

/**
 * Decorator that wraps stories with a container div for consistent layout.
 * Useful for invoice-related components that need padding and max-width.
 * 
 * @example
 * ```tsx
 * import {withInvoiceContainer} from "@/.storybook/decorators";
 * 
 * const meta: Meta<typeof MyComponent> = {
 *   title: "Invoices/MyComponent",
 *   component: MyComponent,
 *   decorators: [withInvoiceCreatorProvider, withInvoiceContainer],
 * };
 * ```
 */
export const withInvoiceContainer: Decorator = (Story) => {
  return (
    <div className="max-w-7xl mx-auto p-4">
      <Story />
    </div>
  );
};

/**
 * Combined decorator that includes both InvoiceCreatorProvider and container layout.
 * This is the recommended decorator for most invoice display components.
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
