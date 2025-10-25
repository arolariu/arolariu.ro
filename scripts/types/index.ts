type EnvironmentOptions = "production" | "development";

/**
 * Maps an environment identifier to the corresponding site name.
 *
 * @template T - The site environment, such as `"production"` or `"development"`.
 * @remarks
 * - `"production"` resolves to `"arolariu.ro"`.
 * - `"development"` resolves to `"dev.arolariu.ro"`.
 * - Any other value results in `never`.
 */
type SiteName<T extends string> = T extends "production" ? "arolariu.ro" : T extends "development" ? "dev.arolariu.ro" : never;

/**
 * Resolves an environment identifier to its fully qualified site URL.
 *
 * @template T - A string literal representing the deployment environment.
 * @remarks
 * - `"production"` maps to `"https://arolariu.ro"`.
 * - `"development"` maps to `"https://dev.arolariu.ro"`.
 * - Any other value results in `never`.
 * @returns A literal URL string tied to the specified environment.
 */
type SiteUrl<T extends string> = T extends "production"
  ? "https://arolariu.ro"
  : T extends "development"
    ? "https://dev.arolariu.ro"
    : never;

/**
 * Maps the deployment environment to its corresponding API name literal.
 *
 * @template T - A string literal representing the API deployment environment.
 * @remarks
 * - `"production"` resolves to `"arolariu-api"`.
 * - Any other environment results in `never`.
 */
type ApiName<T extends string> = T extends "production" ? "arolariu-api" : never;

/**
 * Maps the deployment environment to its corresponding API URL literal.
 *
 * @template T - A string literal representing the API deployment environment.
 * @remarks
 * - `"production"` resolves to `"https://api.arolariu.ro"`.
 * - Any other environment results in `never`.
 */
type ApiUrl<T extends string> = T extends "production" ? "https://api.arolariu.ro" : never;

/**
 * Defines the environment variables specific to a site based on its deployment environment.
 * @template Environment - The site environment, either `"production"` or `"development"`.
 * @remarks
 * - `SITE_ENV`: Uppercase version of the environment (e.g., `"PRODUCTION"` or `"DEVELOPMENT"`).
 * - `SITE_NAME`: The site name corresponding to the environment.
 * - `SITE_URL`: The full URL of the site for the given environment.
 */
type TypedSiteEnvironmentVariables<Environment extends EnvironmentOptions> = Readonly<{
  SITE_ENV: Uppercase<Environment>;
  SITE_NAME: SiteName<Environment>;
  SITE_URL: SiteUrl<Environment>;
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
  API_ENV: Uppercase<Environment>;
  API_NAME: ApiName<Environment>;
  API_URL: ApiUrl<Environment>;
}>;

type AuthEnvironmentVariables = Readonly<{
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: string;
  CLERK_SECRET_KEY: string;
  API_JWT: string;
  RESEND_API_KEY: string;
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
  TIMESTAMP: string;
  COMMIT_SHA: string;
  USE_CDN: boolean;
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
export type TypedProductionEnvironmentVariablesType = TypedEnvironment<"production", "production">;

/**
 * Represents the strongly typed environment variable contract for the development deployment.
 *
 * @remarks
 * Collapses all site, API, authentication, and metadata variables into a single readonly shape
 * whose literal values resolve to their development-specific forms.
 *
 * @see TypedEnvironment
 */
export type TypedDevelopmentEnvironmentVariablesType = TypedEnvironment<"development", "production">;

export type SecretEnvironmentVariablesType = Extract<
  keyof (TypedProductionEnvironmentVariablesType | TypedDevelopmentEnvironmentVariablesType),
  keyof AuthEnvironmentVariables // Ensures only auth-related secrets are included
>;

export type AllEnvironmentVariablesKeys = keyof (TypedProductionEnvironmentVariablesType | TypedDevelopmentEnvironmentVariablesType);

export type TypedConfigurationType = Record<AllEnvironmentVariablesKeys | (string & {}), string>;

export type NodePackageDependencyType = Readonly<"production" | "development" | "peer">;

export type NodePackageInformation = {
  name: string;
  version: string;
  description: string;
  homepage: string;
  license: string;
  author: string;
  dependents?: Array<{name: string; version: string}>;
};
