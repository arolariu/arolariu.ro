import type {Decorator} from "@storybook/react";
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
