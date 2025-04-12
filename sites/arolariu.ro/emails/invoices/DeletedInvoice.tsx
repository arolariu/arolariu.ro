/** @format */
import {Body, Container, Font, Head, Hr, Html, Img, Link, Preview, Row, Section, Tailwind, Text} from "@react-email/components";

export default function DeletedInvoice({username, invoiceId}: Readonly<{username: string; invoiceId: string}>) {
  if (process.env.NODE_ENV === "development") invoiceId = "1234567890";
  return (
    <Html>
      <Head>
        <title>arolariu.ro | Invoice #{invoiceId ?? "N/A"}</title>
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
      <Preview>Your invoice has been fully analyzed!</Preview>
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
                <Text>Your invoice has been fully analyzed and is now available for download. </Text>
                <Text>
                  You can check out the analyzed invoice by clicking on this hyperlink: <br /> &rarr; &nbsp;
                  <Link
                    href={`https://arolariu.ro/invoices/view-invoice/${invoiceId}`}
                    target='_blank'>
                    View Invoice
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
