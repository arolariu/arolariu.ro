/**
 * @fileoverview Barrel file re-exporting type definitions for the arolariu.ro monorepo scripts.
 * @module scripts/types
 *
 * @remarks
 * This module serves as the central export point for all script-related type definitions.
 * Types are organized into dedicated modules for better maintainability:
 *
 * - **environment.ts**: Environment configuration and deployment types
 * - **format.ts**: Formatting worker thread communication types
 * - **lint.ts**: ESLint worker thread communication types
 *
 * **Key Capabilities:**
 * - Type-safe environment variable access with literal type checking
 * - Environment-specific URL and name resolution (production vs development)
 * - Secret environment variable identification for secure handling
 * - Node.js package metadata typing for dependency management scripts
 * - Worker thread communication types for parallel script execution
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

// Re-export environment types from dedicated module
export type {
  AllEnvironmentVariablesKeys,
  SecretEnvironmentVariablesType,
  TypedConfigurationType,
  TypedDevelopmentEnvironmentVariablesType,
  TypedEnvironment,
  TypedProductionEnvironmentVariablesType,
} from "./environment.ts";

// Re-export worker types from dedicated modules
export type {FormatTarget, FormatWorkerInput, FormatWorkerResult} from "./format.ts";
export type {ESLintWorkerInput, ESLintWorkerResult} from "./lint.ts";

// ============================================================================
// Node.js Package Metadata Types
// ============================================================================

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
