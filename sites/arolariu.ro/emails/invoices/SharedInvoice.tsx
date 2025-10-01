import {Body, Container, Font, Head, Hr, Html, Img, Link, Preview, Row, Section, Tailwind, Text} from "@react-email/components";

type Props = {
  fromUsername: string;
  toUsername: string;
  identifier: string;
};

const DEVELOPMENT_PROPS: Readonly<Props> = {
  fromUsername: "testuser",
  toUsername: "recipientuser",
  identifier: "0123-4567-8901",
};

/**
 * Shared invoice email template.
 * @param props The props for the shared invoice email.
 * @returns The email template as a React JSX template.
 */
export default function SharedInvoice(props: Readonly<Props>) {
  if (process.env.NODE_ENV === "development") {
    // eslint-disable-next-line no-param-reassign -- dev mode only
    props = DEVELOPMENT_PROPS;
  }

  const {fromUsername, toUsername, identifier} = props;

  return (
    <Html>
      <Head>
        <title>{`arolariu.ro | Invoice #${identifier}`}</title>
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
      <Preview>An invoice has been shared with you!</Preview>
      <Tailwind>
        <Body className='bg-gray-200'>
          <Container className='m-auto w-[512px] max-w-[100%] px-[20px] py-[40px]'>
            <Link href='https://arolariu.ro'>
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
                <Text className='font-bold'>{`Hello there, ${toUsername}`}</Text>
              </Row>
              <Row>
                <Text>{`${fromUsername} has shared an invoice with you! 🎉🎉`}</Text>
                <Text>
                  You can check it out by{" "}
                  <Link href={`https://arolariu.ro/domains/invoices/view-invoice/${identifier}`}>clicking here</Link>.
                </Text>
              </Row>
            </Section>
            <Hr className='border-2 border-gray-500' />
            <Section className='mb-[12px]'>
              <Row>
                <Text className='font-bold'>Additional resources:</Text>
                <Text>
                  <Link href='https://arolariu.ro'>Visit the main website.</Link>
                </Text>
                <Text>
                  <Link href='mailto:admin@arolariu.ro?subject=Feedback'>Submit feedback.</Link> <br />
                  <small>We take feedback seriously. Your concerns are our priorities.</small>
                </Text>
              </Row>
            </Section>
          </Container>
          <Container>
            <Hr className='h-1 w-full rounded-xl bg-black' />
            <Section>
              <Row>
                <Text style={{textAlign: "center", color: "#706a7b"}}>
                  © 2022-{new Date().getFullYear()} AROLARIU.RO <br /> All rights reserved. <br /> <br />
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
