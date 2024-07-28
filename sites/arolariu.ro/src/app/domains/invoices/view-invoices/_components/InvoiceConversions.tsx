/** @format */

import Invoice from "@/types/invoices/Invoice";

import {Document, Page, StyleSheet, Text, View} from "@react-pdf/renderer";

const styles = StyleSheet.create({
  page: {
    backgroundColor: "white",
    color: "black",
  },
  section: {
    margin: 10,
    padding: 10,
  },
});

/**
 * This component is used to convert the invoices to pdf format.
 * @returns {JSX.Element} The component to convert the invoices to pdf format.
 */
export const InvoicesAsPdf = ({invoices}: {invoices: Invoice[]}) => {
  return (
    <Document>
      <Page
        size='A4'
        style={styles.page}>
        <View style={styles.section}>
          {invoices.map((invoice) => (
            <View
              key={invoice.id}
              style={styles.section}>
              <Text>{invoice.id}</Text>
              <Text>{String(invoice.createdAt)}</Text>
              <Text>{invoice.merchant?.name}</Text>
              <Text>{invoice.paymentInformation?.totalAmount}</Text>
            </View>
          ))}
        </View>
      </Page>
    </Document>
  );
};
