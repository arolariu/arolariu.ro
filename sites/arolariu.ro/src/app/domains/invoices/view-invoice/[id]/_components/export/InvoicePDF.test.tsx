import {
  AllergenAssessmentStatus,
  AllergenCode,
  AllergenEvidenceLevel,
  ClassificationOrigin,
  PaymentType,
  RecipeDifficulty,
} from "@/types/invoices";
import {
  buildAllergenAssessment,
  buildClassification,
  buildInvoice,
  buildPaymentInformation,
  buildProduct,
  buildRecipe,
} from "../../../../../../../../tests/helpers/builders/domain";
import {isValidElement, type ReactElement, type ReactNode} from "react";
import {describe, expect, it} from "vitest";
import {InvoicePDF, type InvoicePdfLabels} from "./InvoicePDF";

type PdfRenderProps = Readonly<{pageNumber: number; totalPages: number}>;
type PdfElementProps = Readonly<{children?: ReactNode; label?: unknown; render?: unknown; value?: unknown}>;

function collectElements(node: ReactNode): ReactElement<PdfElementProps>[] {
  if (Array.isArray(node)) {
    return node.flatMap(collectElements);
  }

  if (!isValidElement<PdfElementProps>(node)) {
    return [];
  }

  const renderedNode = typeof node.type === "function" ? (node.type as (props: PdfElementProps) => ReactNode)(node.props) : undefined;
  return [node, ...collectElements(node.props.children), ...collectElements(renderedNode)];
}

function collectVisibleText(node: ReactNode): string[] {
  if (typeof node === "string" || typeof node === "number") {
    return [String(node)];
  }

  if (Array.isArray(node)) {
    return node.flatMap(collectVisibleText);
  }

  if (!isValidElement<PdfElementProps>(node)) {
    return [];
  }

  const renderedNode = typeof node.type === "function" ? (node.type as (props: PdfElementProps) => ReactNode)(node.props) : undefined;
  const label = node.props.label;
  const value = node.props.value;
  return [
    ...(typeof label === "string" ? [label] : []),
    ...(typeof value === "string" ? [value] : []),
    ...collectVisibleText(node.props.children),
    ...collectVisibleText(renderedNode),
  ];
}

function hasRenderCallback(
  element: ReactElement<PdfElementProps>,
): element is ReactElement<Readonly<{children?: ReactNode; render: (props: PdfRenderProps) => ReactNode}>> {
  return typeof element.props.render === "function";
}

const labels: InvoicePdfLabels = {
  reportTitle: "Raport localizat",
  generatedOn: (date) => `Generat ${date}`,
  invoiceInformation: "Date factură",
  invoiceName: "Nume",
  description: "Descriere",
  classification: "Clasificare",
  invoiceIdentifier: "ID",
  transactionDate: "Dată",
  receiptType: "Tip bon",
  merchantInformation: "Comerciant",
  merchantName: "Nume comerciant",
  unknownMerchant: "Comerciant neasociat",
  fullName: "Nume complet",
  address: "Adresă",
  phone: "Telefon",
  paymentSummary: "Plată",
  subtotal: "Subtotal",
  tax: "Taxă",
  tip: "Bacșiș",
  total: "Total",
  currency: "Monedă",
  paymentMethod: "Metodă de plată",
  items: "Articole",
  number: "#",
  product: "Produs",
  quantity: "Cantitate",
  unitPrice: "Preț unitar",
  allergenAssessment: "Evaluare alergeni",
  allergenNotAssessed: "Neevaluat",
  allergenStatus: (status) =>
    ({
      detected: "Detectat",
      insufficientData: "Date insuficiente",
      noSignals: "Fără semnale",
    })[status],
  allergenCode: (code) => (code === AllergenCode.Milk ? "Lapte" : code),
  allergenEvidenceLevel: (evidenceLevel) => (evidenceLevel === AllergenEvidenceLevel.Explicit ? "Dovezi explicite" : evidenceLevel),
  analysisSummary: "Rezumat analiză",
  numberOfItems: "Număr articole",
  numberOfScans: "Număr scanări",
  recipes: "Rețete",
  purchasedIngredients: "Ingrediente cumpărate",
  pantryStaples: "Produse de bază",
  missingOptionalIngredients: "Ingrediente opționale lipsă",
  preparationSteps: "Pași",
  allergenWarnings: "Avertismente",
  servings: (count) => `${count} porții`,
  preparationMinutes: (minutes) => `Pregătire ${minutes}`,
  cookingMinutes: (minutes) => `Gătire ${minutes}`,
  totalMinutes: (minutes) => `Total ${minutes}`,
  classificationRoot: (label, code) => `Rădăcină ${label} (${code})`,
  classificationAnalysisOrigin: "Rezultat analiză",
  classificationManualOrigin: "Selecție manuală",
  classificationConfidence: (confidence) => `Încredere ${confidence}`,
  classificationHierarchy: "Ierarhie",
  classificationEvidence: "Dovezi disponibile",
  unclassified: "Neclasificat",
  paymentType: (paymentType) => (paymentType === PaymentType.Card ? "Card" : String(paymentType)),
  recipeDifficulty: (difficulty) => (difficulty === RecipeDifficulty.Easy ? "Dificultate ușoară" : difficulty),
  page: (page, totalPages) => `Pagina ${page} din ${totalPages}`,
};

describe("InvoicePDF", () => {
  it("renders localized allergen, provenance, payment, and complete recipe labels", () => {
    const classification = buildClassification({
      origin: ClassificationOrigin.Analysis,
      hierarchy: [
        {level: "division", code: "01", officialLabel: "Alimente"},
        {level: "group", code: "01.1", officialLabel: "Pâine"},
      ],
      code: "01.1",
      officialLabel: "Pâine",
      evidence: [{source: "receipt", value: "Pâine integrală"}],
    });
    const detected = buildAllergenAssessment({
      status: AllergenAssessmentStatus.Detected,
      signals: [
        {
          code: AllergenCode.Milk,
          evidenceLevel: AllergenEvidenceLevel.Explicit,
          confidence: 0.95,
          evidence: [{source: "ingredients", value: "lapte"}],
        },
      ],
    });
    const invoice = buildInvoice({
      classification,
      paymentInformation: buildPaymentInformation({totalCostAmount: 40, totalTaxAmount: 0, subtotalAmount: 40, tipAmount: 0}),
      items: [
        buildProduct({name: "Neevaluat", allergenAssessment: null}),
        buildProduct({name: "Fără semnale", allergenAssessment: buildAllergenAssessment({status: AllergenAssessmentStatus.NoSignals})}),
        buildProduct({
          name: "Date insuficiente",
          allergenAssessment: buildAllergenAssessment({status: AllergenAssessmentStatus.InsufficientData}),
        }),
        buildProduct({name: "Detectat", classification, allergenAssessment: detected}),
      ],
      possibleRecipes: [
        buildRecipe({
          difficulty: RecipeDifficulty.Easy,
          purchasedIngredients: [{name: "Pâine", quantity: "2 felii", preparation: null}],
          assumedPantryStaples: [{name: "Sare", quantity: "un praf", preparation: "opțional"}],
          missingOptionalIngredients: [{name: "Ulei", quantity: "1 lingură", preparation: null}],
          allergenWarnings: [AllergenCode.Milk],
        }),
      ],
    });
    const document = InvoicePDF({invoice, merchant: null, locale: "ro-RO", labels});

    const visibleText = collectVisibleText(document).join(" ");

    expect(visibleText).toContain("Neevaluat");
    expect(visibleText).toContain("Fără semnale");
    expect(visibleText).toContain("Date insuficiente");
    expect(visibleText).toContain("Detectat");
    expect(visibleText).toContain("Rezultat analiză");
    expect(visibleText).toContain("Metodă de plată");
    expect(visibleText).toContain("Ingrediente opționale lipsă");
  });

  it("uses a page-number and total-pages render callback in every PDF footer", () => {
    const document = InvoicePDF({invoice: buildInvoice(), merchant: null, locale: "en", labels});
    const callbacks = collectElements(document)
      .filter(hasRenderCallback)
      .map((element) => element.props.render);

    expect(callbacks).toHaveLength(2);
    expect(callbacks.map((callback) => callback({pageNumber: 2, totalPages: 4}))).toEqual(["Pagina 2 din 4", "Pagina 2 din 4"]);
  });
});
