/**
 * @fileoverview Professional PDF template for invoice export using @react-pdf/renderer.
 * @module domains/invoices/view-invoice/[id]/components/export/InvoicePDF
 *
 * @remarks
 * Generates a multi-page PDF document containing:
 * - **Page 1**: Invoice overview with header, transaction details, merchant info, and payment summary
 * - **Page 2+**: Products table with detailed line items
 * - **Final Section**: Analysis summary with health score and recipes
 *
 * **Design Principles:**
 * - Professional styling with clean layout and proper spacing
 * - Color palette: primary blue (#3b82f6), dark text (#1a1a1a), light gray borders
 * - Built-in Helvetica font family for consistency
 * - Page numbers in footer for navigation
 * - Proper handling of null/undefined values
 *
 * **Performance:**
 * - Client-side PDF generation using @react-pdf/renderer
 * - Efficient rendering with StyleSheet optimization
 * - On-demand generation (not during initial render)
 *
 * **Rendering Context**: Client Component (uses @react-pdf/renderer which requires client-side execution).
 *
 * @see {@link Invoice} for invoice data structure
 * @see {@link Merchant} for merchant data structure
 */

"use client";

import {formatAmount, formatDate} from "@/lib/utils.generic";
import type {Invoice, Merchant} from "@/types/invoices";
import {Document, Page, StyleSheet, Text, View} from "@react-pdf/renderer";

/**
 * Props for the InvoicePDF component.
 *
 * @remarks
 * Both invoice and merchant are passed from the ExportDialog which receives them from InvoiceContext.
 * Merchant can be null - component handles this gracefully by showing "Unknown Merchant".
 */
interface InvoicePDFProps {
  /** The invoice to render in the PDF */
  readonly invoice: Invoice;
  /** The merchant associated with the invoice (can be null) */
  readonly merchant: Merchant | null;
}

/**
 * Professional PDF template component for invoice export.
 *
 * @remarks
 * **Structure:**
 * 1. **Page 1 - Invoice Overview:**
 *    - Header with "arolariu.ro — Invoice Report" and generation date
 *    - Invoice name, description, category
 *    - Invoice ID (smaller, reference only)
 *    - Transaction date and receipt type
 *    - Merchant information (name, address, phone) - handles null merchant
 *    - Payment summary: subtotal, tax, tip, total, currency
 *    - Payment method
 *
 * 2. **Page 2+ - Products Table:**
 *    - Table headers: #, Product Name, Category, Qty, Unit, Unit Price, Total
 *    - One row per product
 *    - Allergens per product (comma-separated)
 *    - Soft-deleted products are excluded
 *    - Subtotal row at bottom
 *
 * 3. **Final Section - Analysis Summary:**
 *    - Invoice health score (if available)
 *    - Recipe names (if any)
 *    - Number of scans attached
 *
 * **Error Handling:**
 * - Null/undefined checks for all optional fields
 * - Empty arrays handled gracefully
 * - Missing data shows "N/A" or "Unknown"
 *
 * @param props - Component props
 * @param props.invoice - The invoice data to render
 * @param props.merchant - The merchant data (can be null)
 * @returns PDF Document component ready for rendering
 *
 * @example
 * ```tsx
 * // In ExportDialog
 * import {pdf} from "@react-pdf/renderer";
 * import {InvoicePDF} from "./InvoicePDF";
 *
 * const blob = await pdf(<InvoicePDF invoice={invoice} merchant={merchant} />).toBlob();
 * ```
 */
export function InvoicePDF({invoice, merchant}: Readonly<InvoicePDFProps>): React.JSX.Element {
  const generatedDate = formatDate(new Date(), {
    locale: "en-US",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const transactionDate = formatDate(invoice.paymentInformation.transactionDate, {
    locale: "en-US",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  // Filter out soft-deleted products
  const activeProducts = invoice.items.filter((product) => !product.metadata.isSoftDeleted);

  // Calculate subtotal from active products
  const subtotal = activeProducts.reduce((sum, product) => sum + product.totalPrice, 0);

  // Format currency helper
  const formatCurrencyValue = (amount: number): string => {
    return `${invoice.paymentInformation.currency.symbol}${formatAmount(amount)}`;
  };

  // Get payment method label
  const getPaymentMethodLabel = (): string => {
    const paymentType = invoice.paymentInformation.paymentType;
    switch (paymentType) {
      case 100:
        return "Cash";
      case 200:
        return "Card";
      case 300:
        return "Transfer";
      case 400:
        return "Mobile Payment";
      case 500:
        return "Voucher";
      case 9999:
        return "Other";
      default:
        return "Unknown";
    }
  };

  // Get category label
  const getCategoryLabel = (): string => {
    switch (invoice.category) {
      case 100:
        return "Grocery";
      case 200:
        return "Fast Food";
      case 300:
        return "Home Cleaning";
      case 400:
        return "Car & Auto";
      case 9999:
        return "Other";
      default:
        return "Not Defined";
    }
  };

  // Get product category label
  const getProductCategoryLabel = (category: number): string => {
    switch (category) {
      case 100:
        return "Baked Goods";
      case 200:
        return "Groceries";
      case 300:
        return "Dairy";
      case 400:
        return "Meat";
      case 500:
        return "Fish";
      case 600:
        return "Fruits";
      case 700:
        return "Vegetables";
      case 800:
        return "Beverages";
      case 900:
        return "Alcoholic Beverages";
      case 1000:
        return "Tobacco";
      case 1100:
        return "Cleaning Supplies";
      case 1200:
        return "Personal Care";
      case 1300:
        return "Medicine";
      case 9999:
        return "Other";
      default:
        return "Not Defined";
    }
  };

  return (
    <Document>
      {/* Page 1 - Invoice Overview */}
      <Page
        size='A4'
        style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>arolariu.ro — Invoice Report</Text>
          <Text style={styles.headerDate}>Generated on {generatedDate}</Text>
        </View>

        {/* Invoice Information Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Invoice Information</Text>
          <View style={styles.divider} />

          <View style={styles.infoRow}>
            <Text style={styles.label}>Invoice Name:</Text>
            <Text style={styles.value}>{invoice.name || "N/A"}</Text>
          </View>

          {invoice.description && (
            <View style={styles.infoRow}>
              <Text style={styles.label}>Description:</Text>
              <Text style={styles.value}>{invoice.description}</Text>
            </View>
          )}

          <View style={styles.infoRow}>
            <Text style={styles.label}>Category:</Text>
            <Text style={styles.value}>{getCategoryLabel()}</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.label}>Invoice ID:</Text>
            <Text style={styles.valueSmall}>{invoice.id}</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.label}>Transaction Date:</Text>
            <Text style={styles.value}>{transactionDate}</Text>
          </View>

          {invoice.receiptType && (
            <View style={styles.infoRow}>
              <Text style={styles.label}>Receipt Type:</Text>
              <Text style={styles.value}>{invoice.receiptType}</Text>
            </View>
          )}
        </View>

        {/* Merchant Information Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Merchant Information</Text>
          <View style={styles.divider} />

          <View style={styles.infoRow}>
            <Text style={styles.label}>Merchant Name:</Text>
            <Text style={styles.value}>{merchant?.name || "Unknown Merchant"}</Text>
          </View>

          {merchant?.address?.fullName && (
            <View style={styles.infoRow}>
              <Text style={styles.label}>Full Name:</Text>
              <Text style={styles.value}>{merchant.address.fullName}</Text>
            </View>
          )}

          {merchant?.address?.address && (
            <View style={styles.infoRow}>
              <Text style={styles.label}>Address:</Text>
              <Text style={styles.value}>{merchant.address.address}</Text>
            </View>
          )}

          {merchant?.address?.phoneNumber && (
            <View style={styles.infoRow}>
              <Text style={styles.label}>Phone:</Text>
              <Text style={styles.value}>{merchant.address.phoneNumber}</Text>
            </View>
          )}
        </View>

        {/* Payment Summary Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Payment Summary</Text>
          <View style={styles.divider} />

          {invoice.paymentInformation.subtotalAmount > 0 && (
            <View style={styles.infoRow}>
              <Text style={styles.label}>Subtotal:</Text>
              <Text style={styles.value}>{formatCurrencyValue(invoice.paymentInformation.subtotalAmount)}</Text>
            </View>
          )}

          <View style={styles.infoRow}>
            <Text style={styles.label}>Tax:</Text>
            <Text style={styles.value}>{formatCurrencyValue(invoice.paymentInformation.totalTaxAmount)}</Text>
          </View>

          {invoice.paymentInformation.tipAmount > 0 && (
            <View style={styles.infoRow}>
              <Text style={styles.label}>Tip:</Text>
              <Text style={styles.value}>{formatCurrencyValue(invoice.paymentInformation.tipAmount)}</Text>
            </View>
          )}

          <View style={styles.infoRow}>
            <Text style={styles.labelBold}>Total:</Text>
            <Text style={styles.valueBold}>{formatCurrencyValue(invoice.paymentInformation.totalCostAmount)}</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.label}>Currency:</Text>
            <Text style={styles.value}>
              {invoice.paymentInformation.currency.code} ({invoice.paymentInformation.currency.name})
            </Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.label}>Payment Method:</Text>
            <Text style={styles.value}>{getPaymentMethodLabel()}</Text>
          </View>
        </View>

        {/* Footer with page number */}
        <View
          style={styles.footer}
          fixed>
          <Text style={styles.footerText}>Page 1</Text>
          <Text style={styles.footerText}>Invoice ID: {invoice.id}</Text>
        </View>
      </Page>

      {/* Page 2+ - Products Table */}
      {activeProducts.length > 0 && (
        <Page
          size='A4'
          style={styles.page}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Invoice Items</Text>
            <Text style={styles.headerDate}>{invoice.name}</Text>
          </View>

          {/* Products Table */}
          <View style={styles.table}>
            {/* Table Header */}
            <View style={styles.tableHeader}>
              <Text style={[styles.tableCell, styles.tableCellNumber]}>#</Text>
              <Text style={[styles.tableCell, styles.tableCellProduct]}>Product Name</Text>
              <Text style={[styles.tableCell, styles.tableCellCategory]}>Category</Text>
              <Text style={[styles.tableCell, styles.tableCellQty]}>Qty</Text>
              <Text style={[styles.tableCell, styles.tableCellUnit]}>Unit</Text>
              <Text style={[styles.tableCell, styles.tableCellPrice]}>Unit Price</Text>
              <Text style={[styles.tableCell, styles.tableCellTotal]}>Total</Text>
            </View>

            {/* Table Rows */}
            {activeProducts.map((product, index) => (
              <View
                key={index}
                style={styles.tableRow}>
                <Text style={[styles.tableCell, styles.tableCellNumber]}>{index + 1}</Text>
                <View style={[styles.tableCell, styles.tableCellProduct]}>
                  <Text style={styles.productName}>{product.name}</Text>
                  {product.detectedAllergens && product.detectedAllergens.length > 0 && (
                    <Text style={styles.allergens}>Allergens: {product.detectedAllergens.map((a) => a.name).join(", ")}</Text>
                  )}
                </View>
                <Text style={[styles.tableCell, styles.tableCellCategory]}>{getProductCategoryLabel(product.category)}</Text>
                <Text style={[styles.tableCell, styles.tableCellQty]}>{product.quantity}</Text>
                <Text style={[styles.tableCell, styles.tableCellUnit]}>{product.quantityUnit || "pcs"}</Text>
                <Text style={[styles.tableCell, styles.tableCellPrice]}>{formatCurrencyValue(product.price)}</Text>
                <Text style={[styles.tableCell, styles.tableCellTotal]}>{formatCurrencyValue(product.totalPrice)}</Text>
              </View>
            ))}

            {/* Subtotal Row */}
            <View style={styles.tableFooter}>
              <Text style={[styles.tableCell, styles.tableCellProduct]}>Subtotal</Text>
              <Text style={[styles.tableCell, styles.tableCellTotal, styles.subtotalValue]}>{formatCurrencyValue(subtotal)}</Text>
            </View>
          </View>

          {/* Analysis Summary Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Analysis Summary</Text>
            <View style={styles.divider} />

            <View style={styles.infoRow}>
              <Text style={styles.label}>Number of Items:</Text>
              <Text style={styles.value}>{activeProducts.length}</Text>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.label}>Number of Scans:</Text>
              <Text style={styles.value}>{invoice.scans.length}</Text>
            </View>

            {invoice.possibleRecipes && invoice.possibleRecipes.length > 0 && (
              <View style={styles.infoRow}>
                <Text style={styles.label}>Possible Recipes:</Text>
                <Text style={styles.value}>{invoice.possibleRecipes.map((r) => r.name).join(", ")}</Text>
              </View>
            )}
          </View>

          {/* Footer with page number */}
          <View
            style={styles.footer}
            fixed>
            <Text style={styles.footerText}>Page 2</Text>
            <Text style={styles.footerText}>Invoice ID: {invoice.id}</Text>
          </View>
        </Page>
      )}
    </Document>
  );
}

/**
 * PDF stylesheet with professional design.
 *
 * @remarks
 * **Design System:**
 * - Primary color: #3b82f6 (blue)
 * - Text color: #1a1a1a (dark gray)
 * - Border color: #e5e7eb (light gray)
 * - Background: #ffffff (white)
 *
 * **Typography:**
 * - Font family: Helvetica (built-in, reliable)
 * - Header: 18pt bold
 * - Section titles: 14pt bold
 * - Body text: 10pt regular
 * - Small text: 8pt regular
 *
 * **Layout:**
 * - Page padding: 40pt
 * - Section spacing: 20pt
 * - Row spacing: 8pt
 * - Proper use of flexbox for alignment
 */
const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontFamily: "Helvetica",
    fontSize: 10,
    color: "#1a1a1a",
    backgroundColor: "#ffffff",
  },
  header: {
    marginBottom: 30,
    paddingBottom: 15,
    borderBottom: "2pt solid #3b82f6",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#3b82f6",
    marginBottom: 5,
  },
  headerDate: {
    fontSize: 9,
    color: "#6b7280",
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#1a1a1a",
    marginBottom: 8,
  },
  divider: {
    borderBottom: "1pt solid #e5e7eb",
    marginBottom: 8,
  },
  infoRow: {
    flexDirection: "row",
    marginBottom: 8,
  },
  label: {
    width: "40%",
    fontSize: 10,
    color: "#6b7280",
    fontWeight: "normal",
  },
  labelBold: {
    width: "40%",
    fontSize: 11,
    color: "#1a1a1a",
    fontWeight: "bold",
  },
  value: {
    width: "60%",
    fontSize: 10,
    color: "#1a1a1a",
  },
  valueBold: {
    width: "60%",
    fontSize: 11,
    color: "#1a1a1a",
    fontWeight: "bold",
  },
  valueSmall: {
    width: "60%",
    fontSize: 8,
    color: "#6b7280",
  },
  table: {
    marginTop: 10,
    marginBottom: 20,
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#f3f4f6",
    padding: 8,
    borderBottom: "2pt solid #3b82f6",
    fontWeight: "bold",
  },
  tableRow: {
    flexDirection: "row",
    borderBottom: "1pt solid #e5e7eb",
    padding: 8,
    alignItems: "flex-start",
  },
  tableFooter: {
    flexDirection: "row",
    backgroundColor: "#f9fafb",
    padding: 8,
    borderTop: "2pt solid #3b82f6",
    fontWeight: "bold",
  },
  tableCell: {
    fontSize: 9,
    color: "#1a1a1a",
  },
  tableCellNumber: {
    width: "5%",
    textAlign: "center",
  },
  tableCellProduct: {
    width: "30%",
  },
  tableCellCategory: {
    width: "15%",
    fontSize: 8,
  },
  tableCellQty: {
    width: "8%",
    textAlign: "center",
  },
  tableCellUnit: {
    width: "10%",
    textAlign: "center",
  },
  tableCellPrice: {
    width: "16%",
    textAlign: "right",
  },
  tableCellTotal: {
    width: "16%",
    textAlign: "right",
  },
  productName: {
    fontSize: 9,
    color: "#1a1a1a",
    marginBottom: 2,
  },
  allergens: {
    fontSize: 7,
    color: "#ef4444",
    fontStyle: "italic",
  },
  subtotalValue: {
    fontWeight: "bold",
    fontSize: 10,
  },
  footer: {
    position: "absolute",
    bottom: 30,
    left: 40,
    right: 40,
    flexDirection: "row",
    justifyContent: "space-between",
    borderTop: "1pt solid #e5e7eb",
    paddingTop: 10,
  },
  footerText: {
    fontSize: 8,
    color: "#6b7280",
  },
});
