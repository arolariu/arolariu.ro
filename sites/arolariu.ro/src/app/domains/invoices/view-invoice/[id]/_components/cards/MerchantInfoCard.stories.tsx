import {ClassificationOrigin, ClassificationSystem} from "@/types/invoices";
import {buildClassification, buildInvoice, buildMerchant} from "../../../../../../../../tests/helpers/builders/domain";
import type {Meta, StoryObj} from "@storybook/react";
import {InvoiceContextProvider} from "../../_context/InvoiceContext";
import MerchantInfoCard from "./MerchantInfoCard";

const merchant = buildMerchant({
  classification: buildClassification({
    system: ClassificationSystem.Nace21,
    version: "2.1",
    code: "47.11",
    officialLabel: "Non-specialised retail sale of predominately food, beverages or tobacco",
    hierarchy: [
      {level: "section", code: "G", officialLabel: "WHOLESALE AND RETAIL TRADE"},
      {level: "division", code: "47", officialLabel: "Retail trade"},
      {level: "group", code: "47.1", officialLabel: "Non-specialised retail sale"},
      {level: "class", code: "47.11", officialLabel: "Non-specialised retail sale of predominately food, beverages or tobacco"},
    ],
    origin: ClassificationOrigin.Analysis,
    confidence: 0.9,
    evidence: [{source: "merchant", value: "Retail receipt"}],
  }),
});

const meta = {
  title: "Invoices/ViewInvoice/Cards/MerchantInfoCard",
  component: MerchantInfoCard,
  parameters: {layout: "padded"},
} satisfies Meta<typeof MerchantInfoCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const ClassifiedMerchant: Story = {
  render: () => (
    <InvoiceContextProvider
      invoice={buildInvoice({merchantReference: merchant.id})}
      merchant={merchant}>
      <MerchantInfoCard />
    </InvoiceContextProvider>
  ),
};

export const UnlinkedMerchant: Story = {
  render: () => (
    <InvoiceContextProvider
      invoice={buildInvoice()}
      merchant={null}>
      <MerchantInfoCard />
    </InvoiceContextProvider>
  ),
};
