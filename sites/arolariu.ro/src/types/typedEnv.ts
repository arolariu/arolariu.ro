/**
 * @fileoverview Type-safe environment variable modeling for the website.
 * @module sites/arolariu.ro/src/types/typedEnv
 */

/**
 * Infers the site name based on the environment.
 *
 * @remarks
 * This conditional type maps environment strings to their corresponding site names:
 * - `"production"` → `"arolariu.ro"`
 * - `"development"` → `"dev.arolariu.ro"`
 * - Any other value → `never` (compile-time error)
 *
 * @template TEnvironment - The environment string literal type
 *
 * @example
 * ```typescript
 * type ProdSite = SiteName<"production">; // "arolariu.ro"
 * type DevSite = SiteName<"development">; // "dev.arolariu.ro"
 * ```
 */
type SiteName<TEnvironment extends string> = TEnvironment extends "production"
  ? "arolariu.ro"
  : TEnvironment extends "development"
    ? "dev.arolariu.ro"
    : never;

/**
 * Infers the site URL based on the environment.
 *
 * @remarks
 * Maps environment strings to their corresponding fully-qualified URLs:
 * - `"production"` → `"https://arolariu.ro"`
 * - `"development"` → `"https://dev.arolariu.ro"`
 * - Any other value → `never` (compile-time error)
 *
 * @template TEnvironment - The environment string literal type
 *
 * @example
 * ```typescript
 * type ProdUrl = SiteUrl<"production">; // "https://arolariu.ro"
 * type DevUrl = SiteUrl<"development">; // "https://dev.arolariu.ro"
 * ```
 */
type SiteUrl<TEnvironment extends string> = TEnvironment extends "production"
  ? "https://arolariu.ro"
  : TEnvironment extends "development"
    ? "https://dev.arolariu.ro"
    : never;

/**
 * Infers the API service name based on the environment.
 *
 * @remarks
 * Currently only supports production:
 * - `"production"` → `"arolariu-api"`
 * - Any other value → `never` (compile-time error)
 *
 * @template TEnvironment - The environment string literal type
 */
type ApiName<TEnvironment extends string> = TEnvironment extends "production" ? "arolariu-api" : never;

/**
 * Build-time website metadata that is intentionally injected into the Next.js bundle.
 *
 * @remarks
 * **Environment Variables**:
 * - `SITE_ENV`: Uppercase environment identifier ("PRODUCTION" | "DEVELOPMENT")
 * - `SITE_NAME`: Human-readable site name (inferred from environment)
 * - `SITE_URL`: Fully-qualified HTTPS URL (inferred from environment)
 *
 * @template TEnvironment - The environment type ("production" | "development")
 *
 * @example
 * ```typescript
 * const prodVars: SiteEnvironmentVariables<"production"> = {
 *   SITE_ENV: "PRODUCTION",
 *   SITE_NAME: "arolariu.ro",
 *   SITE_URL: "https://arolariu.ro",
 * };
 * ```
 */
type SiteEnvironmentVariables<TEnvironment extends "production" | "development"> = Readonly<{
  readonly SITE_ENV: Uppercase<TEnvironment>;
  readonly SITE_NAME: SiteName<TEnvironment>;
  readonly SITE_URL: SiteUrl<TEnvironment>;
}>;

/**
 * Optional API metadata retained for compatibility with older setup tooling.
 *
 * @remarks
 * Runtime API endpoint and auth secret resolution now prefer the exp bootstrap
 * contract. `API_URL` is therefore modeled as an optional compatibility value
 * rather than a required runtime input.
 */
type ApiEnvironmentVariables<TEnvironment extends "production"> = Readonly<{
  readonly API_ENV?: Uppercase<TEnvironment>;
  readonly API_NAME?: ApiName<TEnvironment>;
  readonly API_URL?: string;
}>;

/**
 * Accepted authentication-related deployment inputs.
 *
 * @remarks
 * `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` is intentionally browser-visible because
 * Next.js inlines `NEXT_PUBLIC_*` values at build time. `CLERK_SECRET_KEY`
 * remains server-only.
 *
 * `API_JWT` and `RESEND_API_KEY` are optional legacy fallbacks used only when
 * exp is unavailable during migration or in isolated test scenarios.
 *
 * **Secret Management**:
 * - **Production**: Stored in Azure Key Vault, injected at runtime via exp
 * - **Development**: Stored in `.env.local` (gitignored)
 * - **CI/CD**: Stored as GitHub Secrets, injected during builds
 *
 * @example
 * ```typescript
 * const authVars: AuthEnvironmentVariables = {
 *   NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: "pk_test_...",
 *   CLERK_SECRET_KEY: process.env.CLERK_SECRET_KEY!,
 * };
 * ```
 */
type AuthEnvironmentVariables = Readonly<{
  readonly NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: string;
  readonly CLERK_SECRET_KEY: string;
  readonly API_JWT?: string;
  readonly RESEND_API_KEY?: string;
}>;

/**
 * Accepted Azure runtime identifiers for managed identity-aware deployments.
 *
 * @remarks
 * These values are optional because local Docker execution intentionally omits
 * them and falls back to the `http://exp` service address.
 */
type AzureRuntimeEnvironmentVariables = Readonly<
  Partial<{
    readonly AZURE_CLIENT_ID: string;
    readonly AZURE_TENANT_ID: string;
    readonly AZURE_SUBSCRIPTION_ID: string;
  }>
>;

/**
 * Optional legacy fallback inputs preserved during the exp-driven migration.
 */
type LegacyRuntimeEnvironmentVariables = Readonly<
  Partial<{
    readonly CONFIG_STORE: string;
  }>
>;

/**
 * Build metadata injected during container/image creation.
 *
 * @remarks
 * **Environment Variables**:
 * - `TIMESTAMP`: ISO 8601 build timestamp (e.g., "2025-11-26T12:00:00Z")
 * - `COMMIT_SHA`: Git commit hash for traceability
 * - `USE_CDN`: Whether to use Azure CDN for static assets prefix
 *
 * The commit SHA is attached to telemetry spans for deployment tracking.
 */
type MetadataEnvironmentVariables = Readonly<{
  readonly TIMESTAMP: string;
  readonly COMMIT_SHA: string;
  readonly USE_CDN: boolean;
}>;

/**
 * Consolidated environment-variable contract for the website.
 *
 * @remarks
 * The preferred runtime contract is now:
 * - site metadata (`SITE_*`)
 * - Clerk keys
 * - build metadata (`TIMESTAMP`, `COMMIT_SHA`, `USE_CDN`)
 * - optional Azure managed-identity identifiers
 *
 * API endpoint, auth secret, Resend key, and configuration-store access are
 * expected to come from exp at runtime. Their legacy env fallbacks remain
 * optional to preserve compatibility during the rollout.
 *
 * @template SiteEnv - The site environment ("production" | "development")
 * @template ApiEnv - The API environment (currently only "production")
 *
 * @example
 * ```typescript
 * const prodEnv: TypedEnvironment<"production", "production"> = {
 *   SITE_ENV: "PRODUCTION",
 *   SITE_NAME: "arolariu.ro",
 *   SITE_URL: "https://arolariu.ro",
 *   // ... other required variables
 * };
 * ```
 *
 * @see {@link SiteEnvironmentVariables}
 * @see {@link ApiEnvironmentVariables}
 * @see {@link AuthEnvironmentVariables}
 * @see {@link MetadataEnvironmentVariables}
 */
export type TypedEnvironment<SiteEnv extends "production" | "development", ApiEnv extends "production"> = Readonly<
  SiteEnvironmentVariables<SiteEnv>
    & ApiEnvironmentVariables<ApiEnv>
    & AuthEnvironmentVariables
    & AzureRuntimeEnvironmentVariables
    & LegacyRuntimeEnvironmentVariables
    & MetadataEnvironmentVariables
>;

/**
 * Production website environment contract.
 *
 * @remarks
 * Fixes both site and API environments to production.
 * Inferred values: `SITE_NAME: "arolariu.ro"`, `SITE_URL: "https://arolariu.ro"`.
 */
export type TypedProductionEnvironmentVariablesType = TypedEnvironment<"production", "production">;

/**
 * Development website environment contract.
 *
 * @remarks
 * Sets site environment to development while keeping API at production.
 * Inferred values: `SITE_NAME: "dev.arolariu.ro"`, `SITE_URL: "https://dev.arolariu.ro"`.
 */
export type TypedDevelopmentEnvironmentVariablesType = TypedEnvironment<"development", "production">;

/**
 * Union of environment keys that must always be treated as secrets.
 *
 * @remarks
 * `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` is intentionally excluded because it is
 * designed for browser exposure.
 */
export type SecretEnvironmentVariablesType = Extract<
  keyof (TypedProductionEnvironmentVariablesType | TypedDevelopmentEnvironmentVariablesType),
  "CLERK_SECRET_KEY" | "API_JWT" | "RESEND_API_KEY"
>;
