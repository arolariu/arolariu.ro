/**
 * @fileoverview Clerk webhook handler for user lifecycle events.
 * @module sites/arolariu.ro/src/app/api/auth/clerk/route
 *
 * @remarks
 * Processes Clerk webhook events and enriches user metadata.
 */

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
      const uniqueIdentifier = userId + (primaryEmail ?? "");

      const userIdentifier = generateGuid(uniqueIdentifier);
      const client = await clerkClient();

      await client.users.updateUserMetadata(userId, {
        publicMetadata: {userIdentifier},
      });
    }

    return NextResponse.json({received: true});
  } catch (error) {
    console.error("Webhook error:", error);
    return NextResponse.json("Invalid webhook", {status: 400});
  }
}
