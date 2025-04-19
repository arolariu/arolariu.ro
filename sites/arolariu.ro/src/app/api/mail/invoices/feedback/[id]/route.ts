/** @format */

import InvoiceFeedback from "@/../emails/invoices/InvoiceFeedback";
import {resend} from "@/lib/utils.server";
import {NextRequest, NextResponse} from "next/server";
import type {CreateEmailOptions} from "resend";

type Props = {params: Promise<{id: string}>};

export async function POST(request: NextRequest, {params}: Props) {
  const {id} = await params;
  const {feedbackFrom, feedbackText, feedbackRating, feedbackFeatures} = (await request.json()) as {
    feedbackFrom: string;
    feedbackText: string;
    feedbackRating: number;
    feedbackFeatures: string[];
  };

  try {
    const emailData = await resend.emails.send({
      from: "AROLARIU.RO <doNotReply@mail.arolariu.ro>",
      to: "admin@arolariu.ro",
      cc: feedbackFrom,
      subject: `Feedback #${id}`,
      react: InvoiceFeedback({
        feedbackFrom,
        feedbackText,
        feedbackRating,
        feedbackFeatures,
      }),
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
