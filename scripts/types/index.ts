type EnvironmentOptions = "production" | "development";

/**
 * Maps an environment identifier to the corresponding site name.
 *
 * @template Environment - The site environment, such as `"production"` or `"development"`.
 * @remarks
 * - `"production"` resolves to `"arolariu.ro"`.
 * - `"development"` resolves to `"dev.arolariu.ro"`.
 * - Any other value results in `never`.
 */
type SiteName<Environment extends string> = Environment extends "production"
  ? "arolariu.ro"
  : Environment extends "development"
    ? "dev.arolariu.ro"
    : never;

/**
 * Resolves an environment identifier to its fully qualified site URL.
 *
 * @template Environment - A string literal representing the deployment environment.
 * @remarks
 * - `"production"` maps to `"https://arolariu.ro"`.
 * - `"development"` maps to `"https://dev.arolariu.ro"`.
 * - Any other value results in `never`.
 * @returns A literal URL string tied to the specified environment.
 */
type SiteUrl<Environment extends string> = Environment extends "production"
  ? "https://arolariu.ro"
  : Environment extends "development"
    ? "https://dev.arolariu.ro"
    : never;

/**
 * Maps the deployment environment to its corresponding API name literal.
 *
 * @template Environment - A string literal representing the API deployment environment.
 * @remarks
 * - `"production"` resolves to `"arolariu-api"`.
 * - Any other environment results in `never`.
 */
type ApiName<Environment extends string> = Environment extends "production" ? "arolariu-api" : never;

/**
 * Maps the deployment environment to its corresponding API URL literal.
 *
 * @template Environment - A string literal representing the API deployment environment.
 * @remarks
 * - `"production"` resolves to `"https://api.arolariu.ro"`.
 * - Any other environment results in `never`.
 */
type ApiUrl<Environment extends string> = Environment extends "production" ? "https://api.arolariu.ro" : never;

/**
 * Defines the environment variables specific to a site based on its deployment environment.
 * @template Environment - The site environment, either `"production"` or `"development"`.
 * @remarks
 * - `SITE_ENV`: Uppercase version of the environment (e.g., `"PRODUCTION"` or `"DEVELOPMENT"`).
 * - `SITE_NAME`: The site name corresponding to the environment.
 * - `SITE_URL`: The full URL of the site for the given environment.
 */
type TypedSiteEnvironmentVariables<Environment extends EnvironmentOptions> = Readonly<{
  readonly SITE_ENV: Uppercase<Environment>;
  readonly SITE_NAME: SiteName<Environment>;
  readonly SITE_URL: SiteUrl<Environment>;
}>;

/**
 * Defines the environment variables specific to the API based on its deployment environment.
 * @template Environment - The API environment, currently only `"production"`.
 * @remarks
 * - `API_ENV`: Uppercase version of the environment (e.g., `"PRODUCTION"`).
 * - `API_NAME`: The API name corresponding to the environment.
 * - `API_URL`: The full URL of the API for the given environment.
 */
type TypedApiEnvironmentVariables<Environment extends EnvironmentOptions> = Readonly<{
  readonly API_ENV: Uppercase<Environment>;
  readonly API_NAME: ApiName<Environment>;
  readonly API_URL: ApiUrl<Environment>;
}>;

type AuthEnvironmentVariables = Readonly<{
  readonly NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: string;
  readonly CLERK_SECRET_KEY: string;
  readonly API_JWT: string;
  readonly RESEND_API_KEY: string;
}>;

/**
 * Metadata environment variables that are consistent across all environments.
 *
 * @remarks
 * - `TIMESTAMP`: The build or deployment timestamp.
 * - `COMMIT_SHA`: The Git commit SHA associated with the build or deployment.
 * - `USE_CDN`: A boolean flag indicating whether to use a CDN for static assets.
 */
type MetadataEnvironmentVariables = Readonly<{
  readonly TIMESTAMP: string;
  readonly COMMIT_SHA: string;
  readonly USE_CDN: boolean;
}>;

/**
 * Represents the combined environment variables required for both the site and API deployments,
 * enriched with authentication and metadata settings derived from the specified environments.
 *
 * @template SiteEnvironment - The site deployment environment; accepts `"production"` or `"development"`.
 * @template ApiEnvironment - The API deployment environment; currently restricted to `"production"`.
 *
 * @remarks
 * This type composes four distinct environment variable groups into a single immutable structure:
 *
 * - `TypedSiteEnvironmentVariables<SiteEnv>`
 *   Provides site-specific values, such as `SITE_ENV`, `SITE_NAME`, and `SITE_URL`, selected
 *   according to the supplied `SiteEnv` literal (`"production"` or `"development"`).
 *
 * - `TypedApiEnvironmentVariables<ApiEnv>`
 *   Delivers API-specific settings, including `API_ENV`, `API_NAME`, and `API_URL`, based on the
 *   `ApiEnv` literal, which is currently constrained to `"production"`.
 *
 * - `AuthEnvironmentVariables`
 *   Supplies the authentication-related secrets required across environments (e.g.,
 *   `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`, `API_JWT`, `RESEND_API_KEY`).
 *
 * - `MetadataEnvironmentVariables`
 *   Contributes environment-agnostic metadata such as `TIMESTAMP`, `COMMIT_SHA`, and the `USE_CDN`
 *   feature toggle.
 *
 * @returns A readonly map of environment variables whose value shapes are tailored to the
 *          provided `SiteEnv` and `ApiEnv` literal arguments, ensuring type-safe access to all
 *          deployment configuration data.
 */
export type TypedEnvironment<
  SiteEnvironment extends EnvironmentOptions,
  ApiEnvironment extends Exclude<EnvironmentOptions, "development">,
> = Readonly<
  TypedSiteEnvironmentVariables<SiteEnvironment>
    & TypedApiEnvironmentVariables<ApiEnvironment>
    & AuthEnvironmentVariables
    & MetadataEnvironmentVariables
>;

/**
 * Represents the strongly typed environment variable contract for the production deployment.
 *
 * @remarks
 * Collapses all site, API, authentication, and metadata variables into a single readonly shape
 * whose literal values resolve to their production-specific forms.
 *
 * @see TypedEnvironment
 */
export type TypedProductionEnvironmentVariablesType = Readonly<TypedEnvironment<"production", "production">>;

/**
 * Represents the strongly typed environment variable contract for the development deployment.
 *
 * @remarks
 * Collapses all site, API, authentication, and metadata variables into a single readonly shape
 * whose literal values resolve to their development-specific forms.
 *
 * @see TypedEnvironment
 */
export type TypedDevelopmentEnvironmentVariablesType = Readonly<TypedEnvironment<"development", "production">>;

/**
 * Enumerates environment variable keys that satisfy both of the following constraints:
 *
 * - They exist in the union of allowed site configurations
 *   (`TypedProductionEnvironmentVariablesType | TypedDevelopmentEnvironmentVariablesType`).
 * - They overlap with the authentication secret contract defined by `AuthEnvironmentVariables`.
 *
 * @remarks
 * This type acts as a compile-time guardrail for logic that operates on secret values, ensuring
 * that only keys explicitly flagged as authentication secrets can be used when reading from the
 * consolidated environment configuration.
 */
export type SecretEnvironmentVariablesType = Extract<
  keyof (TypedProductionEnvironmentVariablesType | TypedDevelopmentEnvironmentVariablesType),
  keyof AuthEnvironmentVariables // Ensures only auth-related secrets are included
>;

/**
 * Represents the union of all environment variable keys available across both
 * production and development configurations.
 *
 * Useful for constraining utilities or validation logic to the exact set of
 * known environment variable names, regardless of the build target.
 *
 * @remarks
 * The union is derived from `TypedProductionEnvironmentVariablesType` and
 * `TypedDevelopmentEnvironmentVariablesType`, ensuring that any environment
 * variable defined in either context is included.
 *
 * @see {@link TypedProductionEnvironmentVariablesType} - Production environment variables
 * @see {@link TypedDevelopmentEnvironmentVariablesType} - Development environment variables
 */
export type AllEnvironmentVariablesKeys = keyof (TypedProductionEnvironmentVariablesType | TypedDevelopmentEnvironmentVariablesType);

/**
 * Represents the canonical mapping between all statically known environment variable keys
 * and their runtime string values, while still permitting arbitrary string keys for dynamic scenarios.
 *
 * @remarks
 * This alias blends compile-time safety with runtime flexibility by composing the union of
 * `AllEnvironmentVariablesKeys` and an open string signature. The result is an object-like
 * contract where every known key is enforced as a string-valued entry, yet additional keys
 * that surface at runtime can still participate without type errors.
 *
 * @example
 * ```ts
 * const typedConfig: TypedConfigurationType = {
 *   DATABASE_URL: process.env.DATABASE_URL ?? '',
 *   'custom-runtime-key': '42'
 * };
 * ```
 *
 * @see {@link AllEnvironmentVariablesKeys} - For the set of known environment variable keys.
 */
export type TypedConfigurationType = Record<AllEnvironmentVariablesKeys | (string & {}), string>;

/**
 * Represents the immutable set of supported Node.js package dependency types,
 * distinguishing between production, development, and peer dependencies.
 */
export type NodePackageDependencyType = Readonly<"production" | "development" | "peer">;

/**
 * Describes the metadata associated with an installed Node.js package.
 *
 * @remarks
 * Use this shape to capture the essential identifying information and optional dependency data
 * returned by package managers or registry lookups.
 *
 * @property name - The package's registry identifier (e.g., `"react"`).
 * @property version - The exact semantic version of the package (e.g., `"18.2.0"`).
 * @property description - A short human-readable summary of the package's purpose.
 * @property homepage - A URL pointing to the package's primary documentation or project site.
 * @property license - The SPDX identifier for the package's licensing terms.
 * @property author - The name or contact string of the package's primary maintainer.
 * @property dependents - Optional list of packages that rely on this package, including their versions.
 */
export type NodePackageInformation = {
  name: string;
  version: string;
  description: string;
  homepage: string;
  license: string;
  author: string;
  dependents?: Array<{name: string; version: string}>;
};
