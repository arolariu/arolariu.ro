import {resend} from "@/lib/utils.server";
import SubscriptionEmail from "../../../../../emails/newsletter/Subscription";

/**
 * Method to send a newsletter subscription e-mail.
 * @param request The request object.
 * @returns The response object.
 */
export async function POST(request: Request) {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const {email, username} = await request.json();

  try {
    const data = await resend.emails.send({
      from: "AROLARIU.RO <doNotReply@mail.arolariu.ro>",
      to: email as string,
      reply_to: "admin@arolariu.ro",
      subject: "Thank you for subscribing to arolariu.ro! 🎉🎉",
      react: SubscriptionEmail({username}),
    });
    return Response.json(data);
  } catch (error: unknown) {
    return Response.json({error});
  }
}
