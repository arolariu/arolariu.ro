import {generateGuid} from "@/lib/utils.generic";
import {API_JWT, createJwtToken} from "@/lib/utils.server";
import {
  addSpanEvent,
  createAuthAttributes,
  createCounter,
  createHistogram,
  createHttpServerAttributes,
  createNextJsAttributes,
  logWithTrace,
  recordSpanError,
  setSpanAttributes,
  withSpan,
} from "@/telemetry";
import type {UserInformation} from "@/types";
import {auth, currentUser} from "@clerk/nextjs/server";
import {NextResponse} from "next/server";

export const dynamic = "force-dynamic";

// Metrics with type-safe names
const userRequestCounter = createCounter("user.api.requests", "Total number of /api/user requests", "1");
const guestUserCounter = createCounter("user.guest.requests", "Total number of guest user requests", "1");
const authenticatedUserCounter = createCounter("user.authenticated.requests", "Total number of authenticated user requests", "1");
const requestDurationHistogram = createHistogram("api.user.duration", "Request duration in milliseconds", "ms");

/**
 * Retrieves user information for authenticated or guest users.
 *
 * For authenticated users, returns Clerk user object with valid JWT.
 * For guest users, returns null user with guest JWT containing identifier and limited permissions.
 * @returns The user information including user object, identifier, and JWT token.
 * @remarks This HTTP GET request *SHOULD* be called by the client-side to obtain user information.
 */
export async function GET(): Promise<NextResponse<Readonly<UserInformation>>> {
  const startTime = Date.now();
  return withSpan(
    "api.user.get",
    async () => {
      try {
        // Record request metric with type-safe attributes
        userRequestCounter.add(1, {
          ...createHttpServerAttributes("GET", 200, {route: "/api/user"}),
          ...createNextJsAttributes("api", {runtime: "nodejs"}),
        });

        // Add semantic span attributes
        setSpanAttributes({
          ...createHttpServerAttributes("GET", 200, {route: "/api/user"}),
          ...createNextJsAttributes("api", {runtime: "nodejs"}),
        });

        logWithTrace("info", "Processing /api/user request", undefined, "api");

        // Check authentication
        addSpanEvent("auth.check.start");
        const {isAuthenticated, userId} = await auth();
        addSpanEvent("auth.check.complete", {authenticated: Boolean(isAuthenticated)});

        // Authenticated user with Clerk
        if (isAuthenticated) {
          return withSpan("api.user.authenticated", async (userSpan) => {
            // Record request metric with type-safe attributes
            authenticatedUserCounter.add(1, {
              ...createAuthAttributes(true, {method: "clerk", provider: "clerk"}),
            });

            userSpan.setAttributes({
              ...createAuthAttributes(true, {method: "clerk", provider: "clerk"}),
            });

            logWithTrace("info", "Fetching authenticated user clerk information", {userId}, "api");

            const user = await currentUser();
            const userIdentifier = generateGuid(userId);
            const currentTimestamp = Math.floor(Date.now() / 1000);
            // todo: we don't store the generated token, so we fallback to 5 minutes expiration time.
            const expirationTime = currentTimestamp + 300; // 5 minute expiration

            const jwtPayload = {
              iss: "https://auth.arolariu.ro",
              aud: "https://api.arolariu.ro",
              iat: currentTimestamp,
              nbf: currentTimestamp,
              exp: expirationTime,
              sub:
                user?.primaryEmailAddress?.emailAddress
                ?? user?.emailAddresses[0]?.emailAddress
                ?? user?.primaryPhoneNumber?.phoneNumber
                ?? user?.phoneNumbers[0]?.phoneNumber
                ?? user?.id
                ?? "N/A",
              userIdentifier,
              role: "user",
            };

            addSpanEvent("jwt.create.start");
            const token = await createJwtToken(jwtPayload, API_JWT);
            addSpanEvent("jwt.create.complete", {
              token_expiration: expirationTime,
            });

            const userInformation: UserInformation = {
              user,
              userIdentifier,
              userJwt: token,
            };

            userSpan.setAttributes({
              "user.has_token": Boolean(token),
              "response.status": 200,
            });

            const duration = Date.now() - startTime;
            requestDurationHistogram.record(duration, {
              ...createHttpServerAttributes("GET", 200, {route: "/api/user"}),
              ...createAuthAttributes(true, {method: "clerk"}),
            });

            logWithTrace(
              "info",
              "Successfully returned authenticated user information",
              {
                userId,
                duration,
                ...createAuthAttributes(true, {method: "clerk"}),
              },
              "api",
            );

            return NextResponse.json(userInformation, {status: 200});
          });
        } else {
          return withSpan("api.user.guest", async (guestSpan) => {
            // Record request metric with type-safe attributes
            guestUserCounter.add(1, {
              ...createAuthAttributes(false, {method: "jwt"}),
            });

            guestSpan.setAttributes({
              ...createAuthAttributes(false, {method: "jwt", provider: "jwt"}),
            });

            logWithTrace("info", "Generating guest user JWT token", undefined, "api");

            const guestIdentifier = "00000000-0000-0000-0000-000000000000";
            const currentTimestamp = Math.floor(Date.now() / 1000);
            // todo: we don't store the generated token, so we fallback to 5 minutes expiration time.
            const expirationTime = currentTimestamp + 300; // 5 minute expiration

            const jwtPayload = {
              iss: "https://auth.arolariu.ro",
              aud: "https://api.arolariu.ro",
              iat: currentTimestamp,
              nbf: currentTimestamp,
              exp: expirationTime,
              sub: "guest",
              userIdentifier: guestIdentifier,
              role: "guest",
            };

            addSpanEvent("jwt.create.start");
            const guestToken = await createJwtToken(jwtPayload, API_JWT);
            addSpanEvent("jwt.create.complete", {
              token_expiration: expirationTime,
            });

            const guestUserInformation: UserInformation = {
              user: null,
              userIdentifier: guestIdentifier,
              userJwt: guestToken,
            };

            guestSpan.setAttributes({
              "jwt.expiration": expirationTime,
              "response.status": 200,
            });

            const duration = Date.now() - startTime;
            requestDurationHistogram.record(duration, {
              ...createHttpServerAttributes("GET", 200, {route: "/api/user"}),
              ...createAuthAttributes(false, {method: "jwt"}),
            });

            logWithTrace(
              "info",
              "Successfully generated guest user information",
              {
                duration,
                expiresIn: 3600,
                ...createAuthAttributes(false, {method: "jwt"}),
              },
              "api",
            );

            return NextResponse.json(guestUserInformation, {status: 200});
          });
        }
      } catch (error) {
        recordSpanError(error, "Failed to process /api/user request");

        const errorAttrs = createAuthAttributes(false, {method: "error_fallback"});

        logWithTrace(
          "error",
          "Error generating user information",
          {
            ...errorAttrs,
            error: error instanceof Error ? error.message : "Unknown error",
            stack: error instanceof Error ? error.stack : undefined,
          },
          "api",
        );

        // Fallback to guest user on error
        const fallbackIdentifier = "00000000-0000-0000-0000-000000000000";
        const fallbackUserInformation: UserInformation = {
          user: null,
          userIdentifier: fallbackIdentifier,
          userJwt: "",
        };

        const duration = Date.now() - startTime;
        requestDurationHistogram.record(duration, {
          ...createHttpServerAttributes("GET", 200, {route: "/api/user"}),
          ...errorAttrs,
        });

        setSpanAttributes({
          ...createHttpServerAttributes("GET", 200, {route: "/api/user"}),
          ...errorAttrs,
        });

        return NextResponse.json(fallbackUserInformation, {status: 200});
      }
    },
    {
      "service.name": "arolariu-website",
      component: "api",
    },
  );
}
