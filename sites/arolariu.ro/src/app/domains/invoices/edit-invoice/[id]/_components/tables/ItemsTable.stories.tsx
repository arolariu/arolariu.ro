import {DialogProvider} from "@/app/domains/invoices/_contexts/DialogContext";
import {buildAllergenAssessment, buildInvoice, buildProduct} from "../../../../../../../../tests/helpers/builders/domain";
import type {Meta, StoryObj} from "@storybook/react";
import ItemsTable from "./ItemsTable";

const meta = {
  title: "Invoices/EditInvoice/Tables/ItemsTable",
  component: ItemsTable,
  decorators: [
    (Story) => (
      <DialogProvider>
        <Story />
      </DialogProvider>
    ),
  ],
  parameters: {layout: "padded"},
} satisfies Meta<typeof ItemsTable>;

export default meta;
type Story = StoryObj<typeof meta>;

export const StructuredAssessments: Story = {
  args: {
    invoice: buildInvoice({
      items: [
        buildProduct({allergenAssessment: null}),
        buildProduct({allergenAssessment: buildAllergenAssessment({status: "noSignals"})}),
        buildProduct({allergenAssessment: buildAllergenAssessment({status: "insufficientData"})}),
      ],
    }),
  },
};
