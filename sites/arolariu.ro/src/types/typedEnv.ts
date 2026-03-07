/**
 * @fileoverview Type-safe environment variable modeling for the website.
 * @module sites/arolariu.ro/src/types/typedEnv
 */

type SiteName<TEnvironment extends string> = TEnvironment extends "production"
  ? "arolariu.ro"
  : TEnvironment extends "development"
    ? "dev.arolariu.ro"
    : never;

type SiteUrl<TEnvironment extends string> = TEnvironment extends "production"
  ? "https://arolariu.ro"
  : TEnvironment extends "development"
    ? "https://dev.arolariu.ro"
    : never;

type ApiName<TEnvironment extends string> = TEnvironment extends "production" ? "arolariu-api" : never;

/**
 * Build-time website metadata that is intentionally injected into the Next.js bundle.
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
type AzureRuntimeEnvironmentVariables = Readonly<Partial<{
  readonly AZURE_CLIENT_ID: string;
  readonly AZURE_TENANT_ID: string;
  readonly AZURE_SUBSCRIPTION_ID: string;
}>>;

/**
 * Optional legacy fallback inputs preserved during the exp-driven migration.
 */
type LegacyRuntimeEnvironmentVariables = Readonly<Partial<{
  readonly CONFIG_STORE: string;
}>>;

/**
 * Build metadata injected during container/image creation.
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
 */
export type TypedEnvironment<SiteEnv extends "production" | "development", ApiEnv extends "production"> = Readonly<
  SiteEnvironmentVariables<SiteEnv> &
    ApiEnvironmentVariables<ApiEnv> &
    AuthEnvironmentVariables &
    AzureRuntimeEnvironmentVariables &
    LegacyRuntimeEnvironmentVariables &
    MetadataEnvironmentVariables
>;

/**
 * Production website environment contract.
 */
export type TypedProductionEnvironmentVariablesType = TypedEnvironment<"production", "production">;

/**
 * Development website environment contract.
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
