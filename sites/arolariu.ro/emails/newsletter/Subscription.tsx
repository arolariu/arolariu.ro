import {
  Body,
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

export default function SubscriptionEmail({username}: Readonly<{username: string}>) {
  return (
    <Html>
      <Head>
        <title>arolariu.ro | Newsletter subscription</title>
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
      <Preview>Thank you for subscribing to arolariu.ro!</Preview>
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
                <Text>
                  You've been subscribed to the <code className='font-mono'>arolariu.ro</code> newsletter! 🎉🎉
                </Text>
                <Text>
                  You'll receive updates on new events, articles, and other interesting updates to the platform. The
                  cadence of these e-mails should be somewhere between 1 to 2 e-mails per calendar year quarter.
                </Text>
              </Row>
              <Row>
                <Text>
                  If you have any questions or concerns, please don't hesitate to contact the author of the platform at
                  <Link href='mailto:admin@arolariu.ro'> admin@arolariu.ro</Link>.
                </Text>
              </Row>
            </Section>
            <Hr className='border-2 border-gray-500' />
            <Section className='mb-[12px]'>
              <Row>
                <Text className='font-bold'>Additional resources:</Text>
              </Row>
              <Row>
                <Text>
                  <Link href='https://arolariu.ro'>Visit the main website.</Link>
                </Text>
              </Row>
              <Row>
                <Text>
                  <Link href='https://arolariu.ro/events'>See the current and upcoming events.</Link>
                </Text>
              </Row>
              <Row>
                <Text>
                  <Link href='mailto:admin@arolariu.ro?subject=Feedback'>Submit feedback.</Link> <br />
                  <small>We take feedback seriously. Your concerns are our priorities.</small>
                </Text>
              </Row>
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

