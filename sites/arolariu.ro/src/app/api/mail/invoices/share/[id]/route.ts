/** @format */

import SharedInvoice from "@/../emails/invoices/SharedInvoice";
import {resend} from "@/lib/utils.server";
import {NextRequest, NextResponse} from "next/server";
import type {CreateEmailOptions} from "resend";

type Props = {params: Promise<{id: string}>};

export async function POST(request: NextRequest, {params}: Props) {
  const {id} = await params;
  const {toEmail, fromEmail} = (await request.json()) as {
    toEmail: string;
    fromEmail: string;
  };

  try {
    const emailData = await resend.emails.send({
      from: "AROLARIU.RO <doNotReply@mail.arolariu.ro>",
      to: toEmail,
      cc: fromEmail,
      bcc: "admin@arolariu.ro",
      subject: "Invoice shared! 🎉🎉",
      react: SharedInvoice({identifier: id}),
    } satisfies CreateEmailOptions);

    if (emailData.error) {
      console.error(">>> Error sending email:", emailData.error);
      return new NextResponse("Internal Server Error", {status: 500});
    }
  } catch (error: unknown) {
    console.error(">>> Error:", error);
    return new NextResponse("Internal Server Error", {status: 500});
  }

  return NextResponse.json({message: "Success"});
}
