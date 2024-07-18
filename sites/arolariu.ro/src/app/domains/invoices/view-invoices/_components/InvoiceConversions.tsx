/** @format */

import Invoice from "@/types/invoices/Invoice";

import {Document, Image, Page, StyleSheet, Text, View} from "@react-pdf/renderer";
import {SourceObject} from "@react-pdf/types";

const styles = StyleSheet.create({
  page: {
    backgroundColor: "white",
    color: "black",
  },
  header: {
    display: "flex",
    margin: 10,
    padding: 10,
    backgroundColor: "lightgray",
  },
  logo: {
    width: 100,
    height: 100,
  },
  image: {},
  section: {
    margin: 10,
    padding: 10,
  },
  pageNumber: {
    position: "absolute",
    fontSize: 12,
    bottom: 30,
    left: 0,
    right: 0,
    textAlign: "center",
    color: "grey",
  },
});

/**
 * This component is used to convert the invoices to pdf format.
 * @returns The component to convert the invoices to pdf format.
 */
export const InvoicesAsPdf = ({invoices}: Readonly<{invoices: Invoice[]}>) => {
  const logo: SourceObject = {
    uri: "https://arolariu.ro/logo.svg",
    method: "GET",
    body: "",
    headers: {},
  };

  return (
    <Document
      title={invoices.length > 1 ? "Invoices" : "Invoice"}
      creator='arolariu.ro'
      author='arolariu.ro'
      subject={invoices.length > 1 ? "Scanned invoices" : "Scanned invoice"}
      keywords='invoices, scanned, pdf, arolariu.ro'
      creationDate={new Date()}
      language='en'>
      <Page
        size='A4'
        orientation='portrait'
        style={styles.page}>
        <View style={styles.header}>
          <Image
            src={logo}
            style={styles.logo}
          />
          <Text>Invoice Report</Text>
          <Text>Invoices: #{invoices.length}</Text>
        </View>
        <View style={styles.section}>
          <Text>
            Lorem ipsum dolor sit amet, consectetur adipisicing elit. Impedit provident neque, dicta iusto tenetur
            itaque iste, hic, nisi inventore debitis quo totam aspernatur. In, sequi. Rem magnam aut praesentium
            cupiditate tempore amet veritatis sapiente accusantium ab ipsum inventore reprehenderit, ipsa sint deserunt,
            dicta ducimus quibusdam quaerat maiores. Voluptatem earum a consectetur tempora id quam laboriosam deserunt
            corporis eius illum eveniet, aut repudiandae explicabo, soluta odit. Quos exercitationem dolores officia
            harum vitae quam eaque quibusdam, fugiat, consectetur cum aliquid esse, soluta dolorum. Iusto, libero
            expedita. Veniam laboriosam error in quisquam doloribus voluptas placeat numquam voluptates consequuntur
            velit nam, labore eos rem beatae dolor cupiditate harum eaque, aut sint qui tenetur ipsam quibusdam ad.
            Labore ducimus perspiciatis facilis molestias, nostrum repellendus pariatur deleniti quidem similique iste
            ea dicta officiis tempora, nihil tempore itaque harum numquam a maiores provident laborum. Vitae natus
            similique at ipsum nulla vero dolore.
          </Text>
        </View>
        <Text
          style={styles.pageNumber}
          render={({pageNumber, totalPages}) => `${pageNumber} / ${totalPages}`}
          fixed
        />
      </Page>
      {invoices.map((invoice) => (
        <Page
          key={invoice.id}
          style={styles.section}>
          <View>
            <Text>Invoice identifier: {invoice.id}</Text>
            <Text>Invoice creation time: {String(invoice.createdAt)}</Text>
            <Text>Invoice merchant name: {invoice.merchant?.name}</Text>
            <Text>Invoice total cost: {invoice.paymentInformation?.totalAmount}</Text>
          </View>
          <View>
            <Image
              src={invoice.photoLocation as SourceObject}
              style={styles.image}
            />
          </View>
          <Text
            style={styles.pageNumber}
            render={({pageNumber, totalPages}) => `${pageNumber} / ${totalPages}`}
            fixed
          />
        </Page>
      ))}
    </Document>
  );
};
