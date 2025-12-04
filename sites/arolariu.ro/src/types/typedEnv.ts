/**
 * Infers the site name based on the environment.
 *
 * @remarks
 * This conditional type maps environment strings to their corresponding site names:
 * - `"production"` → `"arolariu.ro"`
 * - `"development"` → `"dev.arolariu.ro"`
 * - Any other value → `never` (compile-time error)
 *
 * **Type Safety**: Ensures only valid environment-site combinations are used at compile time.
 *
 * **Usage Context**: Used in `SiteEnvironmentVariables` to guarantee consistency between
 * environment and site name.
 *
 * @template T - The environment string literal type (must be "production" or "development")
 *
 * @example
 * ```typescript
 * type ProdSite = SiteName<"production">; // "arolariu.ro"
 * type DevSite = SiteName<"development">; // "dev.arolariu.ro"
 * type Invalid = SiteName<"staging">; // never (type error)
 * ```
 */
type SiteName<T extends string> = T extends "production" ? "arolariu.ro" : T extends "development" ? "dev.arolariu.ro" : never;

/**
 * Infers the site URL based on the environment.
 *
 * @remarks
 * This conditional type maps environment strings to their corresponding fully-qualified URLs:
 * - `"production"` → `"https://arolariu.ro"`
 * - `"development"` → `"https://dev.arolariu.ro"`
 * - Any other value → `never` (compile-time error)
 *
 * **Protocol**: Always uses HTTPS for security.
 *
 * **Type Safety**: Prevents accidental URL mismatches by enforcing compile-time validation.
 *
 * **Usage Context**: Used in `SiteEnvironmentVariables` for constructing absolute URLs,
 * canonical links, and API base URLs.
 *
 * @template T - The environment string literal type (must be "production" or "development")
 *
 * @example
 * ```typescript
 * type ProdUrl = SiteUrl<"production">; // "https://arolariu.ro"
 * type DevUrl = SiteUrl<"development">; // "https://dev.arolariu.ro"
 * ```
 */
type SiteUrl<T extends string> = T extends "production"
  ? "https://arolariu.ro"
  : T extends "development"
    ? "https://dev.arolariu.ro"
    : never;

/**
 * Infers the API service name based on the environment.
 *
 * @remarks
 * Currently only supports production environment:
 * - `"production"` → `"arolariu-api"`
 * - Any other value → `never` (compile-time error)
 *
 * **Design Rationale**: Development and staging environments share the production API.
 * This prevents type-level inference for non-production API names.
 *
 * **Future Extensibility**: If separate dev/staging APIs are deployed, extend this type
 * with additional branches.
 *
 * @template T - The environment string literal type (currently only "production" is valid)
 *
 * @example
 * ```typescript
 * type ProdApi = ApiName<"production">; // "arolariu-api"
 * type DevApi = ApiName<"development">; // never (no separate dev API)
 * ```
 */
type ApiName<T extends string> = T extends "production" ? "arolariu-api" : never;

/**
 * Infers the API base URL based on the environment.
 *
 * @remarks
 * Currently only supports production environment:
 * - `"production"` → `"https://api.arolariu.ro"`
 * - Any other value → `never` (compile-time error)
 *
 * **Design Rationale**: All environments (dev/staging/prod) use the production API endpoint.
 * This consolidates backend infrastructure and simplifies deployment.
 *
 * **Protocol**: Always uses HTTPS for secure API communication.
 *
 * **Usage Context**: Used for constructing REST API requests, authentication endpoints,
 * and WebSocket connections.
 *
 * @template T - The environment string literal type (currently only "production" is valid)
 *
 * @example
 * ```typescript
 * type ProdApi = ApiUrl<"production">; // "https://api.arolariu.ro"
 * type DevApi = ApiUrl<"development">; // never (shares prod API)
 * ```
 */
type ApiUrl<T extends string> = T extends "production" ? "https://api.arolariu.ro" : never;

/**
 * Defines site-specific environment variables with type-safe inference.
 *
 * @remarks
 * **Type Safety**: Automatically infers correct `SITE_NAME` and `SITE_URL` based on `SITE_ENV`.
 * For example, setting `SITE_ENV: "PRODUCTION"` enforces `SITE_NAME: "arolariu.ro"`.
 *
 * **Immutability**: All properties are `readonly` to prevent accidental modification at runtime.
 *
 * **Environment Variables**:
 * - `SITE_ENV`: Uppercase environment identifier ("PRODUCTION" | "DEVELOPMENT")
 * - `SITE_NAME`: Human-readable site name (inferred from environment)
 * - `SITE_URL`: Fully-qualified HTTPS URL (inferred from environment)
 *
 * **Usage Context**: Used in Next.js configuration, metadata generation, and canonical URL construction.
 *
 * @template Env - The environment type ("production" | "development")
 *
 * @example
 * ```typescript
 * const prodVars: SiteEnvironmentVariables<"production"> = {
 *   SITE_ENV: "PRODUCTION",
 *   SITE_NAME: "arolariu.ro", // Type-checked!
 *   SITE_URL: "https://arolariu.ro"
 * };
 * ```
 */
type SiteEnvironmentVariables<Env extends "production" | "development"> = Readonly<{
  readonly SITE_ENV: Uppercase<Env>;
  readonly SITE_NAME: SiteName<Env>;
  readonly SITE_URL: SiteUrl<Env>;
}>;

/**
 * Defines API-specific environment variables with type-safe inference.
 *
 * @remarks
 * **Environment Constraint**: Currently restricted to `"production"` environment only.
 * All frontend environments (dev/staging/prod) consume the production API.
 *
 * **Type Safety**: Automatically infers `API_NAME` and `API_URL` based on `API_ENV`.
 *
 * **Immutability**: All properties are `readonly` to prevent runtime modifications.
 *
 * **Environment Variables**:
 * - `API_ENV`: Uppercase environment identifier (currently only "PRODUCTION")
 * - `API_NAME`: API service name ("arolariu-api")
 * - `API_URL`: Fully-qualified API base URL ("https://api.arolariu.ro")
 *
 * **Usage Context**: Used for REST API calls, authentication, and backend communication.
 *
 * @template Env - The API environment type (currently only "production" is supported)
 *
 * @example
 * ```typescript
 * const apiVars: ApiEnvironmentVariables<"production"> = {
 *   API_ENV: "PRODUCTION",
 *   API_NAME: "arolariu-api",
 *   API_URL: "https://api.arolariu.ro"
 * };
 * ```
 */
type ApiEnvironmentVariables<Env extends "production"> = Readonly<{
  readonly API_ENV: Uppercase<Env>;
  readonly API_NAME: ApiName<Env>;
  readonly API_URL: ApiUrl<Env>;
}>;

/**
 * Defines authentication and authorization environment variables.
 *
 * @remarks
 * **Security Critical**: All variables in this type contain sensitive credentials.
 * Must never be logged, committed to version control, or exposed to client-side code
 * (except `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` which is intentionally public).
 *
 * **Immutability**: All properties are `readonly` to prevent accidental modification.
 *
 * **Environment Variables**:
 * - `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`: Clerk public API key (safe for client-side)
 * - `CLERK_SECRET_KEY`: Clerk secret key for server-side authentication (SENSITIVE)
 * - `API_JWT`: JWT token for backend API authorization (SENSITIVE)
 * - `RESEND_API_KEY`: Resend email service API key (SENSITIVE)
 *
 * **Usage Context**:
 * - Clerk keys: User authentication and session management
 * - API_JWT: Authorizing requests to arolariu-api backend
 * - RESEND_API_KEY: Transactional email sending
 *
 * **Secret Management**: In production, loaded from Azure Key Vault.
 * In development, stored in `.env.local` (gitignored).
 *
 * @example
 * ```typescript
 * // Server-side only (except NEXT_PUBLIC_* variables)
 * const authVars: AuthEnvironmentVariables = {
 *   NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: "pk_test_...",
 *   CLERK_SECRET_KEY: process.env.CLERK_SECRET_KEY!,
 *   API_JWT: process.env.API_JWT!,
 *   RESEND_API_KEY: process.env.RESEND_API_KEY!
 * };
 * ```
 */
type AuthEnvironmentVariables = Readonly<{
  readonly NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: string;
  readonly CLERK_SECRET_KEY: string;
  readonly API_JWT: string;
  readonly RESEND_API_KEY: string;
}>;

/**
 * Defines build-time metadata environment variables.
 *
 * @remarks
 * **Build-Time Injection**: These variables are set during the build process
 * and baked into the application bundle. They do not change at runtime.
 *
 * **Immutability**: All properties are `readonly` to reflect their build-time nature.
 *
 * **Environment Variables**:
 * - `TIMESTAMP`: ISO 8601 build timestamp (e.g., "2025-11-26T12:00:00Z")
 * - `COMMIT_SHA`: Git commit hash for traceability (e.g., "a1b2c3d4e5f6")
 * - `USE_CDN`: Whether to use Azure CDN for static assets (true in production)
 *
 * **Usage Context**:
 * - `TIMESTAMP`: Displayed in footer, used for cache busting
 * - `COMMIT_SHA`: Correlating frontend errors with specific deployments
 * - `USE_CDN`: Switching between CDN and direct blob storage URLs
 *
 * **Observability**: The commit SHA is attached to telemetry spans for deployment tracking.
 *
 * @example
 * ```typescript
 * const metadata: MetadataEnvironmentVariables = {
 *   TIMESTAMP: "2025-11-26T12:00:00Z",
 *   COMMIT_SHA: "a1b2c3d4e5f6",
 *   USE_CDN: true
 * };
 * ```
 */
type MetadataEnvironmentVariables = Readonly<{
  readonly TIMESTAMP: string;
  readonly COMMIT_SHA: string;
  readonly USE_CDN: boolean;
}>;

/**
 * Combines all environment variable types into a single type-safe interface.
 *
 * @remarks
 * **Type Safety**: Enforces correct environment variable combinations at compile time.
 * For example, `TypedEnvironment<"production", "production">` automatically infers:
 * - `SITE_NAME: "arolariu.ro"`
 * - `SITE_URL: "https://arolariu.ro"`
 * - `API_URL: "https://api.arolariu.ro"`
 *
 * **Composition**: Merges four distinct environment variable categories:
 * 1. **Site**: Frontend-specific configuration (name, URL)
 * 2. **API**: Backend API configuration (endpoint, name)
 * 3. **Auth**: Authentication credentials (Clerk, JWT, Resend)
 * 4. **Metadata**: Build-time information (timestamp, commit SHA, CDN flag)
 *
 * **Immutability**: The resulting type is deeply `readonly`, preventing runtime modifications.
 *
 * **Usage Context**: Used as the return type for environment configuration loaders,
 * ensuring all code consuming environment variables has compile-time type safety.
 *
 * **Design Rationale**: Separating variable categories allows:
 * - Independent testing of each category
 * - Clear documentation of variable purposes
 * - Easier extension (add new categories without breaking existing code)
 *
 * @template SiteEnv - The site environment ("production" | "development")
 * @template ApiEnv - The API environment (currently only "production")
 *
 * @example
 * ```typescript
 * // Production environment with full type inference
 * const prodEnv: TypedEnvironment<"production", "production"> = {
 *   SITE_ENV: "PRODUCTION",
 *   SITE_NAME: "arolariu.ro", // Automatically inferred!
 *   SITE_URL: "https://arolariu.ro",
 *   API_ENV: "PRODUCTION",
 *   API_NAME: "arolariu-api",
 *   API_URL: "https://api.arolariu.ro",
 *   NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: "pk_live_...",
 *   CLERK_SECRET_KEY: "sk_live_...",
 *   API_JWT: "eyJ...",
 *   RESEND_API_KEY: "re_...",
 *   TIMESTAMP: "2025-11-26T12:00:00Z",
 *   COMMIT_SHA: "a1b2c3d",
 *   USE_CDN: true
 * };
 * ```
 *
 * @see {@link SiteEnvironmentVariables}
 * @see {@link ApiEnvironmentVariables}
 * @see {@link AuthEnvironmentVariables}
 * @see {@link MetadataEnvironmentVariables}
 */
export type TypedEnvironment<SiteEnv extends "production" | "development", ApiEnv extends "production"> = Readonly<
  SiteEnvironmentVariables<SiteEnv> & ApiEnvironmentVariables<ApiEnv> & AuthEnvironmentVariables & MetadataEnvironmentVariables
>;

/**
 * Type alias for production environment variables.
 *
 * @remarks
 * Convenience type that fixes both site and API environments to production.
 * Equivalent to `TypedEnvironment<"production", "production">`.
 *
 * **Inferred Values**:
 * - `SITE_NAME`: `"arolariu.ro"`
 * - `SITE_URL`: `"https://arolariu.ro"`
 * - `API_URL`: `"https://api.arolariu.ro"`
 *
 * **Usage Context**: Used in production deployment configurations and type guards.
 *
 * @example
 * ```typescript
 * const prodVars: TypedProductionEnvironmentVariablesType = {
 *   SITE_ENV: "PRODUCTION",
 *   SITE_NAME: "arolariu.ro",
 *   // ... other required variables
 * };
 * ```
 */
export type TypedProductionEnvironmentVariablesType = TypedEnvironment<"production", "production">;

/**
 * Type alias for development environment variables.
 *
 * @remarks
 * Convenience type that sets site environment to development while keeping API at production.
 * Equivalent to `TypedEnvironment<"development", "production">`.
 *
 * **Design Rationale**: Development frontend uses production API to simplify infrastructure
 * and ensure consistent backend behavior across environments.
 *
 * **Inferred Values**:
 * - `SITE_NAME`: `"dev.arolariu.ro"`
 * - `SITE_URL`: `"https://dev.arolariu.ro"`
 * - `API_URL`: `"https://api.arolariu.ro"` (same as production)
 *
 * **Usage Context**: Used in local development and staging deployments.
 *
 * @example
 * ```typescript
 * const devVars: TypedDevelopmentEnvironmentVariablesType = {
 *   SITE_ENV: "DEVELOPMENT",
 *   SITE_NAME: "dev.arolariu.ro",
 *   SITE_URL: "https://dev.arolariu.ro",
 *   API_ENV: "PRODUCTION", // Shares prod API
 *   // ... other required variables
 * };
 * ```
 */
export type TypedDevelopmentEnvironmentVariablesType = TypedEnvironment<"development", "production">;

/**
 * Union type of all secret environment variable keys.
 *
 * @remarks
 * **Security Critical**: This type identifies which environment variables contain sensitive
 * credentials and must never be exposed to client-side code or logs.
 *
 * **Type Extraction**: Uses `Extract` to filter environment variable keys to only those
 * present in `AuthEnvironmentVariables`, ensuring we only flag actual secrets.
 *
 * **Excluded from Extraction**: `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` is intentionally
 * public and safe for client-side exposure (per Next.js `NEXT_PUBLIC_*` convention).
 *
 * **Secret Keys** (as of RFC 1002):
 * - `CLERK_SECRET_KEY`: Server-side authentication secret
 * - `API_JWT`: Backend API authorization token
 * - `RESEND_API_KEY`: Email service credentials
 *
 * **Usage Context**:
 * - Validation: Ensuring secrets are not accidentally logged
 * - Testing: Mocking sensitive variables in tests
 * - Documentation: Identifying which variables require secure storage
 *
 * **Secret Management**:
 * - **Production**: Stored in Azure Key Vault, injected at runtime
 * - **Development**: Stored in `.env.local` (gitignored)
 * - **CI/CD**: Stored as GitHub Secrets, injected during builds
 *
 * @example
 * ```typescript
 * // Type-safe secret filtering
 * function isSecret(key: string): key is SecretEnvironmentVariablesType {
 *   const secrets: SecretEnvironmentVariablesType[] = [
 *     "CLERK_SECRET_KEY",
 *     "API_JWT",
 *     "RESEND_API_KEY"
 *   ];
 *   return secrets.includes(key as SecretEnvironmentVariablesType);
 * }
 *
 * // Usage in logging guard
 * Object.keys(process.env).forEach(key => {
 *   if (!isSecret(key)) {
 *     console.log(`${key}: ${process.env[key]}`);
 *   }
 * });
 * ```
 *
 * @see {@link AuthEnvironmentVariables}
 */
export type SecretEnvironmentVariablesType = Extract<
  keyof (TypedProductionEnvironmentVariablesType | TypedDevelopmentEnvironmentVariablesType),
  keyof AuthEnvironmentVariables // Ensures only auth-related secrets are included
>;
