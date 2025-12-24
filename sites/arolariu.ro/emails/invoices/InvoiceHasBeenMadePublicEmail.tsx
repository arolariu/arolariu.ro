/**
 * @fileoverview Email template for notifying users that an invoice has been made public.
 * @module emails/invoices/InvoiceHasBeenMadePublicEmail
 *
 * @remarks
 * This template is sent to users when they successfully change the privacy setting
 * of an invoice to "public". It includes invoice details, a direct link, and a QR code.
 *
 * @see {@link https://react.email/docs/introduction}
 */

import {
  Body,
  Button,
  Column,
  Container,
  Font,
  Head,
  Heading,
  Hr,
  Html,
  Img,
  Preview,
  Row,
  Section,
  Tailwind,
  Text,
} from "@react-email/components";

/**
 * Properties for the InvoiceHasBeenMadePublicEmail component.
 *
 * @remarks
 * All fields are required to provide a complete summary of the invoice in the email.
 */
type Props = Readonly<{
  /** The unique identifier of the invoice */
  invoiceId: string;
  /** The display name of the invoice */
  invoiceName: string;
  /** The name of the merchant associated with the invoice */
  merchantName: string;
  /** The total amount of the invoice formatted as a string */
  totalAmount: string;
  /** The currency code (e.g., RON, USD) */
  currency: string;
  /** The date the invoice was created, formatted for display */
  dateCreated: string;
}>;

/**
 * React component that renders the "Invoice Made Public" email template.
 *
 * @remarks
 * **Rendering Context**: React Email (Server-side rendering for email clients).
 *
 * **Design**: Uses Tailwind CSS for styling and includes a QR code for quick access.
 *
 * @param props - The invoice details to be displayed in the email.
 * @returns A rendered React Email template.
 *
 * @example
 * ```tsx
 * <InvoiceHasBeenMadePublicEmail
 *   invoiceId="550e8400-e29b-41d4-a716-446655440000"
 *   invoiceName="Grocery Shopping"
 *   merchantName="Carrefour"
 *   totalAmount="247.50"
 *   currency="RON"
 *   dateCreated="Dec 24, 2025"
 * />
 * ```
 */
const InvoiceHasBeenMadePublicEmail = (props: Readonly<Props>) => {
  const {invoiceId, invoiceName, merchantName, totalAmount, currency, dateCreated} = props;

  return (
    <Html
      lang='en'
      dir='ltr'>
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
      <Preview>Your invoice "{invoiceName}" is now publicly accessible</Preview>
      <Tailwind>
        <Body className='bg-[#1124cb] py-[40px] font-sans'>
          <Container className='mx-auto max-w-[600px] overflow-hidden rounded-[8px] bg-white'>
            {/* Header with Logo */}
            <Section className='bg-white px-[40px] pt-[40px] text-center'>
              <Img
                src='https://di867tnz6fwga.cloudfront.net/brand-kits/071ab0be-ee67-4945-8807-29ecacfa97bc/primary/96729a74-5ced-4b21-bcc3-74e7d921cc03.png'
                alt='arolariu.ro'
                className='mx-auto h-auto w-full max-w-[200px] object-cover'
              />
            </Section>

            {/* Main Content */}
            <Section className='px-[40px] py-[32px]'>
              <Heading className='mt-0 mb-[24px] text-[24px] font-bold text-[#000000]'>Invoice Made Public Successfully</Heading>

              <Text className='mt-0 mb-[24px] text-[16px] leading-[24px] text-[#000000]'>
                Your invoice has been successfully made public and is now accessible to anyone with the URL. This means that people can view
                your invoice details without needing to log in or have special permissions.
              </Text>

              {/* Invoice Details Card */}
              <Section className='mb-[32px] rounded-[8px] border border-solid border-[#e9ecef] bg-[#f8f9fa] p-[24px]'>
                <Heading className='mt-0 mb-[16px] text-[18px] font-bold text-[#000000]'>Invoice Details</Heading>

                <Row>
                  <Column>
                    <Text className='mt-0 mb-[4px] text-[14px] font-bold text-[#000000]'>Invoice Name:</Text>
                    <Text className='mt-0 mb-[12px] text-[14px] text-[#000000]'>{invoiceName}</Text>
                  </Column>
                </Row>

                <Row>
                  <Column className='w-1/2 pr-[12px]'>
                    <Text className='mt-0 mb-[4px] text-[14px] font-bold text-[#000000]'>Merchant:</Text>
                    <Text className='mt-0 mb-[12px] text-[14px] text-[#000000]'>{merchantName}</Text>
                  </Column>
                  <Column className='w-1/2 pl-[12px]'>
                    <Text className='mt-0 mb-[4px] text-[14px] font-bold text-[#000000]'>Amount:</Text>
                    <Text className='mt-0 mb-[12px] text-[14px] text-[#000000]'>
                      {totalAmount} {currency}
                    </Text>
                  </Column>
                </Row>

                <Row>
                  <Column>
                    <Text className='mt-0 mb-[4px] text-[14px] font-bold text-[#000000]'>Date Created:</Text>
                    <Text className='mt-0 mb-0 text-[14px] text-[#000000]'>{dateCreated}</Text>
                  </Column>
                </Row>
              </Section>

              {/* QR Code Section */}
              <Section className='mb-[32px] text-center'>
                <Heading className='mt-0 mb-[16px] text-[18px] font-bold text-[#000000]'>Quick Access QR Code</Heading>
                <Text className='mt-0 mb-[16px] text-[14px] text-[#000000]'>
                  Share this QR code with others for instant access to your invoice:
                </Text>
                <Img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=https://arolariu.ro/domains/invoices/view-invoice/${invoiceId}`}
                  alt='QR Code for Invoice Access'
                  className='mx-auto h-[200px] w-[200px] rounded-[8px] border border-solid border-[#e9ecef]'
                />
                <Text className='mt-[8px] mb-0 text-[12px] text-[#666666]'>Scan with your phone camera to open the invoice</Text>
              </Section>

              {/* Action Buttons */}
              <Section className='mb-[32px] text-center'>
                <Button
                  href={`https://arolariu.ro/domains/invoices/view-invoice/${invoiceId}`}
                  className='box-border inline-block rounded-[8px] bg-[#b404ff] px-[32px] py-[12px] text-[16px] font-semibold text-white no-underline'>
                  View Invoice
                </Button>
              </Section>

              {/* Important Notice */}
              <Section className='mb-[32px] rounded-[8px] border border-solid border-[#ffeaa7] bg-[#fff3cd] p-[16px]'>
                <Text className='mt-0 mb-[8px] text-[14px] font-bold text-[#856404]'>⚠️ Important Security Notice</Text>
                <Text className='mt-0 mb-0 text-[14px] text-[#856404]'>
                  Your invoice is now publicly accessible. Anyone with the URL or QR code can view the invoice details. If you want to make
                  it private again, please visit your invoice management dashboard.
                </Text>
              </Section>

              <Text className='mt-0 mb-[24px] text-[16px] leading-[24px] text-[#000000]'>
                You can manage your invoice privacy settings at any time through your dashboard. If you have any questions or need
                assistance, please don't hesitate to contact our support team.
              </Text>

              <Text className='mt-0 mb-0 text-[16px] leading-[24px] text-[#000000]'>
                Best regards,
                <br />
                The arolariu.ro Team
              </Text>
            </Section>

            <Hr className='mx-[40px] border-[#e9ecef]' />
          </Container>

          {/* Footer */}
          <Container>
            <Section>
              <Row>
                <Text style={{textAlign: "center", color: "#ffffff"}}>
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
};

InvoiceHasBeenMadePublicEmail.PreviewProps = {
  invoiceId: "550e8400-e29b-41d4-a716-446655440000",
  invoiceName: "Grocery Shopping - Carrefour",
  merchantName: "Carrefour Romania",
  totalAmount: "247.50",
  currency: "RON",
  dateCreated: "December 20, 2024",
};

export default InvoiceHasBeenMadePublicEmail;
