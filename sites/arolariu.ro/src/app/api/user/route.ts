import {getCookie, setCookie} from "@/lib/actions/cookies/cookies.action";
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
 * The GET handler for the user route.
 * Returns user information for both authenticated (Clerk) and guest users.
 *
 * For authenticated users:
 * - Returns Clerk user object with valid JWT from Clerk
 *
 * For guest users:
 * - Returns null user with guest JWT token
 * - JWT contains guest identifier and limited permissions
 *
 * @returns The user information including user object, identifier, and JWT token
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
        const {getToken, userId} = await auth();
        addSpanEvent("auth.check.complete", {authenticated: !!userId});

        // Authenticated user with Clerk
        if (userId) {
          return withSpan("api.user.authenticated", async (authSpan) => {
            authenticatedUserCounter.add(1, {
              ...createAuthAttributes(true, {method: "clerk", provider: "clerk"}),
            });

            authSpan.setAttributes({
              ...createAuthAttributes(true, {method: "clerk", provider: "clerk"}),
            });

            logWithTrace("info", "Fetching authenticated user information", {userId}, "api");

            addSpanEvent("user.fetch.start");
            const user = await currentUser();
            addSpanEvent("user.fetch.complete");

            addSpanEvent("token.generate.start");
            const token = await getToken({template: "jwt-for-api"});
            addSpanEvent("token.generate.complete");

            const userInformation: UserInformation = {
              user: user,
              userIdentifier: userId,
              userJwt: token ?? "",
            };

            authSpan.setAttributes({
              "user.has_token": !!token,
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
        }

        // Guest user - generate JWT token for unauthenticated access
        return withSpan("api.user.guest", async (guestSpan) => {
          guestUserCounter.add(1, {
            ...createAuthAttributes(false, {method: "jwt"}),
          });

          guestSpan.setAttributes({
            ...createAuthAttributes(false, {method: "jwt", provider: "jwt"}),
          });

          logWithTrace("info", "Generating guest user JWT token", undefined, "api");

          // Check for existing guest identifier in cookie, or generate a new one
          addSpanEvent("guest.identifier.retrieve.start");
          let guestIdentifier = await getCookie("guest_session_id");
          
          if (!guestIdentifier) {
            // Generate a new unique identifier for this guest session
            guestIdentifier = generateGuid();
            
            // Store in a secure HTTP-only cookie that expires in 30 days
            // httpOnly: prevents JavaScript access (XSS protection)
            // secure: ensures cookie is only sent over HTTPS
            // sameSite: 'lax' provides CSRF protection while allowing navigation
            // maxAge: 30 days in seconds (30 * 24 * 60 * 60 = 2592000)
            await setCookie("guest_session_id", guestIdentifier, {
              httpOnly: true,
              secure: process.env.NODE_ENV === "production",
              sameSite: "lax",
              maxAge: 2592000,
              path: "/",
            });
            
            logWithTrace("info", "Generated new guest session identifier", {guestIdentifier}, "api");
            addSpanEvent("guest.identifier.created", {identifier: guestIdentifier});
          } else {
            logWithTrace("info", "Reusing existing guest session identifier", {guestIdentifier}, "api");
            addSpanEvent("guest.identifier.reused", {identifier: guestIdentifier});
          }

          const currentTimestamp = Math.floor(Date.now() / 1000);
          const expirationTime = currentTimestamp + 3600; // 1 hour expiration

          const jwtPayload = {
            iss: "https://auth.arolariu.ro",
            aud: "https://api.arolariu.ro",
            iat: currentTimestamp,
            nbf: currentTimestamp,
            exp: expirationTime,
            sub: "guest",
            role: "guest",
            userIdentifier: guestIdentifier,
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

        // Fallback to guest user on error - still generate unique identifier
        let fallbackIdentifier = await getCookie("guest_session_id");
        if (!fallbackIdentifier) {
          fallbackIdentifier = generateGuid();
          await setCookie("guest_session_id", fallbackIdentifier, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            maxAge: 2592000,
            path: "/",
          });
        }
        
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
