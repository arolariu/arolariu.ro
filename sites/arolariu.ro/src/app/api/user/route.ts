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
 * Retrieves user information and generates JWT tokens for authentication.
 *
 * @remarks
 * **Execution Context**: Next.js API Route Handler (App Router).
 *
 * **Purpose**: Central authentication endpoint that:
 * - Identifies authenticated users via Clerk session cookies
 * - Generates JWT tokens for authenticated users with 5-minute expiration
 * - Provides guest JWT tokens for unauthenticated visitors
 * - Enables frontend to call backend API with proper authorization
 *
 * **Authentication Flow**:
 * 1. **Clerk Check**: Uses `@clerk/nextjs/server` to verify session cookies
 * 2. **Authenticated Path**: Fetches full Clerk user object, generates JWT with user claims
 * 3. **Guest Path**: Generates guest JWT with sentinel GUID (all zeros) and limited permissions
 * 4. **Error Fallback**: Returns guest credentials on any error (graceful degradation)
 *
 * **JWT Token Structure**:
 * - **Issuer (iss)**: `https://auth.arolariu.ro` (authentication authority)
 * - **Audience (aud)**: `https://api.arolariu.ro` (intended recipient)
 * - **Subject (sub)**: User email, phone, or Clerk ID (authenticated) / "guest" (unauthenticated)
 * - **Expiration (exp)**: Current timestamp + 300 seconds (5 minutes)
 * - **Custom Claims**: `userIdentifier` (GUID), `role` ("user" or "guest")
 *
 * **Security Considerations**:
 * - Tokens signed with `API_JWT` secret key (HS256 algorithm)
 * - Short expiration (5 min) limits exposure window if token is compromised
 * - Guest tokens have sentinel GUID (`00000000-0000-0000-0000-000000000000`)
 * - Backend validates JWT signature and expiration before processing requests
 *
 * **Observability & Telemetry** (see Frontend RFC 1001):
 * - **Distributed Tracing**: Parent span `api.user.get` with child spans for auth/guest paths
 * - **Metrics**: Counters for total requests, authenticated/guest breakdowns
 * - **Histogram**: Request duration tracking with auth method labels
 * - **Span Events**: JWT creation lifecycle (start/complete with expiration metadata)
 * - **Structured Logging**: Correlated logs with trace IDs for debugging
 *
 * **Error Handling**:
 * - Catches all exceptions and returns graceful fallback (guest credentials)
 * - Records errors as span exceptions with full context
 * - Logs errors with trace correlation for debugging
 * - Always returns 200 status (no 4xx/5xx to prevent client errors)
 *
 * **Performance**:
 * - Request duration tracked via histogram metrics
 * - Clerk user fetch only for authenticated users (avoids unnecessary API calls)
 * - JWT generation is async but typically completes in <10ms
 * - Target p99 latency: <200ms for authenticated, <50ms for guest
 *
 * **Client Integration**:
 * ```typescript
 * // Typical usage in client components
 * const response = await fetch('/api/user');
 * const { user, userIdentifier, userJwt } = await response.json();
 *
 * // Use JWT for backend API calls
 * const apiResponse = await fetch('https://api.arolariu.ro/invoices', {
 *   headers: { 'Authorization': `Bearer ${userJwt}` }
 * });
 * ```
 *
 * **Known Limitations**:
 * - Tokens are not stored/tracked (stateless), so cannot be revoked before expiration
 * - 5-minute expiration requires frequent token refresh for long-lived sessions
 * - Guest tokens allow limited API access but cannot be distinguished individually
 *
 * @returns Promise resolving to NextResponse with UserInformation (user object, GUID, JWT)
 *
 * @example
 * ```typescript
 * // Authenticated user response
 * {
 *   user: { id: "clerk_user_123", emailAddresses: [...], ... },
 *   userIdentifier: "a1b2c3d4-...",
 *   userJwt: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 * }
 *
 * // Guest user response
 * {
 *   user: null,
 *   userIdentifier: "00000000-0000-0000-0000-000000000000",
 *   userJwt: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 * }
 * ```
 *
 * @see {@link UserInformation} - TypeScript interface for return type structure
 * @see {@link createJwtToken} - JWT generation utility with HS256 signing
 * @see {@link https://clerk.com/docs/references/nextjs/overview | Clerk Next.js SDK}
 * @see Frontend RFC 1001 - OpenTelemetry observability implementation patterns
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
        // eslint-disable-next-line unicorn/prefer-ternary -- no need.
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
