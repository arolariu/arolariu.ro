/** @format */

// Conditional types for automatic inference based on environment
type SiteName<T extends string> = T extends "production" ? "arolariu.ro" : T extends "development" ? "dev.arolariu.ro" : never;

type SiteUrl<T extends string> = T extends "production"
  ? "https://arolariu.ro"
  : T extends "development"
    ? "https://dev.arolariu.ro"
    : never;

type ApiName<T extends string> = T extends "production" ? "arolariu-api" : never;

type ApiUrl<T extends string> = T extends "production" ? "https://api.arolariu.ro" : never;

// Strongly-typed environment variable definitions with automatic inference
type SiteEnvironmentVariables<Env extends "production" | "development"> = Readonly<{
  SITE_ENV: Uppercase<Env>;
  SITE_NAME: SiteName<Env>;
  SITE_URL: SiteUrl<Env>;
}>;

type ApiEnvironmentVariables<Env extends "production"> = Readonly<{
  API_ENV: Uppercase<Env>;
  API_NAME: ApiName<Env>;
  API_URL: ApiUrl<Env>;
}>;

type AuthEnvironmentVariables = Readonly<{
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: string;
  CLERK_SECRET_KEY: string;
  API_JWT: string;
  RESEND_API_KEY: string;
}>;

type MetadataEnvironmentVariables = Readonly<{
  TIMESTAMP: string;
  COMMIT_SHA: string;
  USE_CDN: boolean;
}>;

/**
 * TypedEnvironment is a utility type that combines all environment variables
 * for a specific site and API environment, ensuring type safety and consistency.
 * It includes site-specific, API-specific, authentication, and metadata variables.
 */
export type TypedEnvironment<SiteEnv extends "production" | "development", ApiEnv extends "production"> = Readonly<
  SiteEnvironmentVariables<SiteEnv> & ApiEnvironmentVariables<ApiEnv> & AuthEnvironmentVariables & MetadataEnvironmentVariables
>;

export type TypedProductionEnvironmentVariablesType = TypedEnvironment<"production", "production">;
export type TypedDevelopmentEnvironmentVariablesType = TypedEnvironment<"development", "production">;

export type SecretEnvironmentVariablesType = Extract<
  keyof (TypedProductionEnvironmentVariablesType | TypedDevelopmentEnvironmentVariablesType),
  keyof AuthEnvironmentVariables // Ensures only auth-related secrets are included
>;
