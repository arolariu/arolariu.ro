import licenses from "@/../licenses.json";
import {TIMESTAMP} from "@/lib/utils.generic";
import type {NodePackagesJSON} from "@/types";
import RenderAcknowledgementsScreen from "./island";

/**
 * Renders the acknowledgements page listing all third-party OSS dependencies.
 *
 * @remarks
 * **Rendering Context**: Async Server Component (default in Next.js App Router).
 *
 * **Purpose**: Displays comprehensive attribution for all npm packages used in the project,
 * fulfilling open-source license requirements and providing transparency about dependencies.
 *
 * **Data Sources**:
 * - `licenses.json`: Auto-generated manifest of all npm dependencies with license info
 * - `TIMESTAMP`: Build timestamp from environment, formatted as UTC string
 *
 * **Component Architecture**:
 * - **Server Component** (this): Prepares data on server, reduces client bundle
 * - **Client Island** (`RenderAcknowledgementsScreen`): Handles interactive UI (search, filtering)
 *
 * **Why This Pattern?**:
 * - Server component handles data transformation (Date formatting, JSON parsing)
 * - Client component manages user interactions (search, sort, expand/collapse)
 * - Optimizes initial load by server-rendering static content
 * - Reduces JavaScript bundle size by offloading logic to server
 *
 * **License Compliance**:
 * - Automatically generated from `package.json` dependencies
 * - Includes license type, package version, repository links
 * - Updated on every build via `generate.acks.ts` script
 *
 * **Performance Considerations**:
 * - `licenses.json` parsed at build time (static import)
 * - Date formatting happens on server (no client-side Date API)
 * - Large package list rendered progressively via client island
 *
 * **Async Component**: Uses `await` for potential future async operations
 * (currently synchronous but structured for extensibility).
 *
 * @returns Promise resolving to server-rendered acknowledgements page with package list
 *
 * @example
 * ```tsx
 * // Automatically rendered by Next.js App Router at /acknowledgements
 * // Route file: app/(privacy-and-terms)/acknowledgements/page.tsx
 * ```
 *
 * @see {@link RenderAcknowledgementsScreen} - Client island for interactive package list UI
 * @see {@link NodePackagesJSON} - TypeScript type for licenses.json structure
 * @see {@link TIMESTAMP} - Build timestamp constant from utils.generic
 */
export default async function AcknowledgementsPage(): Promise<React.JSX.Element> {
  const lastUpdatedDate = new Date(TIMESTAMP).toUTCString();

  return (
    <RenderAcknowledgementsScreen
      packages={licenses as NodePackagesJSON}
      lastUpdatedDate={lastUpdatedDate}
    />
  );
}
