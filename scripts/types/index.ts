/**
 * @fileoverview Type definitions for environment configuration and package metadata in the arolariu.ro monorepo.
 * @module scripts/types
 *
 * @remarks
 * This module provides compile-time type safety for environment variables across production and development
 * deployments. It leverages TypeScript's template literal types and conditional types to enforce correct
 * environment variable naming, URL construction, and configuration structure.
 *
 * **Key Capabilities:**
 * - Type-safe environment variable access with literal type checking
 * - Environment-specific URL and name resolution (production vs development)
 * - Secret environment variable identification for secure handling
 * - Node.js package metadata typing for dependency management scripts
 *
 * **Architecture Alignment:**
 * - Supports RFC 1004 metadata and SEO system requirements
 * - Provides type safety for build scripts and deployment automation
 * - Ensures consistent environment configuration across frontend and backend
 *
 * @see {@link TypedEnvironment} - Core environment variable contract
 * @see {@link TypedConfigurationType} - Runtime configuration shape
 * @see {@link NodePackageInformation} - Package metadata for acknowledgments generation
 */

/**
 * Represents the allowed deployment environment identifiers.
 *
 * @remarks
 * This union type constrains environment values to the two supported deployment targets:
 * - `"production"`: Live production deployment at arolariu.ro
 * - `"development"`: Development deployment at dev.arolariu.ro
 *
 * **Usage Context:**
 * - Template parameter for `TypedEnvironment` and related types
 * - Runtime validation of NODE_ENV or custom environment variables
 * - Build script environment detection
 *
 * @example
 * ```typescript
 * const env: EnvironmentOptions = process.env.NODE_ENV === 'production' ? 'production' : 'development';
 * ```
 */
type EnvironmentOptions = "production" | "development";

/**
 * Maps an environment identifier to the corresponding site name.
 *
 * @template Environment - The site environment literal, constrained to `"production"` | `"development"`.
 *
 * @remarks
 * This conditional type resolves environment identifiers to their canonical site names:
 * - `"production"` → `"arolariu.ro"` (live production site)
 * - `"development"` → `"dev.arolariu.ro"` (development preview site)
 * - Any other value → `never` (compile-time error)
 *
 * **Type Safety Benefits:**
 * - Prevents typos in site name strings
 * - Enforces correct environment-to-domain mapping
 * - Enables autocomplete for valid site names in IDEs
 *
 * **Design Rationale:**
 * Uses conditional types instead of a lookup object to provide compile-time guarantees
 * and zero runtime overhead. The `never` fallback ensures invalid environments are
 * caught during type checking rather than at runtime.
 *
 * @example
 * ```typescript
 * type ProdSite = SiteName<'production'>; // "arolariu.ro"
 * type DevSite = SiteName<'development'>; // "dev.arolariu.ro"
 * type InvalidSite = SiteName<'staging'>; // never (compile error)
 * ```
 *
 * @see {@link SiteUrl} - Related type for full site URLs
 * @see {@link TypedSiteEnvironmentVariables} - Consumer of this type
 */
type SiteName<Environment extends string> = Environment extends "production"
  ? "arolariu.ro"
  : Environment extends "development"
    ? "dev.arolariu.ro"
    : never;

/**
 * Resolves an environment identifier to its fully qualified site URL with HTTPS protocol.
 *
 * @template Environment - A string literal representing the deployment environment (`"production"` | `"development"`).
 *
 * @remarks
 * This conditional type constructs complete, protocol-qualified URLs for each environment:
 * - `"production"` → `"https://arolariu.ro"` (primary production domain)
 * - `"development"` → `"https://dev.arolariu.ro"` (preview deployment domain)
 * - Any other value → `never` (compile-time type error)
 *
 * **Protocol Enforcement:**
 * All URLs use HTTPS exclusively. The protocol is hard-coded to prevent accidental
 * HTTP usage in environment configuration.
 *
 * **Usage Context:**
 * - Environment variable generation scripts (`scripts/generate.env.ts`)
 * - Canonical URL construction for SEO metadata (RFC 1004)
 * - CORS origin validation in API configuration
 * - OAuth redirect URI configuration
 *
 * **Type Safety Benefits:**
 * - Prevents invalid URL construction at compile time
 * - Enables autocomplete for valid site URLs
 * - Ensures protocol consistency across all environment references
 *
 * @example
 * ```typescript
 * type ProdUrl = SiteUrl<'production'>; // "https://arolariu.ro"
 * type DevUrl = SiteUrl<'development'>; // "https://dev.arolariu.ro"
 *
 * // Usage in metadata generation
 * const canonicalUrl: SiteUrl<'production'> = 'https://arolariu.ro';
 * ```
 *
 * @see {@link SiteName} - Site name without protocol
 * @see {@link TypedSiteEnvironmentVariables} - Consumer of this type for SITE_URL
 */
type SiteUrl<Environment extends string> = Environment extends "production"
  ? "https://arolariu.ro"
  : Environment extends "development"
    ? "https://dev.arolariu.ro"
    : never;

/**
 * Maps the deployment environment to its corresponding API name literal.
 *
 * @template Environment - A string literal representing the API deployment environment (currently `"production"` only).
 *
 * @remarks
 * This conditional type resolves environment identifiers to the canonical API service name:
 * - `"production"` → `"arolariu-api"` (production .NET backend service)
 * - Any other value → `never` (compile-time error)
 *
 * **Design Decision:**
 * Currently, only production API is supported. Development and staging environments share
 * the production API infrastructure, differentiated by API keys and JWT tokens rather than
 * separate API deployments.
 *
 * **Architecture Context:**
 * The API name corresponds to the Azure App Service name hosting the .NET backend
 * (see `sites/api.arolariu.ro`). This naming convention aligns with Azure resource
 * naming patterns documented in the infrastructure Bicep templates.
 *
 * **Future Expansion:**
 * If development/staging APIs are deployed separately, this type can be extended:
 * ```typescript
 * type ApiName<Environment extends string> =
 *   Environment extends "production" ? "arolariu-api" :
 *   Environment extends "development" ? "arolariu-api-dev" :
 *   never;
 * ```
 *
 * @example
 * ```typescript
 * type ProdApi = ApiName<'production'>; // "arolariu-api"
 * type DevApi = ApiName<'development'>; // never (no dev API deployment)
 * ```
 *
 * @see {@link ApiUrl} - Full URL for the API endpoint
 * @see {@link TypedApiEnvironmentVariables} - Consumer of this type for API_NAME
 */
type ApiName<Environment extends string> = Environment extends "production" ? "arolariu-api" : never;

/**
 * Maps the deployment environment to its fully qualified API URL with HTTPS protocol.
 *
 * @template Environment - A string literal representing the API deployment environment (currently `"production"` only).
 *
 * @remarks
 * This conditional type constructs the complete API endpoint URL for backend communication:
 * - `"production"` → `"https://api.arolariu.ro"` (production .NET REST API)
 * - Any other value → `never` (no development API deployment)
 *
 * **API Architecture:**
 * The URL points to the .NET 10 backend API hosted on Azure App Service (modular monolith
 * with Domain-Driven Design, see RFC 2001). The API serves RESTful endpoints for invoices,
 * authentication, and general platform services.
 *
 * **Protocol & Security:**
 * - HTTPS enforced via Azure Front Door with TLS 1.3
 * - Custom domain configured with Azure DNS
 * - API requests require JWT authentication (API_JWT environment variable)
 *
 * **Development Strategy:**
 * Development and preview deployments use the production API with separate authentication
 * contexts. This simplifies infrastructure while maintaining data isolation through API keys.
 *
 * **Usage Context:**
 * - Next.js server actions and route handlers
 * - Client-side API requests (though server actions are preferred)
 * - Environment variable validation scripts
 * - OpenTelemetry tracing (API URL used in span attributes)
 *
 * @example
 * ```typescript
 * type ApiEndpoint = ApiUrl<'production'>; // "https://api.arolariu.ro"
 *
 * // Usage in server action
 * async function fetchInvoice(id: string): Promise<Invoice> {
 *   const apiUrl: ApiUrl<'production'> = process.env.API_URL;
 *   const response = await fetch(`${apiUrl}/invoices/${id}`);
 *   return response.json();
 * }
 * ```
 *
 * @see {@link ApiName} - API service name
 * @see {@link TypedApiEnvironmentVariables} - Consumer of this type for API_URL
 * @see RFC 2001 - Backend DDD Architecture documentation
 */
type ApiUrl<Environment extends string> = Environment extends "production" ? "https://api.arolariu.ro" : never;

/**
 * Defines the environment variables specific to a site based on its deployment environment.
 *
 * @template Environment - The site environment, either `"production"` or `"development"`.
 *
 * @remarks
 * This type constructs a readonly object containing three site-specific environment variables,
 * with values derived from the generic `Environment` parameter:
 *
 * **Environment Variables:**
 * - `SITE_ENV`: Uppercase version of environment (`"PRODUCTION"` | `"DEVELOPMENT"`)
 *   - Used for runtime environment detection and conditional feature flags
 *   - Matches Node.js convention of uppercase environment variable values
 *
 * - `SITE_NAME`: Domain name without protocol (`"arolariu.ro"` | `"dev.arolariu.ro"`)
 *   - Used for cookie domain configuration
 *   - Used in CSP (Content Security Policy) headers
 *   - Used for canonical domain validation
 *
 * - `SITE_URL`: Full HTTPS URL (`"https://arolariu.ro"` | `"https://dev.arolariu.ro"`)
 *   - Used for canonical URL generation (SEO metadata, RFC 1004)
 *   - Used for OAuth redirect URIs
 *   - Used for Open Graph and Twitter Card absolute URLs
 *
 * **Immutability:**
 * All properties are `readonly` at both the object and property level to prevent accidental
 * mutation of environment configuration at runtime.
 *
 * **Type Safety Benefits:**
 * - Prevents typos in environment variable names
 * - Ensures consistency between environment and derived values (URLs, names)
 * - Enables autocomplete for environment-specific configuration
 *
 * @example
 * ```typescript
 * // Production configuration
 * type ProdVars = TypedSiteEnvironmentVariables<'production'>;
 * // Resolves to:
 * // {
 * //   readonly SITE_ENV: "PRODUCTION";
 * //   readonly SITE_NAME: "arolariu.ro";
 * //   readonly SITE_URL: "https://arolariu.ro";
 * // }
 *
 * // Development configuration
 * type DevVars = TypedSiteEnvironmentVariables<'development'>;
 * // Resolves to:
 * // {
 * //   readonly SITE_ENV: "DEVELOPMENT";
 * //   readonly SITE_NAME: "dev.arolariu.ro";
 * //   readonly SITE_URL: "https://dev.arolariu.ro";
 * // }
 * ```
 *
 * @see {@link SiteName} - Site name type derivation
 * @see {@link SiteUrl} - Site URL type derivation
 * @see {@link TypedEnvironment} - Combined environment variables including site vars
 */
type TypedSiteEnvironmentVariables<Environment extends EnvironmentOptions> = Readonly<{
  readonly SITE_ENV: Uppercase<Environment>;
  readonly SITE_NAME: SiteName<Environment>;
  readonly SITE_URL: SiteUrl<Environment>;
}>;

/**
 * Defines the environment variables specific to the backend API based on its deployment environment.
 *
 * @template Environment - The API environment, currently constrained to `"production"` (dev uses prod API).
 *
 * @remarks
 * This type constructs a readonly object containing three API-specific environment variables,
 * with values derived from the generic `Environment` parameter:
 *
 * **Environment Variables:**
 * - `API_ENV`: Uppercase version of environment (`"PRODUCTION"` only)
 *   - Indicates which API deployment is being targeted
 *   - Used for API-side feature flag decisions (if backend checks origin)
 *
 * - `API_NAME`: Azure service name (`"arolariu-api"`)
 *   - Corresponds to Azure App Service resource name
 *   - Used in infrastructure scripts and deployment pipelines
 *   - Matches naming convention in Bicep templates (`infra/Azure/Bicep/`)
 *
 * - `API_URL`: Full HTTPS endpoint URL (`"https://api.arolariu.ro"`)
 *   - Base URL for all backend REST API requests
 *   - Used in Next.js server actions and route handlers
 *   - Used in OpenTelemetry HTTP span attributes
 *
 * **Current Architecture:**
 * Only production API is deployed. Development and preview environments share the production
 * API infrastructure, with authentication isolation via separate JWT tokens and API keys.
 *
 * **Design Rationale:**
 * - Simplifies infrastructure (single API deployment)
 * - Reduces costs (no duplicate API instances for dev/staging)
 * - Ensures development testing uses production-like API behavior
 * - Data isolation maintained through authentication context, not infrastructure
 *
 * **Type Safety:**
 * If `Environment` is `"development"`, `ApiName` and `ApiUrl` resolve to `never`, causing
 * compile-time errors. This enforces the architectural constraint that only production API exists.
 *
 * @example
 * ```typescript
 * // Production API configuration
 * type ProdApiVars = TypedApiEnvironmentVariables<'production'>;
 * // Resolves to:
 * // {
 * //   readonly API_ENV: "PRODUCTION";
 * //   readonly API_NAME: "arolariu-api";
 * //   readonly API_URL: "https://api.arolariu.ro";
 * // }
 *
 * // Development attempts to reference non-existent API
 * type DevApiVars = TypedApiEnvironmentVariables<'development'>;
 * // Compile error: API_NAME and API_URL are 'never'
 * ```
 *
 * @see {@link ApiName} - API service name derivation
 * @see {@link ApiUrl} - API URL derivation
 * @see {@link TypedEnvironment} - Combined environment variables including API vars
 * @see RFC 2001 - Backend API Domain-Driven Design architecture
 */
type TypedApiEnvironmentVariables<Environment extends EnvironmentOptions> = Readonly<{
  readonly API_ENV: Uppercase<Environment>;
  readonly API_NAME: ApiName<Environment>;
  readonly API_URL: ApiUrl<Environment>;
}>;

/**
 * Authentication and secrets environment variables required across all deployment environments.
 *
 * @remarks
 * This type defines the authentication-related secrets and API keys used throughout the application.
 * All properties are readonly and should be loaded from secure sources (Azure Key Vault, encrypted
 * environment files, or CI/CD secret stores).
 *
 * **Environment Variables:**
 *
 * - `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`: Clerk.dev publishable key for client-side authentication
 *   - **Public**: Safe to expose in client-side JavaScript bundles (prefix: `NEXT_PUBLIC_`)
 *   - **Purpose**: Initializes Clerk authentication SDK on client and server
 *   - **Format**: `pk_test_...` (test) or `pk_live_...` (production)
 *   - **Usage**: User sign-in, sign-up, session management, multi-factor authentication
 *
 * - `CLERK_SECRET_KEY`: Clerk.dev secret key for server-side authentication operations
 *   - **Secret**: NEVER expose to client-side code or commit to version control
 *   - **Purpose**: Validates JWTs, manages users server-side, accesses Clerk backend API
 *   - **Format**: `sk_test_...` (test) or `sk_live_...` (production)
 *   - **Usage**: Server actions, API route handlers, middleware authentication checks
 *
 * - `API_JWT`: JWT token for authenticating with the arolariu.ro backend API
 *   - **Secret**: Backend authentication credential, rotate regularly
 *   - **Purpose**: Authorizes Next.js server to call backend REST API endpoints
 *   - **Format**: Standard JWT (header.payload.signature)
 *   - **Usage**: All backend API requests from server actions and route handlers
 *   - **Security**: Scoped to specific API operations, expires after defined period
 *
 * - `RESEND_API_KEY`: Resend.com API key for transactional email delivery
 *   - **Secret**: Third-party service credential, protect carefully
 *   - **Purpose**: Sends transactional emails (password resets, notifications, receipts)
 *   - **Format**: `re_...` prefix from Resend dashboard
 *   - **Usage**: Email service integration for user communications
 *
 * **Security Best Practices:**
 * - Store secrets in Azure Key Vault or GitHub Secrets (CI/CD)
 * - Use `.env.local` for local development (gitignored)
 * - Rotate secrets regularly (90-day policy recommended)
 * - Never log secret values (even in debug mode)
 * - Use different keys for production vs development environments
 * - Validate secret format on application startup (fail fast if invalid)
 *
 * **Type Safety:**
 * All secrets are typed as `string` rather than literal types because their values are
 * loaded at runtime from secure sources. Validation logic should verify format and presence.
 *
 * @example
 * ```typescript
 * // Server-side usage (server action or route handler)
 * import {auth} from '@clerk/nextjs/server';
 *
 * export async function fetchUserInvoices(): Promise<Invoice[]> {
 *   const {userId} = await auth();
 *   if (!userId) throw new Error('Unauthorized');
 *
 *   const apiJwt = process.env.API_JWT; // Type: string
 *   const response = await fetch(`${process.env.API_URL}/invoices`, {
 *     headers: {
 *       'Authorization': `Bearer ${apiJwt}`,
 *       'X-User-Id': userId
 *     }
 *   });
 *
 *   return response.json();
 * }
 * ```
 *
 * @see {@link SecretEnvironmentVariablesType} - Union of secret variable keys for secure handling
 * @see {@link TypedEnvironment} - Combined environment including auth variables
 */
type AuthEnvironmentVariables = Readonly<{
  readonly NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: string;
  readonly CLERK_SECRET_KEY: string;
  readonly API_JWT: string;
  readonly RESEND_API_KEY: string;
}>;

/**
 * Build metadata environment variables that are consistent across all deployment environments.
 *
 * @remarks
 * This type defines build-time metadata variables injected during CI/CD pipeline execution.
 * These values are used for debugging, observability, cache busting, and CDN configuration.
 *
 * **Environment Variables:**
 *
 * - `TIMESTAMP`: ISO 8601 timestamp of the build or deployment
 *   - **Format**: `YYYY-MM-DDTHH:mm:ss.sssZ` (e.g., `"2025-01-26T14:30:00.000Z"`)
 *   - **Purpose**: Version identification, cache busting, deployment tracking
 *   - **Usage**:
 *     - Displayed in application footer (build time)
 *     - Sent in OpenTelemetry resource attributes (RFC 1001)
 *     - Used for cache key generation (static assets)
 *     - Logged in application startup telemetry
 *   - **Generation**: Set by CI/CD pipeline at build time (GitHub Actions)
 *
 * - `COMMIT_SHA`: Git commit hash (SHA-1) associated with the build
 *   - **Format**: 40-character hexadecimal string (e.g., `"a1b2c3d4e5f6..."`) or 7-char short SHA
 *   - **Purpose**: Exact code version identification, traceability, debugging
 *   - **Usage**:
 *     - Linked in application footer (GitHub commit URL)
 *     - Sent in OpenTelemetry resource attributes (`service.version`)
 *     - Used for error tracking (Sentry/Application Insights correlation)
 *     - Enables "what code is running?" queries in production
 *   - **Generation**: Set by CI/CD from `${{ github.sha }}` (GitHub Actions)
 *
 * - `USE_CDN`: Boolean flag indicating whether to use Azure Front Door CDN for static assets
 *   - **Type**: Boolean (true/false, not string)
 *   - **Purpose**: Toggle CDN usage for images, fonts, scripts, stylesheets
 *   - **When true**:
 *     - Static assets served from `https://cdn.arolariu.ro/...`
 *     - Global edge caching enabled (Azure Front Door)
 *     - Reduced origin server load
 *   - **When false**:
 *     - Static assets served from origin (`https://arolariu.ro/_next/...`)
 *     - Used for local development or debugging CDN issues
 *   - **Default**: `true` in production, `false` in development
 *
 * **Build Pipeline Integration:**
 * These variables are set by GitHub Actions workflows during the build process:
 * ```yaml
 * - name: Build Next.js
 *   env:
 *     TIMESTAMP: ${{ steps.timestamp.outputs.value }}
 *     COMMIT_SHA: ${{ github.sha }}
 *     USE_CDN: true
 *   run: npm run build
 * ```
 *
 * **Observability Integration:**
 * Metadata variables are sent to Application Insights as resource attributes:
 * - `service.version`: `COMMIT_SHA`
 * - `deployment.timestamp`: `TIMESTAMP`
 * - `deployment.environment`: Derived from `SITE_ENV`
 *
 * @example
 * ```typescript
 * // Display build info in application footer
 * export function Footer() {
 *   const buildTime = process.env.TIMESTAMP;
 *   const commitSha = process.env.COMMIT_SHA?.substring(0, 7);
 *   const commitUrl = `https://github.com/arolariu/arolariu.ro/commit/${commitSha}`;
 *
 *   return (
 *     <footer>
 *       <p>Built: {new Date(buildTime).toLocaleString()}</p>
 *       <a href={commitUrl}>Commit: {commitSha}</a>
 *     </footer>
 *   );
 * }
 *
 * // CDN configuration in next.config.ts
 * const useCdn = process.env.USE_CDN === true;
 * const assetPrefix = useCdn ? 'https://cdn.arolariu.ro' : '';
 * ```
 *
 * @see {@link TypedEnvironment} - Combined environment including metadata
 * @see RFC 1001 - OpenTelemetry observability system (resource attributes)
 */
type MetadataEnvironmentVariables = Readonly<{
  readonly TIMESTAMP: string;
  readonly COMMIT_SHA: string;
  readonly USE_CDN: boolean;
}>;

/**
 * Represents the complete, type-safe environment variable contract for the arolariu.ro application.
 *
 * @template SiteEnvironment - The site deployment environment: `"production"` or `"development"`.
 * @template ApiEnvironment - The API deployment environment: currently restricted to `"production"`.
 *
 * @remarks
 * This is the **canonical type definition** for all environment variables used throughout the application.
 * It composes four distinct environment variable groups into a single immutable, strongly-typed structure
 * that provides compile-time guarantees for environment configuration.
 *
 * **Composed Environment Variable Groups:**
 *
 * 1. **Site Variables** (`TypedSiteEnvironmentVariables<SiteEnv>`)
 *    - `SITE_ENV`: Environment name ("PRODUCTION" | "DEVELOPMENT")
 *    - `SITE_NAME`: Domain name ("arolariu.ro" | "dev.arolariu.ro")
 *    - `SITE_URL`: Full HTTPS URL for the site
 *    - **Usage**: Canonical URLs, CSP headers, cookie domains
 *
 * 2. **API Variables** (`TypedApiEnvironmentVariables<ApiEnv>`)
 *    - `API_ENV`: API environment ("PRODUCTION" only)
 *    - `API_NAME`: Azure App Service name ("arolariu-api")
 *    - `API_URL`: Backend REST API endpoint ("https://api.arolariu.ro")
 *    - **Usage**: Server actions, API requests, OpenTelemetry spans
 *
 * 3. **Authentication Variables** (`AuthEnvironmentVariables`)
 *    - `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`: Public Clerk key (client-safe)
 *    - `CLERK_SECRET_KEY`: Secret Clerk key (server-only)
 *    - `API_JWT`: Backend API authorization token
 *    - `RESEND_API_KEY`: Transactional email service key
 *    - **Usage**: User authentication, API authorization, email delivery
 *
 * 4. **Metadata Variables** (`MetadataEnvironmentVariables`)
 *    - `TIMESTAMP`: Build timestamp (ISO 8601)
 *    - `COMMIT_SHA`: Git commit hash
 *    - `USE_CDN`: CDN usage flag (boolean)
 *    - **Usage**: Build info display, observability, cache busting
 *
 * **Type Safety Guarantees:**
 * - **Literal Types**: URLs and names are literal string types, not generic `string`
 * - **Compile-Time Validation**: Invalid environment combinations cause TypeScript errors
 * - **Immutability**: All properties are deeply readonly (no runtime mutation)
 * - **Exhaustiveness**: Covers all environment variables used in the codebase
 *
 * **Design Rationale:**
 *
 * **Why Generic?**
 * The generic parameters (`SiteEnvironment`, `ApiEnvironment`) enable different type instantiations
 * for production vs development without code duplication. This allows:
 * - Type-safe environment switching in scripts
 * - Compile-time validation of environment-specific URLs
 * - IntelliSense autocomplete for valid environment values
 *
 * **Why Readonly?**
 * Environment variables should be immutable after initialization to prevent:
 * - Accidental mutation during request handling
 * - Race conditions in concurrent Next.js server contexts
 * - Confusion about which values are canonical
 *
 * **Why Composed Types?**
 * Breaking environment variables into logical groups (site, API, auth, metadata) improves:
 * - Maintainability: Changes to one group don't affect others
 * - Testability: Can mock specific variable groups in isolation
 * - Documentation: Each group documents its purpose and usage
 *
 * **Architecture Alignment:**
 * - **RFC 1001**: Metadata variables support OpenTelemetry resource attributes
 * - **RFC 1004**: Site variables enable canonical URL and SEO metadata generation
 * - **RFC 2001**: API variables connect frontend to DDD backend architecture
 *
 * **Usage Patterns:**
 *
 * **Environment Variable Access:**
 * ```typescript
 * // Type-safe access in server components or server actions
 * const apiUrl: string = process.env.API_URL!; // TypeScript knows this exists
 * const siteUrl: string = process.env.SITE_URL!; // Autocomplete works
 * ```
 *
 * **Validation:**
 * ```typescript
 * // Validate environment at startup
 * function validateEnvironment(env: NodeJS.ProcessEnv): TypedProductionEnvironmentVariablesType {
 *   if (!env.API_URL || !env.SITE_URL) {
 *     throw new Error('Missing required environment variables');
 *   }
 *   return env as TypedProductionEnvironmentVariablesType;
 * }
 * ```
 *
 * **Script Usage:**
 * ```typescript
 * // Generate .env file with type safety
 * import type {TypedEnvironment} from './types';
 *
 * function generateEnvFile<T extends 'production' | 'development'>(env: T): string {
 *   const vars: TypedEnvironment<T, 'production'> = {
 *     SITE_ENV: env.toUpperCase() as Uppercase<T>,
 *     SITE_NAME: env === 'production' ? 'arolariu.ro' : 'dev.arolariu.ro',
 *     // ... TypeScript ensures all required vars are present
 *   };
 *   return Object.entries(vars).map(([k, v]) => `${k}=${v}`).join('\n');
 * }
 * ```
 *
 * @example
 * ```typescript
 * // Production environment type
 * type ProdEnv = TypedEnvironment<'production', 'production'>;
 * // Resolves to all variables with production-specific values
 *
 * // Development environment type
 * type DevEnv = TypedEnvironment<'development', 'production'>;
 * // Resolves to all variables with development site + production API
 *
 * // Invalid combination (compile error)
 * type InvalidEnv = TypedEnvironment<'staging', 'production'>;
 * // Error: 'staging' is not assignable to 'production' | 'development'
 * ```
 *
 * @see {@link TypedProductionEnvironmentVariablesType} - Concrete production type
 * @see {@link TypedDevelopmentEnvironmentVariablesType} - Concrete development type
 * @see {@link SecretEnvironmentVariablesType} - Secret variable keys for secure handling
 * @see {@link TypedConfigurationType} - Runtime configuration object type
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
 * This is a concrete type instantiation of `TypedEnvironment` with both site and API
 * environments set to `"production"`. It resolves all generic parameters to their
 * production-specific literal values.
 *
 * **Resolved Values:**
 * - `SITE_ENV`: `"PRODUCTION"`
 * - `SITE_NAME`: `"arolariu.ro"`
 * - `SITE_URL`: `"https://arolariu.ro"`
 * - `API_ENV`: `"PRODUCTION"`
 * - `API_NAME`: `"arolariu-api"`
 * - `API_URL`: `"https://api.arolariu.ro"`
 * - Plus all authentication and metadata variables
 *
 * **Usage Context:**
 * - Next.js production builds (`npm run build` with `NODE_ENV=production`)
 * - Azure App Service production deployment
 * - Environment variable validation in production startup
 * - CI/CD deployment scripts for production environment
 *
 * **Type Safety Benefits:**
 * - Autocomplete for all production environment variables
 * - Compile-time validation that all required variables are present
 * - Literal types for URLs prevent typos (e.g., cannot use "http://" instead of "https://")
 *
 * @example
 * ```typescript
 * // Validate production environment variables at startup
 * function validateProductionEnv(
 *   env: NodeJS.ProcessEnv
 * ): asserts env is TypedProductionEnvironmentVariablesType {
 *   const required: Array<keyof TypedProductionEnvironmentVariablesType> = [
 *     'SITE_URL', 'API_URL', 'CLERK_SECRET_KEY', 'API_JWT'
 *   ];
 *   for (const key of required) {
 *     if (!env[key]) {
 *       throw new Error(`Missing required environment variable: ${key}`);
 *     }
 *   }
 * }
 *
 * // Usage in production deployment
 * validateProductionEnv(process.env);
 * const apiUrl: string = process.env.API_URL; // Type-safe access
 * ```
 *
 * @see {@link TypedEnvironment} - Generic environment type
 * @see {@link TypedDevelopmentEnvironmentVariablesType} - Development equivalent
 */
export type TypedProductionEnvironmentVariablesType = Readonly<TypedEnvironment<"production", "production">>;

/**
 * Represents the strongly typed environment variable contract for the development deployment.
 *
 * @remarks
 * This is a concrete type instantiation of `TypedEnvironment` with site environment set to
 * `"development"` and API environment set to `"production"`. This reflects the architectural
 * decision that development deployments use the production API infrastructure.
 *
 * **Resolved Values:**
 * - `SITE_ENV`: `"DEVELOPMENT"`
 * - `SITE_NAME`: `"dev.arolariu.ro"`
 * - `SITE_URL`: `"https://dev.arolariu.ro"`
 * - `API_ENV`: `"PRODUCTION"` (development uses production API)
 * - `API_NAME`: `"arolariu-api"` (shared production API)
 * - `API_URL`: `"https://api.arolariu.ro"` (same as production)
 * - Plus all authentication and metadata variables
 *
 * **Architecture Decision:**
 * Development and preview deployments share the production API infrastructure rather than
 * maintaining separate API instances. Benefits:
 * - Simplified infrastructure (single API deployment)
 * - Cost reduction (no duplicate API resources)
 * - Consistent API behavior across environments
 * - Data isolation via authentication (separate JWT tokens per environment)
 *
 * **Usage Context:**
 * - Local development (`npm run dev` with `NODE_ENV=development`)
 * - Preview deployments (GitHub pull request deployments)
 * - Development environment validation scripts
 * - CI/CD deployment to development Azure App Service
 *
 * **Type Safety:**
 * Even though API variables point to production, TypeScript still provides autocomplete and
 * validation for all environment variables, preventing configuration errors.
 *
 * @example
 * ```typescript
 * // Development environment validation
 * function validateDevelopmentEnv(
 *   env: NodeJS.ProcessEnv
 * ): asserts env is TypedDevelopmentEnvironmentVariablesType {
 *   if (env.SITE_NAME !== 'dev.arolariu.ro') {
 *     throw new Error('Invalid development site name');
 *   }
 *   if (env.API_URL !== 'https://api.arolariu.ro') {
 *     throw new Error('Development must use production API');
 *   }
 * }
 *
 * // Local development usage
 * if (process.env.NODE_ENV === 'development') {
 *   const siteUrl: string = process.env.SITE_URL; // "https://dev.arolariu.ro"
 *   const apiUrl: string = process.env.API_URL;   // "https://api.arolariu.ro"
 * }
 * ```
 *
 * @see {@link TypedEnvironment} - Generic environment type
 * @see {@link TypedProductionEnvironmentVariablesType} - Production equivalent
 */
export type TypedDevelopmentEnvironmentVariablesType = Readonly<TypedEnvironment<"development", "production">>;

/**
 * Enumerates environment variable keys that are classified as authentication secrets.
 *
 * @remarks
 * This type identifies the subset of environment variables that contain sensitive authentication
 * credentials and must be handled with special security precautions.
 *
 * **Type Construction:**
 * Uses `Extract` to intersect two key sets:
 * 1. All environment variable keys (`TypedProductionEnvironmentVariablesType | TypedDevelopmentEnvironmentVariablesType`)
 * 2. Authentication secret keys (`AuthEnvironmentVariables`)
 *
 * The result is a union of only those keys that appear in both sets, ensuring compile-time
 * type safety when implementing secret-handling logic.
 *
 * **Secret Environment Variables (Resolved):**
 * - `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` - Public key (safe to expose, but still tracked)
 * - `CLERK_SECRET_KEY` - **SECRET**: Server-side authentication key
 * - `API_JWT` - **SECRET**: Backend API authorization token
 * - `RESEND_API_KEY` - **SECRET**: Email service API key
 *
 * **Security Handling Requirements:**
 *
 * **Never Log Secrets:**
 * ```typescript
 * // ❌ BAD: Secret exposed in logs
 * console.log('API JWT:', process.env.API_JWT);
 *
 * // ✅ GOOD: Redact or omit secrets from logs
 * console.log('API JWT:', process.env.API_JWT ? '[REDACTED]' : '[MISSING]');
 * ```
 *
 * **Never Commit Secrets:**
 * - Use `.env.local` for local development (gitignored)
 * - Use Azure Key Vault for production secrets
 * - Use GitHub Secrets for CI/CD workflows
 * - Rotate secrets if accidentally committed
 *
 * **Never Send to Client:**
 * ```typescript
 * // ❌ BAD: Secret sent to client
 * export async function getServerData() {
 *   return { apiJwt: process.env.API_JWT }; // Exposed in client bundle!
 * }
 *
 * // ✅ GOOD: Keep secrets server-side only
 * export async function getServerData() {
 *   const response = await fetch(process.env.API_URL, {
 *     headers: { 'Authorization': `Bearer ${process.env.API_JWT}` }
 *   });
 *   return response.json(); // Only send data, not credentials
 * }
 * ```
 *
 * **Validate Format:**
 * ```typescript
 * function validateSecrets(): void {
 *   const secrets: SecretEnvironmentVariablesType[] = [
 *     'CLERK_SECRET_KEY',
 *     'API_JWT',
 *     'RESEND_API_KEY'
 *   ];
 *
 *   for (const key of secrets) {
 *     const value = process.env[key];
 *     if (!value || value.length < 10) {
 *       throw new Error(`Invalid or missing secret: ${key}`);
 *     }
 *   }
 * }
 * ```
 *
 * **Use Cases:**
 * - Implementing secret redaction in logging utilities
 * - Validating secret presence and format at startup
 * - Creating type-safe secret management abstractions
 * - Filtering secrets from telemetry and error reports
 * - Generating masked environment variable displays
 *
 * @example
 * ```typescript
 * // Redact secrets in environment variable display
 * function getEnvironmentSummary(
 *   env: NodeJS.ProcessEnv
 * ): Record<string, string> {
 *   const secrets: SecretEnvironmentVariablesType[] = [
 *     'CLERK_SECRET_KEY',
 *     'API_JWT',
 *     'RESEND_API_KEY'
 *   ];
 *
 *   const summary: Record<string, string> = {};
 *   for (const [key, value] of Object.entries(env)) {
 *     if (secrets.includes(key as SecretEnvironmentVariablesType)) {
 *       summary[key] = value ? '[REDACTED]' : '[MISSING]';
 *     } else {
 *       summary[key] = value ?? '[MISSING]';
 *     }
 *   }
 *   return summary;
 * }
 *
 * console.log(getEnvironmentSummary(process.env));
 * // {
 * //   SITE_URL: 'https://arolariu.ro',
 * //   API_URL: 'https://api.arolariu.ro',
 * //   CLERK_SECRET_KEY: '[REDACTED]',
 * //   API_JWT: '[REDACTED]',
 * //   RESEND_API_KEY: '[REDACTED]'
 * // }
 * ```
 *
 * @see {@link AuthEnvironmentVariables} - Source of secret variable definitions
 * @see {@link TypedEnvironment} - Complete environment variable contract
 */
export type SecretEnvironmentVariablesType = Extract<
  keyof (TypedProductionEnvironmentVariablesType | TypedDevelopmentEnvironmentVariablesType),
  keyof AuthEnvironmentVariables // Ensures only auth-related secrets are included
>;

/**
 * Represents the union of all environment variable keys available across both production and development configurations.
 *
 * @remarks
 * This utility type creates a union of all possible environment variable key names used throughout
 * the application, regardless of deployment environment. It combines the keys from both
 * `TypedProductionEnvironmentVariablesType` and `TypedDevelopmentEnvironmentVariablesType` to
 * ensure comprehensive coverage.
 *
 * **Included Keys (Exhaustive List):**
 * - Site: `SITE_ENV`, `SITE_NAME`, `SITE_URL`
 * - API: `API_ENV`, `API_NAME`, `API_URL`
 * - Auth: `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`, `API_JWT`, `RESEND_API_KEY`
 * - Metadata: `TIMESTAMP`, `COMMIT_SHA`, `USE_CDN`
 *
 * **Use Cases:**
 * - **Validation**: Check if a string is a valid environment variable name
 * - **Iteration**: Loop over all environment variables with type safety
 * - **Documentation**: Generate environment variable documentation
 * - **Tooling**: Build utilities that operate on environment configuration
 * - **Testing**: Create mock environment objects with all required keys
 *
 * **Type Safety Benefits:**
 * - Prevents typos when accessing environment variables by name
 * - Enables autocomplete for environment variable keys
 * - Ensures exhaustive handling in switch statements or object mappings
 * - Compile-time validation of environment variable references
 *
 * @example
 * ```typescript
 * // Validate environment variable key
 * function isValidEnvKey(key: string): key is AllEnvironmentVariablesKeys {
 *   const validKeys: AllEnvironmentVariablesKeys[] = [
 *     'SITE_URL', 'API_URL', 'CLERK_SECRET_KEY', // ... all keys
 *   ];
 *   return validKeys.includes(key as AllEnvironmentVariablesKeys);
 * }
 *
 * // Type-safe environment variable access
 * function getEnvValue(key: AllEnvironmentVariablesKeys): string | undefined {
 *   return process.env[key];
 * }
 *
 * const siteUrl = getEnvValue('SITE_URL'); // ✅ Valid
 * const invalid = getEnvValue('INVALID_KEY'); // ❌ Type error
 *
 * // Generate environment documentation
 * function documentEnvironmentVariables(): Record<AllEnvironmentVariablesKeys, string> {
 *   return {
 *     SITE_ENV: 'Deployment environment (PRODUCTION | DEVELOPMENT)',
 *     SITE_NAME: 'Domain name without protocol',
 *     SITE_URL: 'Full HTTPS URL of the site',
 *     // ... all keys documented
 *   };
 * }
 * ```
 *
 * @see {@link TypedProductionEnvironmentVariablesType} - Production environment variables
 * @see {@link TypedDevelopmentEnvironmentVariablesType} - Development environment variables
 * @see {@link TypedConfigurationType} - Runtime configuration object using these keys
 */
export type AllEnvironmentVariablesKeys = keyof (TypedProductionEnvironmentVariablesType | TypedDevelopmentEnvironmentVariablesType);

/**
 * Represents the runtime configuration object mapping environment variable keys to string values.
 *
 * @remarks
 * This type defines the canonical shape for runtime environment variable objects used throughout
 * the application. It blends compile-time type safety (known keys from `AllEnvironmentVariablesKeys`)
 * with runtime flexibility (arbitrary string keys for dynamic scenarios).
 *
 * **Type Structure:**
 * ```typescript
 * Record<AllEnvironmentVariablesKeys | string, string>
 * ```
 *
 * This means:
 * - All keys from `AllEnvironmentVariablesKeys` are valid and autocomplete in IDEs
 * - Additional string keys are permitted (for dynamic runtime variables)
 * - All values must be strings (Node.js `process.env` convention)
 *
 * **Design Rationale:**
 *
 * **Why Allow Arbitrary String Keys?**
 * While the application defines a strict set of known environment variables, runtime scenarios
 * may introduce additional variables:
 * - Third-party integrations that inject their own env vars
 * - CI/CD systems that add metadata variables
 * - Local development overrides that aren't in the standard set
 * - Temporary debugging flags
 *
 * **Why String Values Only?**
 * Node.js `process.env` returns all values as strings. Even numeric or boolean variables
 * (like `USE_CDN`) are initially strings and must be parsed:
 * ```typescript
 * const useCdn = process.env.USE_CDN === 'true'; // String comparison
 * const port = parseInt(process.env.PORT ?? '3000', 10); // Parse to number
 * ```
 *
 * **Type Safety vs Flexibility Trade-off:**
 * - **Known keys**: Get autocomplete, type checking, and documentation
 * - **Unknown keys**: No autocomplete, but won't cause type errors at runtime
 * - **All values**: Must be manually parsed/validated before use
 *
 * **Usage Patterns:**
 *
 * **Basic Access:**
 * ```typescript
 * const config: TypedConfigurationType = process.env;
 * const apiUrl = config.API_URL; // Type: string | undefined
 * const customVar = config['CUSTOM_VAR']; // Type: string | undefined
 * ```
 *
 * **With Validation:**
 * ```typescript
 * function loadConfiguration(): TypedConfigurationType {
 *   const config: TypedConfigurationType = {
 *     SITE_URL: process.env.SITE_URL ?? '',
 *     API_URL: process.env.API_URL ?? '',
 *     CLERK_SECRET_KEY: process.env.CLERK_SECRET_KEY ?? '',
 *     // ... all required variables
 *   };
 *
 *   // Validate required variables
 *   const required: AllEnvironmentVariablesKeys[] = [
 *     'SITE_URL', 'API_URL', 'CLERK_SECRET_KEY'
 *   ];
 *   for (const key of required) {
 *     if (!config[key]) {
 *       throw new Error(`Missing required environment variable: ${key}`);
 *     }
 *   }
 *
 *   return config;
 * }
 * ```
 *
 * **With Type Parsing:**
 * ```typescript
 * function getTypedConfig(config: TypedConfigurationType) {
 *   return {
 *     siteUrl: new URL(config.SITE_URL!), // Parse to URL object
 *     useCdn: config.USE_CDN === 'true', // Parse to boolean
 *     timestamp: new Date(config.TIMESTAMP!), // Parse to Date
 *     commitSha: config.COMMIT_SHA!, // Keep as string
 *   };
 * }
 * ```
 *
 * **Script Usage:**
 * ```typescript
 * // Generate .env file from typed configuration
 * function generateEnvFile(config: TypedConfigurationType): string {
 *   return Object.entries(config)
 *     .filter(([_, value]) => value !== undefined)
 *     .map(([key, value]) => `${key}=${value}`)
 *     .join('\n');
 * }
 *
 * const envFile = generateEnvFile({
 *   SITE_URL: 'https://arolariu.ro',
 *   API_URL: 'https://api.arolariu.ro',
 *   CUSTOM_VAR: 'custom-value' // Additional key allowed
 * });
 * ```
 *
 * @example
 * ```typescript
 * // Type-safe configuration object
 * const typedConfig: TypedConfigurationType = {
 *   // Known keys with autocomplete
 *   SITE_URL: 'https://arolariu.ro',
 *   API_URL: 'https://api.arolariu.ro',
 *   CLERK_SECRET_KEY: 'sk_test_...',
 *   API_JWT: 'eyJhbGciOiJIUzI1NiIs...',
 *
 *   // Unknown keys are also valid (runtime flexibility)
 *   'CUSTOM_INTEGRATION_KEY': 'value',
 *   'DEBUG_FLAG': 'true'
 * };
 *
 * // Access with type safety
 * const apiUrl: string | undefined = typedConfig.API_URL; // Autocomplete works
 * const customKey: string | undefined = typedConfig['CUSTOM_INTEGRATION_KEY']; // Also valid
 * ```
 *
 * @see {@link AllEnvironmentVariablesKeys} - Union of all known environment variable keys
 * @see {@link TypedEnvironment} - Strongly-typed environment variable contract
 */
// Note: TypeScript warns that AllEnvironmentVariablesKeys is "overridden by string" in this union.
// This is intentional - we want both:
// 1. Type safety and autocomplete for known keys (AllEnvironmentVariablesKeys)
// 2. Runtime flexibility for arbitrary string keys (e.g., third-party env vars)
// The warning is a TypeScript limitation, not a bug. See RFC 1002 for design rationale.
export type TypedConfigurationType = Record<AllEnvironmentVariablesKeys | string, string>;

/**
 * Represents the supported Node.js package dependency types in package.json.
 *
 * @remarks
 * This type constrains dependency classification to the three standard npm dependency categories:
 *
 * - `"production"`: Dependencies required at runtime (installed by `npm install --production`)
 *   - Listed in `package.json` under `dependencies`
 *   - Examples: `react`, `next`, `@clerk/nextjs`
 *   - Deployed to production environments
 *   - Required for application to function
 *
 * - `"development"`: Dependencies required only during development (excluded from production)
 *   - Listed in `package.json` under `devDependencies`
 *   - Examples: `typescript`, `eslint`, `prettier`, `vitest`
 *   - Used for building, testing, linting, formatting
 *   - Not installed in production (`npm install --production` skips these)
 *
 * - `"peer"`: Dependencies that must be provided by the consuming application
 *   - Listed in `package.json` under `peerDependencies`
 *   - Examples: `react` in a React component library
 *   - Prevents version conflicts when multiple packages depend on the same library
 *   - npm warns if peer dependency requirements aren't met
 *
 * **Immutability:**
 * The `Readonly` wrapper ensures this union type cannot be widened or mutated, maintaining
 * strict type safety when categorizing dependencies.
 *
 * **Usage Context:**
 * - Dependency analysis scripts (e.g., `scripts/generate.acks.ts`)
 * - Package.json parsing and validation
 * - License acknowledgment generation
 * - Dependency graph visualization
 * - Security audit categorization
 *
 * @example
 * ```typescript
 * // Categorize dependencies from package.json
 * function categorizeDependency(
 *   section: 'dependencies' | 'devDependencies' | 'peerDependencies'
 * ): NodePackageDependencyType {
 *   switch (section) {
 *     case 'dependencies': return 'production';
 *     case 'devDependencies': return 'development';
 *     case 'peerDependencies': return 'peer';
 *   }
 * }
 *
 * // Filter dependencies by type
 * function getProductionDependencies(
 *   packages: NodePackageInformation[]
 * ): NodePackageInformation[] {
 *   return packages.filter(pkg => pkg.dependencyType === 'production');
 * }
 * ```
 *
 * @see {@link NodePackageInformation} - Package metadata type that uses this dependency type
 */
export type NodePackageDependencyType = Readonly<"production" | "development" | "peer">;

/**
 * Describes the metadata associated with an installed Node.js package.
 *
 * @remarks
 * This type captures comprehensive identifying information and dependency relationships for
 * npm packages used in the arolariu.ro monorepo. It is primarily used by scripts that generate
 * acknowledgments, analyze dependencies, and document third-party library usage.
 *
 * **Property Details:**
 *
 * - `name`: The package's npm registry identifier (e.g., `"react"`, `"@types/node"`)
 *   - **Format**: Standard npm package name (scoped or unscoped)
 *   - **Usage**: Package identification, documentation, license attribution
 *   - **Example**: `"next"`, `"@clerk/nextjs"`, `"@radix-ui/react-dialog"`
 *
 * - `version`: The exact semantic version of the installed package
 *   - **Format**: SemVer string (e.g., `"18.2.0"`, `"14.0.0-beta.5"`)
 *   - **Usage**: Version tracking, compatibility checks, dependency audits
 *   - **Source**: Resolved from `package-lock.json` or `node_modules/<pkg>/package.json`
 *   - **Note**: Should be exact installed version, not the range from `package.json`
 *
 * - `description`: A short human-readable summary of the package's purpose
 *   - **Format**: Single sentence (typically 50-150 characters)
 *   - **Usage**: Acknowledgments page, dependency documentation, tooltips
 *   - **Source**: `description` field from package's `package.json`
 *   - **Example**: `"The React framework for production"`
 *
 * - `homepage`: A URL pointing to the package's primary documentation or project site
 *   - **Format**: Absolute URL (typically GitHub repo, npm page, or official docs)
 *   - **Usage**: User-facing links in acknowledgments, attribution requirements
 *   - **Source**: `homepage` field from package's `package.json`
 *   - **Example**: `"https://nextjs.org"`, `"https://github.com/radix-ui/primitives"`
 *
 * - `license`: The SPDX identifier for the package's licensing terms
 *   - **Format**: SPDX license identifier (e.g., `"MIT"`, `"Apache-2.0"`, `"BSD-3-Clause"`)
 *   - **Usage**: Legal compliance, license compatibility checks, attribution
 *   - **Source**: `license` field from package's `package.json`
 *   - **Important**: Must be included in acknowledgments for legal compliance
 *   - **Common Values**: `"MIT"`, `"ISC"`, `"Apache-2.0"`, `"BSD-2-Clause"`
 *
 * - `author`: The name or contact string of the package's primary maintainer
 *   - **Format**: Free-form string (name, email, URL, or combination)
 *   - **Usage**: Attribution, acknowledgments, maintainer credit
 *   - **Source**: `author` field from package's `package.json`
 *   - **Examples**:
 *     - `"Vercel"` (organization)
 *     - `"Dan Abramov <dan@example.com>"` (name + email)
 *     - `"Jane Doe (https://janedoe.com)"` (name + URL)
 *
 * - `dependents`: Optional list of packages that rely on this package
 *   - **Format**: Array of `{name, version}` objects
 *   - **Usage**: Dependency graph construction, impact analysis, tree visualization
 *   - **Example**: For `react`, dependents might include `next`, `react-dom`, `@radix-ui/react-dialog`
 *   - **When undefined**: Indicates leaf node in dependency tree (no dependents)
 *   - **Performance**: May be expensive to compute for large dependency trees
 *
 * **Use Cases:**
 *
 * 1. **Acknowledgments Generation** (Primary Use Case)
 *    - Generate legally compliant acknowledgments page
 *    - Display all dependencies with proper attribution
 *    - Group by dependency type (production vs development)
 *    - Include license information for compliance
 *
 * 2. **Dependency Analysis**
 *    - Audit dependency versions for security vulnerabilities
 *    - Identify outdated packages
 *    - Analyze dependency tree depth and complexity
 *    - Detect duplicate dependencies at different versions
 *
 * 3. **Documentation**
 *    - Generate dependency documentation for developers
 *    - Create "built with" sections in README
 *    - Document third-party integrations
 *
 * 4. **License Compliance**
 *    - Verify all licenses are compatible with project license
 *    - Identify copyleft licenses that require special handling
 *    - Generate NOTICES file for distribution
 *
 * @example
 * ```typescript
 * // Example package metadata for React
 * const reactPackage: NodePackageInformation = {
 *   name: 'react',
 *   version: '19.2.0',
 *   description: 'React is a JavaScript library for building user interfaces.',
 *   homepage: 'https://react.dev',
 *   license: 'MIT',
 *   author: 'Meta Platforms, Inc.',
 *   dependents: [
 *     { name: 'next', version: '16.0.0-beta.0' },
 *     { name: 'react-dom', version: '19.2.0' },
 *     { name: '@radix-ui/react-dialog', version: '1.0.5' }
 *   ]
 * };
 *
 * // Generate acknowledgment entry
 * function generateAcknowledgment(pkg: NodePackageInformation): string {
 *   return `
 * ### ${pkg.name} (${pkg.version})
 *
 * ${pkg.description}
 *
 * - **License**: ${pkg.license}
 * - **Author**: ${pkg.author}
 * - **Homepage**: [${pkg.homepage}](${pkg.homepage})
 *   `.trim();
 * }
 *
 * // Analyze dependency tree depth
 * function getDependencyDepth(
 *   pkg: NodePackageInformation,
 *   depth: number = 0
 * ): number {
 *   if (!pkg.dependents || pkg.dependents.length === 0) {
 *     return depth;
 *   }
 *   return Math.max(
 *     ...pkg.dependents.map(dep =>
 *       getDependencyDepth(findPackage(dep.name), depth + 1)
 *     )
 *   );
 * }
 * ```
 *
 * @see {@link NodePackageDependencyType} - Dependency type classification
 * @see `scripts/generate.acks.ts` - Script that generates acknowledgments using this type
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
