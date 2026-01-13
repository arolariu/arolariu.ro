/**
 * @fileoverview Global TypeScript type definitions for the arolariu.ro frontend.
 *
 * @remarks
 * This module centralizes common type definitions used across the application:
 * - Environment variable types (re-exported from typedEnv.ts)
 * - Node package dependency metadata types
 * - Upload operation status tracking
 * - User authentication and authorization types
 * - Navigation and routing types
 * - Browser and device information types
 *
 * **Usage Context**: Import types from this module rather than defining duplicates
 * throughout the codebase to maintain consistency and type safety.
 *
 * @module types
 */

import type {User} from "@clerk/nextjs/server";
import type {Route} from "next";

// Re-export scan types
export {ScanStatus, ScanType} from "./scans";
export type {CachedScan, Scan} from "./scans";

export type {
  SecretEnvironmentVariablesType,
  TypedDevelopmentEnvironmentVariablesType,
  TypedEnvironment,
  TypedProductionEnvironmentVariablesType,
} from "./typedEnv";

/**
 * Defines the category of a Node.js package dependency.
 *
 * @remarks
 * Represents the three standard npm dependency types:
 * - `"production"`: Runtime dependencies required in production
 * - `"development"`: Build-time and development-only dependencies
 * - `"peer"`: Dependencies expected to be provided by the consumer
 *
 * **Immutability**: Readonly to prevent accidental modification.
 *
 * **Usage Context**: Used in dependency analysis, package.json parsing, and
 * license compliance reporting.
 *
 * @example
 * ```typescript
 * const depType: NodePackageDependencyType = "production";
 * ```
 *
 * @see {@link NodePackageInformation}
 * @see {@link NodePackagesJSON}
 */
export type NodePackageDependencyType = Readonly<"production" | "development" | "peer">;

/**
 * Represents a transitive dependency in the npm dependency tree.
 *
 * @remarks
 * **Purpose**: Tracks which packages depend on a given package, enabling
 * dependency tree visualization and impact analysis.
 *
 * **Immutability**: Readonly object to prevent modification after creation.
 *
 * **Usage Context**:
 * - Dependency graph visualization
 * - License compliance audits (tracking all packages using a specific dependency)
 * - Security vulnerability impact analysis ("what depends on this vulnerable package?")
 * - Bundle size analysis (identifying heavyweight transitive dependencies)
 *
 * **Properties**:
 * - `name`: The npm package name (e.g., "react", "@types/node")
 * - `version`: Semantic version string (e.g., "18.2.0", "^5.0.0")
 *
 * @example
 * ```typescript
 * const dependent: NodePackageDependencyDependsOn = {
 *   name: "next",
 *   version: "16.0.0"
 * };
 * // Indicates that "next@16.0.0" depends on the current package
 * ```
 *
 * @see {@link NodePackageInformation}
 */
export type NodePackageDependencyDependsOn = Readonly<{name: string; version: string}>;

/**
 * Comprehensive metadata for a Node.js package dependency.
 *
 * @remarks
 * **Data Source**: Extracted from package.json files and npm registry metadata.
 *
 * **Purpose**: Provides complete information for:
 * - Dependency attribution pages (showing all packages used)
 * - License compliance reporting
 * - Security audit trails
 * - Developer documentation
 *
 * **Properties**:
 * - `name`: Package name from npm registry (e.g., "react", "@clerk/nextjs")
 * - `version`: Installed semantic version (e.g., "19.2.0")
 * - `description`: One-line package description from package.json
 * - `homepage`: Project website or GitHub repository URL
 * - `license`: SPDX license identifier (e.g., "MIT", "Apache-2.0")
 * - `author`: Package maintainer name or organization
 * - `dependents`: Optional array of packages that depend on this package
 *
 * **Immutability**: Properties are mutable to allow for dynamic updates during
 * dependency analysis, but should be treated as immutable after initial population.
 *
 * @example
 * ```typescript
 * const packageInfo: NodePackageInformation = {
 *   name: "react",
 *   version: "19.2.0",
 *   description: "React is a JavaScript library for building user interfaces.",
 *   homepage: "https://react.dev",
 *   license: "MIT",
 *   author: "Meta Platforms, Inc.",
 *   dependents: [
 *     { name: "next", version: "16.0.0" },
 *     { name: "@clerk/nextjs", version: "6.10.0" }
 *   ]
 * };
 * ```
 *
 * @see {@link NodePackageDependencyType}
 * @see {@link NodePackageDependencyDependsOn}
 * @see {@link NodePackagesJSON}
 */
export type NodePackageInformation = {
  name: string;
  version: string;
  description: string;
  homepage: string;
  license: string;
  author: string;
  dependents?: NodePackageDependencyDependsOn[];
};

/**
 * Structured container for categorized package dependency information.
 *
 * @remarks
 * **Structure**: Maps dependency types to arrays of package metadata:
 * - `production`: Runtime dependencies shipped in production builds
 * - `development`: Build tools and dev-only dependencies (linters, test frameworks)
 * - `peer`: Dependencies expected to be provided by the consuming application
 *
 * **Optional Properties**: All keys are optional to allow partial dependency data.
 * For example, a library might only have `peer` dependencies.
 *
 * **Usage Context**:
 * - Generating attribution/acknowledgments pages
 * - License compliance documentation
 * - Dependency analysis dashboards
 * - Bundle size breakdown reports
 *
 * **Type Safety**: Uses mapped type to ensure only valid dependency types are keys.
 *
 * **Data Generation**: Typically populated by build scripts that parse package.json
 * and package-lock.json files.
 *
 * @example
 * ```typescript
 * const packages: NodePackagesJSON = {
 *   production: [
 *     {
 *       name: "react",
 *       version: "19.2.0",
 *       description: "React library",
 *       homepage: "https://react.dev",
 *       license: "MIT",
 *       author: "Meta"
 *     }
 *   ],
 *   development: [
 *     {
 *       name: "eslint",
 *       version: "9.0.0",
 *       description: "JavaScript linter",
 *       homepage: "https://eslint.org",
 *       license: "MIT",
 *       author: "ESLint Team"
 *     }
 *   ]
 * };
 * ```
 *
 * @see {@link NodePackageDependencyType}
 * @see {@link NodePackageInformation}
 */
export type NodePackagesJSON = {[depType in NodePackageDependencyType]?: NodePackageInformation[]};

/**
 * Tracks the lifecycle state of a file upload operation.
 *
 * @remarks
 * **State Machine**: Represents a two-stage upload process:
 * 1. **Client-side stage**: File validation, preparation, initial processing
 * 2. **Server-side stage**: API upload, storage persistence, metadata generation
 *
 * **Status Values**:
 * - `"UNKNOWN"`: Initial state before upload begins
 * - `"PENDING__CLIENTSIDE"`: Client processing (validation, chunking, compression)
 * - `"PENDING__SERVERSIDE"`: Server processing (storage upload, virus scan, metadata extraction)
 * - `"SUCCESS__CLIENTSIDE"`: Client-side processing completed successfully
 * - `"SUCCESS__SERVERSIDE"`: Server-side processing completed (final success state)
 * - `"FAILURE__CLIENTSIDE"`: Client-side validation or processing failed
 * - `"FAILURE__SERVERSIDE"`: Server rejected upload or processing failed
 *
 * **State Transitions** (typical flow):
 * ```
 * UNKNOWN → PENDING__CLIENTSIDE → SUCCESS__CLIENTSIDE →
 * PENDING__SERVERSIDE → SUCCESS__SERVERSIDE
 * ```
 *
 * **Error Handling**: Failures at any stage halt the process:
 * ```
 * UNKNOWN → PENDING__CLIENTSIDE → FAILURE__CLIENTSIDE (invalid file type)
 * UNKNOWN → PENDING__CLIENTSIDE → SUCCESS__CLIENTSIDE →
 *   PENDING__SERVERSIDE → FAILURE__SERVERSIDE (server error)
 * ```
 *
 * **Usage Context**:
 * - Invoice scan uploads (PDF, images)
 * - Profile picture uploads
 * - Document attachment uploads
 * - Progress indicators and error feedback
 *
 * **UI Implications**:
 * - `PENDING`: Show progress spinner or loading bar
 * - `SUCCESS`: Show checkmark, enable next action
 * - `FAILURE`: Show error message with retry option
 *
 * @example
 * ```typescript
 * let status: UploadStatus = "UNKNOWN";
 *
 * // Start client-side processing
 * status = "PENDING__CLIENTSIDE";
 * const validated = await validateFile(file);
 * if (!validated) {
 *   status = "FAILURE__CLIENTSIDE";
 *   return;
 * }
 * status = "SUCCESS__CLIENTSIDE";
 *
 * // Start server-side upload
 * status = "PENDING__SERVERSIDE";
 * const response = await uploadToServer(file);
 * status = response.ok ? "SUCCESS__SERVERSIDE" : "FAILURE__SERVERSIDE";
 * ```
 */
export type UploadStatus =
  | "UNKNOWN"
  | "PENDING__CLIENTSIDE" // The upload is pending on the client-side.
  | "PENDING__SERVERSIDE" // The upload is pending on the server-side.
  | "SUCCESS__CLIENTSIDE" // The upload was successful on the client-side.
  | "SUCCESS__SERVERSIDE" // The upload was successful on the server-side.
  | "FAILURE__CLIENTSIDE" // The upload failed on the client-side.
  | "FAILURE__SERVERSIDE"; // The upload failed on the server-side.

/**
 * Consolidated user authentication and authorization information.
 *
 * @remarks
 * **Authentication Provider**: Uses Clerk for user management and JWT generation.
 *
 * **Purpose**: Provides a single source of truth for user-related data throughout
 * the application, combining Clerk's user object with custom identifiers and tokens.
 *
 * **Properties**:
 * - `user`: Clerk user object with profile data (name, email, avatar). Null when unauthenticated.
 * - `userIdentifier`: Custom unique identifier for the user (typically Clerk user ID or email)
 * - `userJwt`: JSON Web Token for authorizing API requests to the backend
 *
 * **Null Handling**: When `user` is null, the user is not authenticated.
 * However, `userIdentifier` and `userJwt` may still contain values from previous sessions
 * (e.g., expired tokens). Always check `user` for authentication status.
 *
 * **JWT Usage**: The `userJwt` is passed in the `Authorization: Bearer <token>` header
 * for all authenticated API requests to `api.arolariu.ro`.
 *
 * **Security**: JWT tokens are sensitive. Never log or expose them in client-side code.
 * Tokens are automatically refreshed by Clerk and should be fetched fresh for each request.
 *
 * **Usage Context**:
 * - User profile components
 * - Protected route guards
 * - API request authentication
 * - Personalized content rendering
 *
 * @example
 * ```typescript
 * // Authenticated user
 * const userInfo: UserInformation = {
 *   user: {
 *     id: "user_abc123",
 *     emailAddresses: [{ emailAddress: "user@example.com" }],
 *     firstName: "John",
 *     lastName: "Doe"
 *   },
 *   userIdentifier: "user_abc123",
 *   userJwt: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 * };
 *
 * // Unauthenticated user
 * const anonymousInfo: UserInformation = {
 *   user: null,
 *   userIdentifier: "",
 *   userJwt: ""
 * };
 *
 * // Checking authentication
 * if (userInfo.user) {
 *   // User is authenticated, proceed with protected action
 *   await fetchUserInvoices(userInfo.userJwt);
 * }
 * ```
 *
 * @see {@link User} - Clerk user type
 */
export type UserInformation = {
  user: User | null;
  userIdentifier: string;
  userJwt: string;
};

/**
 * Represents a navigation menu item with optional nested children.
 *
 * @remarks
 * **Purpose**: Defines the structure for hierarchical navigation menus, supporting
 * both flat and nested menu structures.
 *
 * **Properties**:
 * - `label`: Display text for the navigation item (e.g., "Home", "Invoices", "Profile")
 * - `href`: Type-safe Next.js route path (enforced by `Route` type)
 * - `children`: Optional array of nested navigation items for dropdown/submenu support
 *
 * **Recursive Structure**: The `children` property allows for arbitrary nesting depth,
 * enabling complex menu hierarchies (e.g., "Products → Electronics → Laptops").
 *
 * **Type Safety**: The `href` property uses Next.js's `Route` type, providing
 * compile-time validation that routes exist in the application.
 *
 * **Usage Context**:
 * - Header navigation menus
 * - Sidebar navigation
 * - Footer site maps
 * - Breadcrumb trails
 * - Mobile navigation drawers
 *
 * **Internationalization**: Labels should be translated using next-intl.
 * Store translation keys instead of hardcoded text for multi-language support.
 *
 * **Accessibility**: When rendering, ensure:
 * - Proper ARIA attributes for dropdowns (`aria-haspopup`, `aria-expanded`)
 * - Keyboard navigation support (arrow keys for nested items)
 * - Focus management for interactive elements
 *
 * @example
 * ```typescript
 * // Flat navigation
 * const simpleNav: NavigationItem = {
 *   label: "Home",
 *   href: "/"
 * };
 *
 * // Nested navigation with children
 * const nestedNav: NavigationItem = {
 *   label: "Invoices",
 *   href: "/invoices",
 *   children: [
 *     { label: "All Invoices", href: "/invoices" },
 *     { label: "Create Invoice", href: "/invoices/create" },
 *     { label: "Archive", href: "/invoices/archive" }
 *   ]
 * };
 *
 * // Deep nesting example
 * const deepNav: NavigationItem = {
 *   label: "Settings",
 *   href: "/settings",
 *   children: [
 *     {
 *       label: "Account",
 *       href: "/settings/account",
 *       children: [
 *         { label: "Profile", href: "/settings/account/profile" },
 *         { label: "Security", href: "/settings/account/security" }
 *       ]
 *     }
 *   ]
 * };
 * ```
 *
 * @see {@link Route} - Next.js type-safe route type
 */
export type NavigationItem = {
  label: string;
  href: Route;
  children?: NavigationItem[];
};

/**
 * Extracts all property keys from the browser's Navigator API.
 *
 * @remarks
 * Provides type-safe access to Navigator properties like:
 * - `userAgent`: Browser identification string
 * - `language`: User's preferred language
 * - `platform`: Operating system
 * - `maxTouchPoints`: Touch screen support
 * - `hardwareConcurrency`: CPU core count
 *
 * **Usage Context**: Used in browser fingerprinting and telemetry collection.
 *
 * @see {@link NavigatorValues}
 * @see {@link BrowserInformation}
 */
export type NavigatorKeys = keyof globalThis.Navigator;

/**
 * Extracts all property value types from the browser's Navigator API.
 *
 * @remarks
 * Maps to the actual types of Navigator properties (string, number, boolean, etc.).
 *
 * **Type Safety**: Ensures values match the expected Navigator property types.
 *
 * @see {@link NavigatorKeys}
 */
export type NavigatorValues = globalThis.Navigator[NavigatorKeys];

/**
 * Extracts all property keys from the browser's Screen API.
 *
 * @remarks
 * Provides type-safe access to Screen properties like:
 * - `width`: Screen width in pixels
 * - `height`: Screen height in pixels
 * - `availWidth`: Available width (excluding taskbars)
 * - `availHeight`: Available height
 * - `colorDepth`: Bits per pixel
 * - `pixelDepth`: Color resolution depth
 *
 * **Usage Context**: Used in responsive design decisions and device analytics.
 *
 * @see {@link ScreenValues}
 * @see {@link BrowserInformation}
 */
export type ScreenKeys = keyof globalThis.Screen;

/**
 * Extracts screen property value types, excluding the orientation property.
 *
 * @remarks
 * **Exclusion Rationale**: The `orientation` property is omitted because:
 * - It returns a `ScreenOrientation` object (complex type)
 * - We track orientation separately through window resize events
 * - Reduces serialization complexity for telemetry data
 *
 * **Type Safety**: Ensures values are serializable primitives (numbers, strings).
 *
 * @see {@link ScreenKeys}
 */
export type ScreenValues = Omit<globalThis.Screen[ScreenKeys], "orientation">;

/**
 * Captures browser and device information for analytics and telemetry.
 *
 * @remarks
 * **Purpose**: Collects client-side environment data for:
 * - User experience analytics (screen size, device type)
 * - Error reporting context (browser version, OS)
 * - Performance monitoring (hardware capabilities)
 * - Responsive design validation (viewport dimensions)
 *
 * **Privacy Considerations**:
 * - Data is collected only with user consent (GDPR compliance)
 * - No personally identifiable information (PII) is stored
 * - User agents are anonymized in long-term storage
 * - Data is encrypted in transit and at rest
 *
 * **Properties**:
 * - `navigationInformation`: Subset of Navigator API properties (browser, OS, language)
 * - `screenInformation`: Subset of Screen API properties (dimensions, color depth)
 *
 * **Partial Records**: Both properties use `Partial<Record<>>` to allow collecting
 * only relevant data without requiring all possible properties.
 *
 * **Data Collection Strategy**:
 * 1. Collect on initial page load
 * 2. Attach to OpenTelemetry spans as attributes
 * 3. Send to Application Insights for aggregation
 * 4. Use for device-specific optimizations and bug reproduction
 *
 * **Usage Context**:
 * - Telemetry initialization (see RFC 1001)
 * - Error boundary context enrichment
 * - Performance metric tagging
 * - A/B testing segmentation
 *
 * @example
 * ```typescript
 * // Collecting browser information
 * const browserInfo: BrowserInformation = {
 *   navigationInformation: {
 *     userAgent: navigator.userAgent,
 *     language: navigator.language,
 *     platform: navigator.platform,
 *     hardwareConcurrency: navigator.hardwareConcurrency,
 *     maxTouchPoints: navigator.maxTouchPoints
 *   },
 *   screenInformation: {
 *     width: screen.width,
 *     height: screen.height,
 *     availWidth: screen.availWidth,
 *     availHeight: screen.availHeight,
 *     colorDepth: screen.colorDepth
 *   }
 * };
 *
 * // Attaching to telemetry span
 * span.setAttributes({
 *   "browser.user_agent": browserInfo.navigationInformation.userAgent,
 *   "screen.width": browserInfo.screenInformation.width,
 *   "screen.height": browserInfo.screenInformation.height
 * });
 * ```
 *
 * @see {@link NavigatorKeys}
 * @see {@link ScreenKeys}
 */
export type BrowserInformation = {
  navigationInformation: Partial<Record<NavigatorKeys, NavigatorValues>>;
  screenInformation: Partial<Record<ScreenKeys, ScreenValues>>;
};
