"use client";

/**
 * @fileoverview Localized evidence-first invoice PDF export.
 * @module domains/invoices/view-invoice/[id]/components/export/InvoicePDF
 */

import {formatAmount, formatDate} from "@/lib/utils.generic";
import type {Invoice, Merchant, StandardClassification} from "@/types/invoices";
import {Document, Page, StyleSheet, Text, View} from "@react-pdf/renderer";
import {formatClassificationConfidence, getClassificationRoot, getClassificationSummary} from "../../../../_utils/classificationUtilities";

const styles = StyleSheet.create({
  page: {padding: 36, fontFamily: "Helvetica", fontSize: 9, color: "#1a1a1a", backgroundColor: "#ffffff"},
  header: {marginBottom: 18, paddingBottom: 10, borderBottom: "2pt solid #3b82f6"},
  title: {fontSize: 18, fontWeight: "bold", color: "#3b82f6"},
  muted: {fontSize: 8, color: "#6b7280", marginTop: 4},
  section: {marginBottom: 16},
  sectionTitle: {fontSize: 13, fontWeight: "bold", marginBottom: 6},
  row: {flexDirection: "row", marginBottom: 4},
  label: {width: "36%", color: "#6b7280"},
  value: {width: "64%"},
  tableHeader: {flexDirection: "row", backgroundColor: "#f3f4f6", padding: 5, fontWeight: "bold"},
  tableRow: {flexDirection: "row", borderBottom: "1pt solid #e5e7eb", padding: 5},
  number: {width: "5%", textAlign: "center"},
  product: {width: "35%"},
  classification: {width: "25%"},
  quantity: {width: "10%", textAlign: "right"},
  price: {width: "12.5%", textAlign: "right"},
  total: {width: "12.5%", textAlign: "right"},
  evidence: {fontSize: 7, color: "#92400e", marginTop: 2},
  recipe: {borderTop: "1pt solid #e5e7eb", paddingTop: 8, marginTop: 8},
  listItem: {marginBottom: 3},
  footer: {position: "absolute", bottom: 20, left: 36, right: 36, flexDirection: "row", justifyContent: "space-between"},
});

/** Localized labels supplied by the Next.js export island before PDF rendering. */
export type InvoicePdfLabels = Readonly<{
  reportTitle: string;
  generatedOn: (date: string) => string;
  invoiceInformation: string;
  invoiceName: string;
  description: string;
  classification: string;
  invoiceIdentifier: string;
  transactionDate: string;
  receiptType: string;
  merchantInformation: string;
  merchantName: string;
  unknownMerchant: string;
  fullName: string;
  address: string;
  phone: string;
  paymentSummary: string;
  subtotal: string;
  tax: string;
  tip: string;
  total: string;
  currency: string;
  paymentMethod: string;
  items: string;
  number: string;
  product: string;
  quantity: string;
  unitPrice: string;
  productSignals: string;
  analysisSummary: string;
  numberOfItems: string;
  numberOfScans: string;
  recipes: string;
  purchasedIngredients: string;
  pantryStaples: string;
  missingOptionalIngredients: string;
  preparationSteps: string;
  allergenWarnings: string;
  servings: (count: number) => string;
  preparationMinutes: (minutes: number) => string;
  cookingMinutes: (minutes: number) => string;
  totalMinutes: (minutes: number) => string;
  classificationRoot: (label: string, code: string) => string;
  classificationAnalysisOrigin: string;
  classificationManualOrigin: string;
  classificationConfidence: (confidence: string) => string;
  unclassified: string;
  page: (page: number) => string;
}>;

type InvoicePDFProps = Readonly<{
  /** Public invoice response DTO to render. */
  invoice: Invoice;
  /** Linked merchant response DTO when it is available. */
  merchant: Merchant | null;
  /** Locale selected in the enclosing Next.js export flow. */
  locale: string;
  /** Localized PDF labels selected in the enclosing Next.js export flow. */
  labels: InvoicePdfLabels;
}>;

function classificationLines(classification: StandardClassification | null, labels: InvoicePdfLabels): readonly string[] {
  if (classification === null) {
    return [labels.unclassified];
  }

  const root = getClassificationRoot(classification);
  const confidence = formatClassificationConfidence(classification);
  return [
    getClassificationSummary(classification, labels.unclassified),
    ...(root === null ? [] : [labels.classificationRoot(root.officialLabel, root.code)]),
    classification.origin === "Manual" ? labels.classificationManualOrigin : labels.classificationAnalysisOrigin,
    ...(confidence === null ? [] : [labels.classificationConfidence(confidence)]),
    ...classification.hierarchy.map((node) => `${node.officialLabel} (${node.code})`),
  ];
}

function RecipeSection({
  title,
  ingredients,
}: Readonly<{title: string; ingredients: Invoice["possibleRecipes"][number]["purchasedIngredients"]}>): React.JSX.Element | null {
  if (ingredients.length === 0) {
    return null;
  }

  return (
    <View>
      <Text>{title}</Text>
      {ingredients.map((ingredient) => (
        <Text
          key={`${ingredient.name}-${ingredient.quantity}`}
          style={styles.listItem}>
          {ingredient.name} — {ingredient.quantity}
          {ingredient.preparation === null ? "" : ` (${ingredient.preparation})`}
        </Text>
      ))}
    </View>
  );
}

/** Renders all public invoice data with explicit classification, allergen, and recipe provenance. */
export function InvoicePDF({invoice, merchant, locale, labels}: InvoicePDFProps): React.JSX.Element {
  const activeProducts = invoice.items.filter((product) => !product.metadata.isSoftDeleted);
  const currency = invoice.paymentInformation.currency;
  const formatCurrency = (amount: number): string => `${currency.symbol}${formatAmount(amount, locale)}`;
  const generatedAt = formatDate(new Date(), {locale, year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit"});
  const transactionDate = formatDate(invoice.paymentInformation.transactionDate, {locale, year: "numeric", month: "long", day: "numeric"});

  return (
    <Document>
      <Page
        size='A4'
        style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.title}>{labels.reportTitle}</Text>
          <Text style={styles.muted}>{labels.generatedOn(generatedAt)}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{labels.invoiceInformation}</Text>
          <PdfRow
            label={labels.invoiceName}
            value={invoice.name}
          />
          {invoice.description === "" ? null : (
            <PdfRow
              label={labels.description}
              value={invoice.description}
            />
          )}
          <PdfLines
            label={labels.classification}
            values={classificationLines(invoice.classification, labels)}
          />
          <PdfRow
            label={labels.invoiceIdentifier}
            value={invoice.id}
          />
          <PdfRow
            label={labels.transactionDate}
            value={transactionDate}
          />
          {invoice.receiptType === "" ? null : (
            <PdfRow
              label={labels.receiptType}
              value={invoice.receiptType}
            />
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{labels.merchantInformation}</Text>
          <PdfRow
            label={labels.merchantName}
            value={merchant?.name ?? labels.unknownMerchant}
          />
          {merchant === null ? null : (
            <>
              <PdfLines
                label={labels.classification}
                values={classificationLines(merchant.classification, labels)}
              />
              {merchant.address.fullName === "" ? null : (
                <PdfRow
                  label={labels.fullName}
                  value={merchant.address.fullName}
                />
              )}
              {merchant.address.address === "" ? null : (
                <PdfRow
                  label={labels.address}
                  value={merchant.address.address}
                />
              )}
              {merchant.address.phoneNumber === "" ? null : (
                <PdfRow
                  label={labels.phone}
                  value={merchant.address.phoneNumber}
                />
              )}
            </>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{labels.paymentSummary}</Text>
          <PdfRow
            label={labels.subtotal}
            value={formatCurrency(invoice.paymentInformation.subtotalAmount)}
          />
          <PdfRow
            label={labels.tax}
            value={formatCurrency(invoice.paymentInformation.totalTaxAmount)}
          />
          <PdfRow
            label={labels.tip}
            value={formatCurrency(invoice.paymentInformation.tipAmount)}
          />
          <PdfRow
            label={labels.total}
            value={formatCurrency(invoice.paymentInformation.totalCostAmount)}
          />
          <PdfRow
            label={labels.currency}
            value={`${currency.code} (${currency.name})`}
          />
          <PdfRow
            label={labels.paymentMethod}
            value={String(invoice.paymentInformation.paymentType)}
          />
        </View>

        <View
          style={styles.footer}
          fixed>
          <Text>{labels.page(1)}</Text>
          <Text>{invoice.id}</Text>
        </View>
      </Page>

      <Page
        size='A4'
        style={styles.page}>
        <Text style={styles.sectionTitle}>{labels.items}</Text>
        <View style={styles.tableHeader}>
          <Text style={styles.number}>{labels.number}</Text>
          <Text style={styles.product}>{labels.product}</Text>
          <Text style={styles.classification}>{labels.classification}</Text>
          <Text style={styles.quantity}>{labels.quantity}</Text>
          <Text style={styles.price}>{labels.unitPrice}</Text>
          <Text style={styles.total}>{labels.total}</Text>
        </View>
        {activeProducts.map((product, index) => (
          <View
            key={`${product.productCode}-${product.name}-${index}`}
            style={styles.tableRow}>
            <Text style={styles.number}>{index + 1}</Text>
            <View style={styles.product}>
              <Text>{product.name}</Text>
              {product.allergenAssessment === null ? null : (
                <Text style={styles.evidence}>
                  {product.allergenAssessment.status}
                  {product.allergenAssessment.signals.length === 0
                    ? ""
                    : ` — ${labels.productSignals}: ${product.allergenAssessment.signals
                        .map(
                          (signal) => `${signal.code} (${signal.evidenceLevel}): ${signal.evidence.map((item) => item.value).join("; ")}`,
                        )
                        .join(", ")}`}
                </Text>
              )}
            </View>
            <View style={styles.classification}>
              {classificationLines(product.classification, labels).map((line) => (
                <Text key={line}>{line}</Text>
              ))}
            </View>
            <Text style={styles.quantity}>
              {product.quantity} {product.quantityUnit}
            </Text>
            <Text style={styles.price}>{formatCurrency(product.price)}</Text>
            <Text style={styles.total}>{formatCurrency(product.totalPrice)}</Text>
          </View>
        ))}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{labels.analysisSummary}</Text>
          <PdfRow
            label={labels.numberOfItems}
            value={String(activeProducts.length)}
          />
          <PdfRow
            label={labels.numberOfScans}
            value={String(invoice.scans.length)}
          />
        </View>

        {invoice.possibleRecipes.length === 0 ? null : (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{labels.recipes}</Text>
            {invoice.possibleRecipes.map((recipe) => (
              <View
                key={recipe.name}
                style={styles.recipe}>
                <Text>{recipe.name}</Text>
                <Text style={styles.muted}>{recipe.description}</Text>
                <Text>{labels.servings(recipe.servings)}</Text>
                <Text>{labels.preparationMinutes(recipe.preparationMinutes)}</Text>
                <Text>{labels.cookingMinutes(recipe.cookingMinutes)}</Text>
                <Text>{labels.totalMinutes(recipe.totalMinutes)}</Text>
                <RecipeSection
                  title={labels.purchasedIngredients}
                  ingredients={recipe.purchasedIngredients}
                />
                <RecipeSection
                  title={labels.pantryStaples}
                  ingredients={recipe.assumedPantryStaples}
                />
                <RecipeSection
                  title={labels.missingOptionalIngredients}
                  ingredients={recipe.missingOptionalIngredients}
                />
                <View>
                  <Text>{labels.preparationSteps}</Text>
                  {recipe.steps.map((step) => (
                    <Text
                      key={step.sequence}
                      style={styles.listItem}>
                      {step.sequence}. {step.instruction}
                      {step.notes === null ? "" : ` (${step.notes})`}
                    </Text>
                  ))}
                </View>
                {recipe.allergenWarnings.length === 0 ? null : (
                  <Text>
                    {labels.allergenWarnings}: {recipe.allergenWarnings.join(", ")}
                  </Text>
                )}
              </View>
            ))}
          </View>
        )}
        <View
          style={styles.footer}
          fixed>
          <Text>{labels.page(2)}</Text>
          <Text>{invoice.id}</Text>
        </View>
      </Page>
    </Document>
  );
}

function PdfRow({label, value}: Readonly<{label: string; value: string}>): React.JSX.Element {
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
    </View>
  );
}

function PdfLines({label, values}: Readonly<{label: string; values: readonly string[]}>): React.JSX.Element {
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.value}>
        {values.map((value) => (
          <Text key={value}>{value}</Text>
        ))}
      </View>
    </View>
  );
}
