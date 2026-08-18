import {buildAllergenAssessment, buildInvoice, buildProduct} from "../../../../../../../../../tests/helpers/builders/domain";
import {InvoiceContextProvider} from "../../../_context/InvoiceContext";
import type {Meta, StoryObj} from "@storybook/react";
import {NutritionCard} from "./NutritionCard";

const meta = {
  title: "Invoices/ViewInvoice/Insights/NutritionCard",
  component: NutritionCard,
  parameters: {layout: "padded"},
} satisfies Meta<typeof NutritionCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const AssessmentStates: Story = {
  render: () => (
    <InvoiceContextProvider
      invoice={buildInvoice({
        items: [
          buildProduct({allergenAssessment: null}),
          buildProduct({allergenAssessment: buildAllergenAssessment({status: "noSignals"})}),
          buildProduct({allergenAssessment: buildAllergenAssessment({status: "insufficientData"})}),
          buildProduct({allergenAssessment: buildAllergenAssessment({status: "detected"})}),
        ],
      })}
      merchant={null}>
      <NutritionCard />
    </InvoiceContextProvider>
  ),
};
