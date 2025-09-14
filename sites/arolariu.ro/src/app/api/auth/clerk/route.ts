import {generateGuid} from "@/lib/utils.generic";
import {clerkClient} from "@clerk/nextjs/server";
import {verifyWebhook} from "@clerk/nextjs/webhooks";
import {type NextRequest, NextResponse} from "next/server";

/**
 * This route handles the webhook events raised by the Clerk Auth-as-a-Service.
 * The integration can raise multiple event types. This route will process them.
 * @returns A JSON response indicating the result of the webhook processing.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const evt = await verifyWebhook(request);

    if (evt.type === "user.created") {
      // Goal: Attach to user public medata his UUIDv4 identifier.
      const userId = evt.data.id;
      const primaryEmail = evt.data.email_addresses[0]?.email_address;

      // Create hash from user email
      const uniqueIdentifierBuffer = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(primaryEmail ?? userId));

      const uuidV4 = generateGuid(uniqueIdentifierBuffer);
      const client = await clerkClient();

      await client.users.updateUserMetadata(userId, {
        publicMetadata: {uuidV4},
      });
    }

    return NextResponse.json({received: true});
  } catch (error) {
    console.error("Webhook error:", error);
    return NextResponse.json("Invalid webhook", {status: 400});
  }
}
