import {Body, Container, Font, Head, Hr, Html, Img, Link, Preview, Row, Section, Tailwind, Text} from "@react-email/components";

type Props = {
  feedbackFrom: string;
  feedbackText: string;
  feedbackRating: number;
  feedbackFeatures: string[];
};

const DEVELOPMENT_PROPS: Readonly<Props> = {
  feedbackFrom: "test@test.test",
  feedbackText: "This is a test feedback text.",
  feedbackRating: 3,
  feedbackFeatures: ["Feature 1", "Feature 2", "Feature 3"],
};

/**
 * Invoice feedback email template.
 * @param props The feedback details.
 * @returns The email template as a React JSX template.
 */
export default function InvoiceFeedback(props: Readonly<Props>) {
  if (process.env.NODE_ENV === "development") {
    props = DEVELOPMENT_PROPS;
  }

  const {feedbackFrom, feedbackText, feedbackRating, feedbackFeatures} = props;
  const ratingAsStars = "⭐".repeat(feedbackRating) + "☆".repeat(5 - feedbackRating);
  const featuresAsList = feedbackFeatures.map((feature) => `- ${feature}`);

  return (
    <Html>
      <Head>
        <title>arolariu.ro | Feedback submitted!</title>
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
      <Preview>Thank you for the feedback!</Preview>
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
              <Text className='font-bold'>{`Hello ${feedbackFrom},`}</Text>
              <Text>We have received your feedback. Thank you for sharing your thoughts! </Text>
              <Text>Here are the details of your feedback:</Text>
            </Section>
            <Section className='mb-[12px]'>
              <Text>Rating: {ratingAsStars}</Text>
              <Text>Feedback: {feedbackText}</Text>
              <Text>Features: </Text>
              {featuresAsList.map((feature) => (
                <Text
                  key={feature}
                  className='ml-4'>
                  {feature}
                </Text>
              ))}
            </Section>
            <Hr className='h-1 w-full rounded-xl bg-black' />
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

