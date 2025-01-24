/** @format */

import {FakeInvoice} from "@/data/mocks/invoices";
import type Invoice from "@/types/invoices/Invoice";
import {
  Body,
  Column,
  Container,
  Font,
  Head,
  Hr,
  Html,
  Img,
  Link,
  Preview,
  Row,
  Section,
  Tailwind,
  Text,
} from "@react-email/components";

export default function SharedInvoice({username, invoice}: Readonly<{username: string; invoice: Invoice}>) {
  if (process.env.NODE_ENV === "development") invoice = FakeInvoice;

  const merchantName = invoice?.merchant?.name ?? "N/A";
  const totalAmount = invoice?.paymentInformation?.totalAmount ?? 0;
  const currencySymbol = invoice?.paymentInformation?.currencySymbol ?? "N/A";
  const dateOfPurchase = invoice?.paymentInformation?.dateOfPurchase?.toLocaleDateString("en-gb") ?? "N/A";

  return (
    <Html>
      <Head>
        <title>arolariu.ro | Invoice #{invoice?.id ?? Math.random().toString().slice(2, 12)}</title>
        <Font
          fontFamily='Caudex'
          fallbackFontFamily='Verdana'
          webFont={{
            url: "https://fonts.gstatic.com/s/caudex/v17/esDQ311QOP6BJUrIz_iAnb4eEw.woff2",
            format: "woff2",
          }}
          fontWeight={400}
          fontStyle='normal'
        />
      </Head>
      <Preview>Your invoice is ready to be shared!</Preview>
      <Tailwind>
        <Body className='bg-gray-200'>
          <Container className='m-auto w-[512px] max-w-[100%] px-[20px] py-[40px]'>
            <Link
              href='https://arolariu.ro'
              target='_blank'>
              <Img
                src='https://arolariu.ro/manifest/android-chrome-384x384.png'
                alt='arolariu.ro logo'
                width={300}
                height={300}
                className='mx-auto'
              />
            </Link>
            <Section>
              <Row>
                <Text className='font-bold'>Hello {username ?? "there"}!</Text>
              </Row>
              <Row>
                <Text>You've successfully made an invoice available for sharing. 🎉🎉</Text>
                <Text>Here are the details of the shared invoice:</Text>
              </Row>
              <Section>
                <Row>
                  <Column>Merchant Name</Column>
                  <Column>Total Amount</Column>
                  <Column>Date of Purchase</Column>
                </Row>
                <Row>
                  <Column>{merchantName}</Column>
                  <Column>
                    {totalAmount} {currencySymbol}
                  </Column>
                  <Column>{dateOfPurchase}</Column>
                </Row>
              </Section>
              <Row>
                <Text>
                  You can save the following link to share the invoice with others: <br />
                  <Link
                    href={`https://arolariu.ro/invoices/view-invoice/${invoice?.id}`}
                    target='_blank'>
                    https://arolariu.ro/invoices/view-invoice/{invoice?.id}
                  </Link>
                </Text>
              </Row>
            </Section>
            <Hr className='border-2 border-gray-500' />
            <Section className='mb-[12px]'>
              <Row>
                <Text className='font-bold'>Additional resources:</Text>
              </Row>
              <Text>
                <Link href='https://arolariu.ro'>Visit the main website.</Link>
              </Text>
              <Text>
                <Link href='https://arolariu.ro/events'>See the current and upcoming events.</Link>
              </Text>
              <Text>
                <Link href='mailto:admin@arolariu.ro?subject=Feedback'>Submit feedback.</Link> <br />
                <small>We take feedback seriously. Your concerns are our priorities.</small>
              </Text>
            </Section>
          </Container>
          <Container>
            <Section>
              <Row>
                <Text style={{textAlign: "center", color: "#706a7b"}}>
                  © 2022-{new Date().getFullYear()} AROLARIU.RO, All rights reserved. <br />
                  ❤️ Bucharest - Romania
                </Text>
              </Row>
            </Section>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
}
