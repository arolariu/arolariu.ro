import type {Invoice} from "@/types/invoices";
import type {Meta, StoryObj} from "@storybook/react";
import {invoicePresets, OpenDialogButton, playOpenDialog, storyInvoice, storyProducts, withEntityPreset} from "../../../_storybook";
import AllergenDialog from "./AllergenDialog";

type StoryArgs = {invoice: Invoice; invoicePreset: "standard" | "public"};

/**
 * AllergenDialog allows users to edit allergens on individual products.
 *
 * @remarks
 * This story mounts the real AllergenDialog component with OpenDialogButton
 * harness, opening the dialog automatically on mount with a story invoice and product payload.
 * Shows quick-add buttons for common allergens and custom allergen entry.
 */
const meta = {
  title: "arolariu.ro/IMS/Dialogs/Products/EditAllergens",
  component: AllergenDialog,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "AllergenDialog provides a user-friendly interface for managing allergens on individual invoice products. "
          + "Features include viewing current allergens with remove buttons, quick-add buttons for 14 common EU-regulated allergens "
          + "(Gluten, Lactose, Nuts, etc.), and a custom allergen text input for adding unlisted allergens. "
          + "All changes are validated for duplicates and empty names before being persisted via the updateInvoiceProduct server action.",
      },
    },
  },
  tags: ["autodocs"],
  argTypes: {
    invoicePreset: {control: "select", options: ["standard", "public"]},
    invoice: {control: "object"},
  },
  args: {invoicePreset: "standard", invoice: storyInvoice},
  decorators: [withEntityPreset("invoicePreset", "invoice", invoicePresets)],
} satisfies Meta<StoryArgs>;

export default meta;
type Story = StoryObj<StoryArgs>;

/**
 * Shows allergen dialog with existing allergens on milk product.
 *
 * @remarks
 * Displays current allergens (Lactose), quick-add buttons for common allergens,
 * and custom allergen entry field.
 */
export const ExistingAllergens: Story = {
  play: playOpenDialog,
  parameters: {
    docs: {
      description: {
        story:
          "Demonstrates the allergen dialog opened for a milk product that already has one detected allergen (Lactose). "
          + "Shows how existing allergens are displayed as removable badges, how the Lactose quick-add button is disabled "
          + "(because it's already added), and how users can add additional allergens via quick-add buttons or custom text input.",
      },
    },
  },
  render: ({invoice}) => {
    // Get the milk product which has lactose allergen
    const milkProduct = storyProducts[0];
    if (!milkProduct) {
      throw new Error("Story fixture error: milk product not found");
    }

    return (
      <OpenDialogButton
        dialog='EDIT_INVOICE__ALLERGENS'
        mode='edit'
        payload={{invoice, product: milkProduct, productIndex: 0}}>
        <AllergenDialog />
      </OpenDialogButton>
    );
  },
};

/**
 * Shows allergen dialog for a product with no allergens.
 *
 * @remarks
 * Displays empty allergen state with quick-add buttons and custom entry.
 */
export const NoAllergens: Story = {
  play: playOpenDialog,
  parameters: {
    docs: {
      description: {
        story:
          "Demonstrates the allergen dialog opened for a product (Organic Apples) with no detected allergens. "
          + "Shows the empty state message 'No allergens detected' and how all 14 quick-add buttons are enabled "
          + "for adding allergens. Users can either click quick-add buttons for common allergens or type custom allergen names.",
      },
    },
  },
  render: ({invoice}) => {
    // Get the apples product which has no allergens
    const applesProduct = storyProducts[3];
    if (!applesProduct) {
      throw new Error("Story fixture error: apples product not found");
    }

    return (
      <OpenDialogButton
        dialog='EDIT_INVOICE__ALLERGENS'
        mode='edit'
        payload={{invoice, product: applesProduct, productIndex: 3}}>
        <AllergenDialog />
      </OpenDialogButton>
    );
  },
};

/** Allergen dialog for bread product (gluten allergen). */
export const BreadProduct: Story = {
  play: playOpenDialog,
  render: ({invoice}) => {
    const breadProduct = storyProducts[1];
    if (!breadProduct) {
      throw new Error("Story fixture error: bread product not found");
    }

    return (
      <OpenDialogButton
        dialog='EDIT_INVOICE__ALLERGENS'
        mode='edit'
        payload={{invoice, product: breadProduct, productIndex: 1}}>
        <AllergenDialog />
      </OpenDialogButton>
    );
  },
};

/** Allergen dialog for eggs product (multiple allergens). */
export const EggsProduct: Story = {
  play: playOpenDialog,
  render: ({invoice}) => {
    const eggsProduct = storyProducts[2];
    if (!eggsProduct) {
      throw new Error("Story fixture error: eggs product not found");
    }

    return (
      <OpenDialogButton
        dialog='EDIT_INVOICE__ALLERGENS'
        mode='edit'
        payload={{invoice, product: eggsProduct, productIndex: 2}}>
        <AllergenDialog />
      </OpenDialogButton>
    );
  },
};
